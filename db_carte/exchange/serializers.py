from rest_framework import serializers

from packs.serializers import serialize_collection_card

from .models import ExchangeNotification, ExchangeOffer
from .utils import get_card_quantity_for_user, normalize_card_type


class ExchangeOfferSerializer(serializers.ModelSerializer):
    offered_card = serializers.SerializerMethodField()
    username = serializers.CharField(source='user.username', read_only=True)
    requested_by = serializers.SerializerMethodField()

    class Meta:
        model = ExchangeOffer
        fields = (
            'id',
            'username',
            'wants',
            'required_rarity',
            'card_type',
            'status',
            'offered_card',
            'requested_by',
        )

    def get_offered_card(self, obj: ExchangeOffer):
        card = getattr(obj, 'card', None)
        if not card:
            return None
        request = self.context.get('request')
        quantity = get_card_quantity_for_user(obj.user, type(card), card.pk) or 1
        payload = serialize_collection_card(card, request=request, quantity=quantity)
        payload['type'] = obj.card_type
        payload['rarity'] = obj.required_rarity
        normalized = normalize_card_type(obj.card_type)
        if normalized == 'bonusmalus':
            payload['type'] = 'bonusMalus'
        return payload

    def get_requested_by(self, obj: ExchangeOffer):
        if obj.requested_by_id:
            return obj.requested_by.username
        return None


class ExchangeNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExchangeNotification
        fields = ('id', 'title', 'message', 'created_at')
