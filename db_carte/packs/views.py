from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import Pack
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
from cards.models import UserCollection


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

        payload = {
            "player_cards": [
                serialize_collection_card(card, request=request)
                for card in collection.player_cards.select_related("rarity").all()
            ],
            "coach_cards": [
                serialize_collection_card(card, request=request)
                for card in collection.coach_cards.select_related("rarity").all()
            ],
            "bonus_malus_cards": [
                serialize_collection_card(card, request=request)
                for card in collection.bonus_malus_cards.select_related("rarity").all()
            ],
        }

        return Response(payload, status=status.HTTP_200_OK)
