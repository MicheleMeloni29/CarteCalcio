from django.http import JsonResponse
from .models import PlayerCard, GoalkeeperCard, CoachCard, BonusMalusCard
import logging

logger = logging.getLogger(__name__)

# Endpoint per tutte le carte giocatore
def player_cards_list(request):
    player_cards = PlayerCard.objects.all()
    data = [
        {
            "id": card.id,
            "name": card.name,
            "team": card.team,
            "attack": card.attack,
            "defense": card.defense,
            "abilities": card.abilities,
            "image_url": request.build_absolute_uri(f"/media/{card.image}") if card.image else None,
            "rarity": card.rarity.name if card.rarity else None,
            "season": card.season,
        }
        for card in player_cards
    ]
    return JsonResponse({"player_cards": data})

# Endpoint per tutte le carte allenatore
def coach_cards_list(request):
    coach_cards = CoachCard.objects.all()
    data = [
        {
            "id": card.id,
            "name": card.name,
            "team": card.team,
            "attack_bonus": card.attack_bonus,
            "defense_bonus": card.defense_bonus,
            "image_url": request.build_absolute_uri(f"/media/{card.image}") if card.image else None,
            "rarity": card.rarity.name if card.rarity else None,
            "season": card.season,
        }
        for card in coach_cards
    ]
    return JsonResponse({"coach_cards": data})

# Endpoint per tutte le carte bonus/malus
def bonus_malus_cards_list(request):
    bonus_malus_cards = BonusMalusCard.objects.all()
    data = [
        {
            "id": card.id,
            "name": card.name,
            "effect": card.effect,
            "duration": card.duration,
            "image_url": request.build_absolute_uri(f"/media/{card.image}") if card.image else None,
            "rarity": card.rarity.name if card.rarity else None,
            "season": card.season,
        }
        for card in bonus_malus_cards
    ]
    return JsonResponse({"bonus_malus_cards": data})

# Endpoint generale per tutte le carte
def all_cards_list(request):
    try:
        player_cards = PlayerCard.objects.all()
        goalkeeper_cards = GoalkeeperCard.objects.all()
        coach_cards = CoachCard.objects.all()
        bonus_malus_cards = BonusMalusCard.objects.all()
    except Exception as e:
        logger.error(f"Errore durante il recupero delle carte: {e}")
        return JsonResponse({"error": "Errore interno del server"}, status=500)

    data = {
        "player_cards": [
            {
                "id": card.id,
                "name": card.name,
                "team": card.team,
                "attack": card.attack,
                "defense": card.defense,
                "abilities": card.abilities,
                "image_url": request.build_absolute_uri(f"/media/{card.image}") if card.image else None,
                "rarity": card.rarity.name if card.rarity else None,
                "season": card.season,
            }
            for card in player_cards
        ],
        "goalkeeper_cards": [
            {
                "id": card.id,
                "name": card.name,
                "team": card.team,
                "save": card.saves,
                "abilities": card.abilities,
                "image_url": request.build_absolute_uri(f"/media/{card.image}") if card.image else None,
                "rarity": card.rarity.name if card.rarity else None,
                "season": card.season,
            }
            for card in goalkeeper_cards
        ],
        "coach_cards": [
            {
                "id": card.id,
                "name": card.name,
                "team": card.team,
                "attack_bonus": card.attack_bonus,
                "defense_bonus": card.defense_bonus,
                "image_url": request.build_absolute_uri(f"/media/{card.image}") if card.image else None,
                "rarity": card.rarity.name if card.rarity else None,
                "season": card.season,
            }
            for card in coach_cards
        ],
        "bonus_malus_cards": [
            {
                "id": card.id,
                "name": card.name,
                "effect": card.effect,
                "duration": card.duration,
                "image_url": request.build_absolute_uri(f"/media/{card.image}") if card.image else None,
                "rarity": card.rarity.name if card.rarity else None,
                "season": card.season,
            }
            for card in bonus_malus_cards
        ],
    }
    return JsonResponse(data)
# Endpoint per tutte le carte portiere
def goalkeeper_cards_list(request):
    goalkeeper_cards = GoalkeeperCard.objects.all()
    data = [
        {
            "id": card.id,
            "name": card.name,
            "team": card.team,
            "save": card.saves,
            "abilities": card.abilities,
            "image_url": request.build_absolute_uri(f"/media/{card.image}") if card.image else None,
            "rarity": card.rarity.name if card.rarity else None,
            "season": card.season,
        }
        for card in goalkeeper_cards
    ]
    return JsonResponse({"goalkeeper_cards": data})
