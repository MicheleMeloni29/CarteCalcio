from django.contrib.contenttypes.models import ContentType
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Pack, PackPurchaseCard
from .serializers import (
    PackSerializer,
    serialize_collection_card,
    serialize_opened_card,
)
from .services import (
    InsufficientCreditsError,
    NoAvailableCardsError,
    open_pack_for_user,
)
from cards.models import BonusMalusCard, CoachCard, PlayerCard, UserCollection


class PackListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        packs = Pack.objects.filter(is_active=True).order_by("price", "id")
        serializer = PackSerializer(packs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PackPurchaseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slug: str):
        pack = get_object_or_404(Pack, slug=slug, is_active=True)

        try:
            purchase, opened_cards, remaining_credits = open_pack_for_user(
                user=request.user,
                pack=pack,
            )
        except InsufficientCreditsError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except NoAvailableCardsError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        # Keep the in-memory user object aligned with the new balance.
        request.user.money = remaining_credits

        payload = {
            "pack": PackSerializer(pack).data,
            "credits": remaining_credits,
            "purchase": {
                "id": purchase.id,
                "created_at": purchase.created_at.isoformat(),
            },
            "cards": [
                serialize_opened_card(opened_card, request=request)
                for opened_card in opened_cards
            ],
        }

        return Response(payload, status=status.HTTP_201_CREATED)


class UserCollectionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        collection, _ = UserCollection.objects.get_or_create(user=request.user)

        player_cards = list(collection.player_cards.select_related("rarity").all())
        coach_cards = list(collection.coach_cards.select_related("rarity").all())
        bonus_cards = list(collection.bonus_malus_cards.select_related("rarity").all())

        def build_counts(model, ids):
            if not ids:
                return {}
            content_type = ContentType.objects.get_for_model(model)
            aggregated = (
                PackPurchaseCard.objects.filter(
                    purchase__user=request.user,
                    content_type=content_type,
                    object_id__in=ids,
                )
                .values("object_id")
                .annotate(total=Count("id"))
            )
            return {row["object_id"]: row["total"] for row in aggregated}

        player_counts = build_counts(PlayerCard, [card.pk for card in player_cards])
        coach_counts = build_counts(CoachCard, [card.pk for card in coach_cards])
        bonus_counts = build_counts(
            BonusMalusCard, [card.pk for card in bonus_cards]
        )

        payload = {
            "player_cards": [
                serialize_collection_card(
                    card,
                    request=request,
                    quantity=player_counts.get(card.pk),
                )
                for card in player_cards
            ],
            "coach_cards": [
                serialize_collection_card(
                    card,
                    request=request,
                    quantity=coach_counts.get(card.pk),
                )
                for card in coach_cards
            ],
            "bonus_malus_cards": [
                serialize_collection_card(
                    card,
                    request=request,
                    quantity=bonus_counts.get(card.pk),
                )
                for card in bonus_cards
            ],
        }

        return Response(payload, status=status.HTTP_200_OK)
