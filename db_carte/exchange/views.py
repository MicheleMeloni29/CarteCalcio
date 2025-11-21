import logging

from django.contrib.contenttypes.models import ContentType
from django.db import DatabaseError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ExchangeNotification, ExchangeOffer
from .serializers import ExchangeNotificationSerializer, ExchangeOfferSerializer
from .services import attempt_match_for_offer
from .utils import (
    CANONICAL_CARD_TYPE_LABELS,
    get_card_quantity_for_user,
    get_model_for_card_type,
)


logger = logging.getLogger(__name__)


class BaseExchangeView(APIView):
    permission_classes = [permissions.IsAuthenticated]


class MyExchangeOffersView(BaseExchangeView):
    def get(self, request):
        offers = (
            ExchangeOffer.objects.filter(user=request.user)
            .exclude(status__in=[ExchangeOffer.Status.CANCELLED, ExchangeOffer.Status.COMPLETED])
            .select_related('user')
        )
        serializer = ExchangeOfferSerializer(offers, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ExchangeFeedView(BaseExchangeView):
    def get(self, request):
        offers = (
            ExchangeOffer.objects.filter(status=ExchangeOffer.Status.OPEN)
            .exclude(user=request.user)
            .select_related('user')
        )
        serializer = ExchangeOfferSerializer(offers, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ExchangeOfferCreateView(BaseExchangeView):
    def post(self, request):
        card_id = request.data.get('card_id')
        raw_card_type = request.data.get('card_type')
        mapping = get_model_for_card_type(raw_card_type)
        if not mapping:
            return Response({'detail': 'Unsupported card type.'}, status=status.HTTP_400_BAD_REQUEST)

        normalized_type, model = mapping

        try:
            card_id = int(card_id)
        except (TypeError, ValueError):
            return Response({'detail': 'card_id must be a valid integer.'}, status=status.HTTP_400_BAD_REQUEST)

        card = get_object_or_404(model, pk=card_id)
        content_type = ContentType.objects.get_for_model(model)
        total_owned = get_card_quantity_for_user(request.user, model, card.pk)
        if total_owned <= 0:
            return Response({'detail': 'You must own the selected card to trade it.'}, status=status.HTTP_400_BAD_REQUEST)

        active_offers = (
            ExchangeOffer.objects.filter(
                user=request.user,
                content_type=content_type,
                object_id=card.pk,
            )
            .exclude(status__in=[ExchangeOffer.Status.CANCELLED, ExchangeOffer.Status.COMPLETED])
            .count()
        )
        if total_owned - active_offers <= 1:
            return Response(
                {'detail': 'You need an extra copy of this card before publishing the trade.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rarity_name = getattr(getattr(card, 'rarity', None), 'name', 'common') or 'common'
        normalized_rarity = rarity_name.lower()
        wants = request.data.get('wants')
        if not wants:
            wants = f'Any {normalized_rarity} card'

        canonical_type = CANONICAL_CARD_TYPE_LABELS.get(normalized_type, normalized_type)

        offer = ExchangeOffer.objects.create(
            user=request.user,
            content_type=content_type,
            object_id=card.pk,
            card_type=canonical_type,
            required_rarity=normalized_rarity,
            wants=wants,
        )
        serializer = ExchangeOfferSerializer(offer, context={'request': request})
        match_result = attempt_match_for_offer(offer)
        payload = serializer.data
        if match_result:
            payload['match_result'] = match_result
        return Response(payload, status=status.HTTP_201_CREATED)


class ExchangeOfferDetailView(BaseExchangeView):
    def delete(self, request, offer_id: str):
        offer = get_object_or_404(ExchangeOffer, pk=offer_id)
        if offer.user_id != request.user.id:
            return Response({'detail': 'You can only delete your offers.'}, status=status.HTTP_403_FORBIDDEN)
        offer.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ExchangeOfferJoinView(BaseExchangeView):
    def post(self, request, offer_id: str):
        offer = get_object_or_404(ExchangeOffer, pk=offer_id)
        if offer.user_id == request.user.id:
            return Response({'detail': 'You cannot join your own offer.'}, status=status.HTTP_400_BAD_REQUEST)
        if offer.status != ExchangeOffer.Status.OPEN:
            return Response({'detail': 'This offer is no longer available.'}, status=status.HTTP_400_BAD_REQUEST)
        offer.status = ExchangeOffer.Status.REQUESTED
        offer.requested_by = request.user
        offer.requested_at = timezone.now()
        offer.save(update_fields=['status', 'requested_by', 'requested_at', 'updated_at'])
        serializer = ExchangeOfferSerializer(offer, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ExchangeNotificationListView(BaseExchangeView):
    def get(self, request):
        try:
            notifications = ExchangeNotification.objects.filter(
                user=request.user,
                is_read=False,
            ).order_by('-created_at')
        except DatabaseError as exc:
            logger.warning('Unable to read exchange notifications, returning empty list', exc_info=exc)
            return Response([], status=status.HTTP_200_OK)

        serializer = ExchangeNotificationSerializer(notifications, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ExchangeNotificationReadView(BaseExchangeView):
    def post(self, request):
        ids = request.data.get('ids')
        if not isinstance(ids, list) or not ids:
            return Response({'detail': 'Provide notification ids.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            ExchangeNotification.objects.filter(user=request.user, pk__in=ids).update(is_read=True)
        except DatabaseError as exc:
            logger.warning('Unable to mark exchange notifications as read', exc_info=exc)
            return Response({'detail': 'Notifications unavailable at the moment.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(status=status.HTTP_204_NO_CONTENT)
