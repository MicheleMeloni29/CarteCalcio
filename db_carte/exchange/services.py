from __future__ import annotations

from typing import Dict, Optional

from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.utils import timezone

from cards.models import UserCollection
from packs.models import Pack, PackPurchase, PackPurchaseCard

from .models import ExchangeNotification, ExchangeOffer
from .utils import get_card_quantity_for_user, normalize_card_type

EXCHANGE_PACK_SLUG = 'exchange-transfer'

COLLECTION_FIELD_MAP = {
    'player': 'player_cards',
    'goalkeeper': 'goalkeeper_cards',
    'coach': 'coach_cards',
    'bonusmalus': 'bonus_malus_cards',
}


def _user_missing_card(user, model, card_id: int) -> bool:
    return get_card_quantity_for_user(user, model, card_id) == 0


def _active_offer_reservations(user, content_type, object_id, exclude_offer_id=None) -> int:
    qs = ExchangeOffer.objects.filter(
        user=user,
        content_type=content_type,
        object_id=object_id,
        status__in=[ExchangeOffer.Status.OPEN, ExchangeOffer.Status.REQUESTED],
    )
    if exclude_offer_id:
        qs = qs.exclude(pk=exclude_offer_id)
    return qs.count()


def _has_tradeable_copy(offer: ExchangeOffer) -> bool:
    card = getattr(offer, 'card', None)
    if not card:
        return False
    total_owned = get_card_quantity_for_user(offer.user, type(card), card.pk)
    reserved = _active_offer_reservations(offer.user, offer.content_type, offer.object_id, offer.pk)
    return (total_owned - reserved) >= 1


def _get_exchange_pack() -> Pack:
    pack, _ = Pack.objects.get_or_create(
        slug=EXCHANGE_PACK_SLUG,
        defaults={
            'name': 'Exchange Transfer',
            'description': 'Virtual pack used to register card exchanges between users.',
            'price': 0,
            'cards_per_pack': 1,
            'is_active': False,
        },
    )
    return pack


def _ensure_collection_entry(user, card, normalized_type: str):
    field = COLLECTION_FIELD_MAP.get(normalized_type)
    if not field:
        return
    collection, _ = UserCollection.objects.get_or_create(user=user)
    getattr(collection, field).add(card)


def _maybe_remove_collection_entry(user, card, normalized_type: str):
    field = COLLECTION_FIELD_MAP.get(normalized_type)
    if not field:
        return
    remaining = get_card_quantity_for_user(user, type(card), card.pk)
    if remaining > 0:
        return
    collection = UserCollection.objects.filter(user=user).first()
    if collection:
        relation = getattr(collection, field)
        if relation.filter(pk=card.pk).exists():
            relation.remove(card)


def _transfer_single_copy(from_offer: ExchangeOffer, to_offer: ExchangeOffer):
    card = from_offer.card
    if not card:
        raise ValueError('Missing card for offer')
    normalized_type = normalize_card_type(from_offer.card_type)
    content_type = ContentType.objects.get_for_model(type(card))
    card_entry = (
        PackPurchaseCard.objects
        .select_related('purchase')
        .filter(
            purchase__user=from_offer.user,
            content_type=content_type,
            object_id=card.pk,
        )
        .first()
    )
    if not card_entry:
        raise ValueError('Unable to locate card entry for exchange')
    rarity = card_entry.rarity
    card_entry.delete()
    _maybe_remove_collection_entry(from_offer.user, card, normalized_type or from_offer.card_type)

    pack = _get_exchange_pack()
    purchase = PackPurchase.objects.create(
        user=to_offer.user,
        pack=pack,
        cost=0,
        cards_count=1,
    )
    PackPurchaseCard.objects.create(
        purchase=purchase,
        content_type=content_type,
        object_id=card.pk,
        rarity=rarity or getattr(card, 'rarity', None),
    )
    _ensure_collection_entry(to_offer.user, card, normalized_type or from_offer.card_type)


def _create_notifications(offer_a: ExchangeOffer, offer_b: ExchangeOffer):
    card_a = getattr(offer_a, 'card', None)
    card_b = getattr(offer_b, 'card', None)
    if not card_a or not card_b:
        return
    ExchangeNotification.objects.bulk_create(
        [
            ExchangeNotification(
                user=offer_a.user,
                title='Scambio completato',
                message=f'Hai scambiato {card_a} con {offer_b.user.username} e ora possiedi {card_b}.',
            ),
            ExchangeNotification(
                user=offer_b.user,
                title='Scambio completato',
                message=f'Hai scambiato {card_b} con {offer_a.user.username} e ora possiedi {card_a}.',
            ),
        ]
    )


def attempt_match_for_offer(offer: ExchangeOffer) -> Optional[Dict[str, str]]:
    card = getattr(offer, 'card', None)
    if not card:
        return None
    rarity_name = getattr(getattr(card, 'rarity', None), 'name', 'common')
    normalized_rarity = (rarity_name or 'common').lower()

    with transaction.atomic():
        offer = ExchangeOffer.objects.select_for_update().select_related('user').get(pk=offer.pk)
        if offer.status != ExchangeOffer.Status.OPEN:
            return None
        if not _has_tradeable_copy(offer):
            return None

        candidates = (
            ExchangeOffer.objects.select_for_update()
            .filter(
                status=ExchangeOffer.Status.OPEN,
                required_rarity=normalized_rarity,
            )
            .exclude(user=offer.user)
            .order_by('created_at')
            .select_related('user', 'content_type')
        )

        for candidate in candidates:
            other_card = getattr(candidate, 'card', None)
            if not other_card:
                continue
            if candidate.pk == offer.pk:
                continue
            if not _has_tradeable_copy(candidate):
                continue
            if not _user_missing_card(candidate.user, type(card), card.pk):
                continue
            if not _user_missing_card(offer.user, type(other_card), other_card.pk):
                continue

            _transfer_single_copy(offer, candidate)
            _transfer_single_copy(candidate, offer)

            now = timezone.now()
            offer.status = ExchangeOffer.Status.COMPLETED
            offer.requested_by = candidate.user
            offer.requested_at = now
            offer.updated_at = now
            offer.save(update_fields=['status', 'requested_by', 'requested_at', 'updated_at'])

            candidate.status = ExchangeOffer.Status.COMPLETED
            candidate.requested_by = offer.user
            candidate.requested_at = now
            candidate.updated_at = now
            candidate.save(update_fields=['status', 'requested_by', 'requested_at', 'updated_at'])

            _create_notifications(offer, candidate)

            return {
                'matched': True,
                'partner_username': candidate.user.username,
                'received_card_name': getattr(other_card, 'name', 'Carta'),
                'sent_card_name': getattr(card, 'name', 'Carta'),
            }

    return None
