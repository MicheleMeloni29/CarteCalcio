from __future__ import annotations

import random
from dataclasses import dataclass
from typing import List, Sequence, Tuple, Type

from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models import F, QuerySet

from cards.models import BonusMalusCard, CoachCard, PlayerCard, UserCollection

from .models import Pack, PackPurchase, PackPurchaseCard, PackRarityWeight


class PackError(Exception):
    """Base exception for pack related errors."""


class InsufficientCreditsError(PackError):
    """Raised when the user does not have enough credits."""


class NoAvailableCardsError(PackError):
    """Raised when a pack has no cards available for the configured rarities."""


@dataclass
class RarityEntry:
    label: str
    queryset: QuerySet
    count: int


@dataclass
class RarityBucket:
    rarity: PackRarityWeight
    entries: Sequence[RarityEntry]

    @property
    def total_cards(self) -> int:
        return sum(entry.count for entry in self.entries)


@dataclass
class OpenedCard:
    card: object
    rarity_name: str
    card_type: str


CARD_MODEL_MAP: Tuple[Tuple[str, Type], ...] = (
    ("player", PlayerCard),
    ("coach", CoachCard),
    ("bonus", BonusMalusCard),
)


def _build_rarity_buckets(pack: Pack) -> List[RarityBucket]:
    buckets: List[RarityBucket] = []
    rarity_weights = (
        pack.rarity_weights.select_related("rarity")
        .filter(weight__gt=0)
        .order_by("rarity__name")
    )

    for rarity_weight in rarity_weights:
        entries: List[RarityEntry] = []
        for label, model in CARD_MODEL_MAP:
            queryset = model.objects.filter(rarity=rarity_weight.rarity).order_by("id")
            count = queryset.count()
            if count:
                entries.append(RarityEntry(label=label, queryset=queryset, count=count))
        buckets.append(RarityBucket(rarity=rarity_weight, entries=entries))
    return buckets


def _pick_bucket(buckets: Sequence[RarityBucket]) -> RarityBucket:
    available = [bucket for bucket in buckets if bucket.total_cards > 0]
    if not available:
        raise NoAvailableCardsError("No cards available for the configured rarities.")

    total_weight = sum(float(bucket.rarity.weight) for bucket in available)
    if total_weight <= 0:
        raise NoAvailableCardsError("All rarity weights are zero.")

    roll = random.uniform(0, total_weight)
    cumulative = 0.0
    for bucket in available:
        cumulative += float(bucket.rarity.weight)
        if roll <= cumulative:
            return bucket
    return available[-1]


def _pick_card_from_bucket(bucket: RarityBucket) -> Tuple[object, str]:
    total_cards = bucket.total_cards
    if total_cards <= 0:
        raise NoAvailableCardsError(
            f"No cards available for rarity {bucket.rarity.rarity.name}."
        )

    target_index = random.randrange(total_cards)
    for entry in bucket.entries:
        if target_index < entry.count:
            card = entry.queryset.all()[target_index]
            return card, entry.label
        target_index -= entry.count

    # Should never reach here
    raise NoAvailableCardsError(
        f"Failed to select a card for rarity {bucket.rarity.rarity.name}."
    )


@transaction.atomic
def open_pack_for_user(user, pack: Pack) -> Tuple[PackPurchase, List[OpenedCard], int]:
    """
    Performs all the operations required to open a pack:
    - Checks user credits
    - Deducts the pack price
    - Randomly selects the cards based on rarity weights
    - Adds the cards to the user's collection
    - Persists an audit log of the purchase
    Returns a tuple containing the purchase record, the list of drawn cards
    (as OpenedCard instances), and the user's updated credit balance.
    """

    UserModel = get_user_model()
    locked_user = UserModel.objects.select_for_update().get(pk=user.pk)

    if locked_user.money < pack.price:
        raise InsufficientCreditsError("Crediti insufficienti per completare l'acquisto.")

    locked_user.money = F("money") - pack.price
    locked_user.save(update_fields=["money"])
    locked_user.refresh_from_db(fields=["money"])

    collection, _ = UserCollection.objects.select_for_update().get_or_create(
        user=locked_user
    )

    buckets = _build_rarity_buckets(pack)
    if not any(bucket.total_cards > 0 for bucket in buckets):
        raise NoAvailableCardsError(
            "Nessuna carta disponibile per le rarità configurate per questo pack."
        )

    purchase = PackPurchase.objects.create(
        user=locked_user,
        pack=pack,
        cost=pack.price,
        cards_count=pack.cards_per_pack,
    )

    opened_cards: List[OpenedCard] = []

    for _ in range(pack.cards_per_pack):
        bucket = _pick_bucket(buckets)
        card, card_label = _pick_card_from_bucket(bucket)

        if card_label == "player":
            collection.player_cards.add(card)
        elif card_label == "coach":
            collection.coach_cards.add(card)
        else:
            collection.bonus_malus_cards.add(card)

        PackPurchaseCard.objects.create(
            purchase=purchase,
            content_type=ContentType.objects.get_for_model(card),
            object_id=card.pk,
            rarity=bucket.rarity.rarity,
        )

        opened_cards.append(
            OpenedCard(
                card=card,
                rarity_name=bucket.rarity.rarity.name,
                card_type=card_label,
            )
        )

    return purchase, opened_cards, locked_user.money
