from rest_framework import serializers
from .models import Card  # Importa il modello Card dalla tua app

class CardSerializer(serializers.ModelSerializer):
    rarity_color = serializers.CharField(source="rarity.color", read_only=True)  # Colore della rarità

    class Meta:
        model = Card
        fields = ["id", "name", "rarity", "rarity_color", "image", "attack", "defense"]
