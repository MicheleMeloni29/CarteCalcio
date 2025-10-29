from typing import Any, Dict, List, Optional

from rest_framework import serializers

from cards.models import BonusMalusCard, CoachCard, PlayerCard

from .models import Pack
from .services import OpenedCard


class PackSerializer(serializers.ModelSerializer):
    rarity_weights = serializers.SerializerMethodField()

    class Meta:
        model = Pack
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "price",
            "cards_per_pack",
            "rarity_weights",
        )

    def get_rarity_weights(self, obj: Pack) -> List[Dict[str, Any]]:
        weights = obj.rarity_weights.select_related("rarity").order_by("rarity__name")
        return [
            {
                "rarity": weight.rarity.name,
                "weight": float(weight.weight),
            }
            for weight in weights
        ]


def _build_image_url(card, request) -> Optional[str]:
    image_field = getattr(card, "image", None)
    if not image_field:
        return None

    if hasattr(image_field, "url"):
        url = image_field.url
    else:
        return None

    if request is None:
        return url
    return request.build_absolute_uri(url)


def serialize_opened_card(opened_card: OpenedCard, request=None) -> Dict[str, Any]:
    card = opened_card.card
    return _serialize_card_payload(
        card=card,
        card_type=opened_card.card_type,
        rarity_name=opened_card.rarity_name,
        request=request,
    )


def serialize_collection_card(card, request=None) -> Dict[str, Any]:
    if isinstance(card, PlayerCard):
        card_type = "player"
    elif isinstance(card, CoachCard):
        card_type = "coach"
    else:
        card_type = "bonus"

    rarity_name = card.rarity.name if getattr(card, "rarity", None) else None

    return _serialize_card_payload(
        card=card,
        card_type=card_type,
        rarity_name=rarity_name,
        request=request,
    )


def _serialize_card_payload(card, card_type: str, rarity_name: Optional[str], request=None) -> Dict[str, Any]:
    base_payload: Dict[str, Any] = {
        "id": card.pk,
        "type": card_type,
        "rarity": rarity_name,
        "name": getattr(card, "name", ""),
        "image_url": _build_image_url(card, request),
    }

    if isinstance(card, PlayerCard):
        base_payload.update(
            {
                "team": card.team,
                "attack": card.attack,
                "defense": card.defense,
                "abilities": card.abilities,
            }
        )
    elif isinstance(card, CoachCard):
        base_payload.update(
            {
                "team": card.team,
                "attack_bonus": card.attack_bonus,
                "defense_bonus": card.defense_bonus,
            }
        )
    elif isinstance(card, BonusMalusCard):
        base_payload.update(
            {
                "effect": card.effect,
                "duration": card.duration,
            }
        )

    return base_payload
