from django.contrib import admin
from .models import PlayerCard, CoachCard, BonusMalusCard, CardRarity

@admin.register(CardRarity)
class CardRarityAdmin(admin.ModelAdmin):
    list_display = ['name']  # Visualizza il nome della rarità nella lista
    search_fields = ['name']  # Aggiunge un campo di ricerca

@admin.register(PlayerCard)
class PlayerCardAdmin(admin.ModelAdmin):
    list_display = ('name', 'team', 'rarity', 'attack', 'defense')
    list_filter = ('rarity',)


@admin.register(CoachCard)
class CoachCardAdmin(admin.ModelAdmin):
    list_display = ('name', 'attack_bonus', 'defense_bonus', 'rarity')
    list_filter = ('rarity',)


@admin.register(BonusMalusCard)
class BonusMalusCardAdmin(admin.ModelAdmin):
    list_display = ('name', 'effect', 'duration', 'rarity')
    list_filter = ('rarity',)


