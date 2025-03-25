from django.apps import AppConfig
from django.db.models.signals import post_migrate


class CardsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'cards'

    def ready(self):
        from .models import CardRarity

        def create_default_card_rarities(sender, **kwargs):
            default_rarities = [
                {"name": "Common", "color": "linear-gradient(135deg, #cd7f32, #d4a373)"},  # Bronzo
                {"name": "Rare", "color": "linear-gradient(135deg, #c0c0c0, #d3d3d3)"},  # Argento
                {"name": "Epic", "color": "linear-gradient(135deg, #ffd700, #ffea70)"},  # Oro
                {"name": "Legendary", "color": "linear-gradient(135deg, #50c878, #66ff66)"},  # Smeraldo
            ]
            for rarity in default_rarities:
                CardRarity.objects.update_or_create(
            name=rarity["name"], defaults={"color": rarity["color"]}
        )

        post_migrate.connect(create_default_card_rarities, sender=self)



