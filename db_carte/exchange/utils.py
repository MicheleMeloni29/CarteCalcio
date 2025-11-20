from __future__ import annotations

from typing import Optional, Tuple, Type

from django.contrib.contenttypes.models import ContentType
from django.db.models import Model

from cards.models import BonusMalusCard, CoachCard, GoalkeeperCard, PlayerCard
from packs.models import PackPurchaseCard


CARD_TYPE_MODEL_MAP: dict[str, Type[Model]] = {
    'player': PlayerCard,
    'goalkeeper': GoalkeeperCard,
    'coach': CoachCard,
    'bonusmalus': BonusMalusCard,
}

CANONICAL_CARD_TYPE_LABELS: dict[str, str] = {
    'player': 'player',
    'goalkeeper': 'goalkeeper',
    'coach': 'coach',
    'bonusmalus': 'bonusMalus',
}


def normalize_card_type(value: Optional[str]) -> Optional[str]:
    if not isinstance(value, str):
        return None
    simplified = (
        value.replace('_', '')
        .replace('-', '')
        .replace('card', '')
        .lower()
    )
    return simplified if simplified in CARD_TYPE_MODEL_MAP else None


def get_model_for_card_type(value: Optional[str]) -> Optional[Tuple[str, Type[Model]]]:
    normalized = normalize_card_type(value)
    if not normalized:
        return None
    model = CARD_TYPE_MODEL_MAP.get(normalized)
    if not model:
        return None
    return normalized, model


def get_card_quantity_for_user(user, model: Type[Model], card_id: int) -> int:
    content_type = ContentType.objects.get_for_model(model)
    return PackPurchaseCard.objects.filter(
        purchase__user=user,
        content_type=content_type,
        object_id=card_id,
    ).count()


def get_card_type_label(normalized: str) -> str:
    return CANONICAL_CARD_TYPE_LABELS.get(normalized, normalized)
