from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


# Card rarity: define the rarity of a card
class CardRarity(models.Model):
    RARITY_COLORS = {
        'common': 'bronze',
        'rare': 'silver',
        'epic': 'gold',
        'legendary': 'emerald',
    }

    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=50, default='bronze')  # every rarity has a color 

    def save(self, *args, **kwargs):
        if self.name in self.RARITY_COLORS:
            self.color = self.RARITY_COLORS[self.name]
        super(CardRarity, self).save(*args, **kwargs)

    def __str__(self):
        return self.name

# Teams: list of football teams
TEAMS = [
    ("BERGAMO", "Bergamo"),
    ("VIRTUS", "Virtus"),
    ("4MORI", "4 Mori"),
    ("LAKECITY", "Lake City"),
    ("TOSCANI", "Toscani"),
    ("VIOLA", "Viola"),
    ("GRIFONI", "Grifoni"),
    ("VENETI", "Veneti"),
    ("LOMBARDIA", "Lombardia"),
    ("ZEBRE", "Zebre"),
    ("AQUILE", "Aquile"),
    ("SALENTO", "Salento"),
    ("DIAVOLI", "Diavoli"),
    ("BRIANZA", "Brianza"),
    ("PARTENOPI", "Partenopi"),
    ("PARMIGIANI", "Parmigiani"),
    ("LUPI", "Lupi"),
    ("GRANATA", "Granata"),
    ("FRIULANI", "Friulani"),
    ("LEONI", "Leoni"),
]


# Player cards: cards that represent football players
class PlayerCard(models.Model):
    name = models.CharField(max_length=100)
    team = models.CharField(
        max_length=20, 
        choices=TEAMS, 
        default="BERGAMO"
    )
    attack = models.IntegerField()
    defense = models.IntegerField()
    abilities = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to="player_images/")
    rarity = models.ForeignKey(
        CardRarity, on_delete=models.CASCADE, related_name="player_cards"
    )

    def image_url(self):
        if self.image:
            return f"{settings.DOMAIN_NAME}{settings.MEDIA_URL}{self.image.name}"
        return None

    def __str__(self):
        return f"{self.name} - {self.rarity}"


# Coach cards: cards that can have positive effects on the team
class CoachCard(models.Model):
    name = models.CharField(max_length=100)
    team = models.CharField(
        max_length=20, 
        choices=TEAMS, 
        default="BERGAMO"
    )
    attack_bonus = models.FloatField()
    defense_bonus = models.FloatField()
    image = models.ImageField(upload_to="coach_images/", blank=True, null=True)
    rarity = models.ForeignKey(
        CardRarity, on_delete=models.CASCADE, related_name="coach_cards"
    )

    def __str__(self):
        return f"{self.name} - {self.rarity}"


# Bonus/Malus cards: cards that can have positive or negative effects on the game
class BonusMalusCard(models.Model):
    name = models.CharField(max_length=100)
    effect = models.TextField(blank=True, null=True)
    duration = models.IntegerField()
    rarity = models.ForeignKey(CardRarity, on_delete=models.SET_NULL, null=True, related_name="cards")
    image = models.ImageField(upload_to="bonus_malus_images/", blank=True, null=True)

    def __str__(self):
        return f"{self.name} - {self.rarity}"
    


# Users collection: allow users to collect cards
class UserCollection(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="collection"
    )
    player_cards = models.ManyToManyField(PlayerCard, related_name="owned_by_users" ,blank=True)
    coach_cards = models.ManyToManyField(CoachCard, related_name="owned_by_users", blank=True)
    bonus_malus_cards = models.ManyToManyField(BonusMalusCard, related_name="owned_by_users", blank=True)

    def __str__(self):
        return f"Collection of {self.user.username}"
    

# Users deck: allow users to create a deck of cards to play a match
class UserDeck(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="decks"
    )

    name = models.CharField(max_length=100)
    player_cards = models.ManyToManyField(PlayerCard, related_name="decks", blank=True)
    coach_cards = models.ManyToManyField(CoachCard, related_name="decks", blank=True)
    bonus_malus_cards = models.ManyToManyField(BonusMalusCard, related_name="decks", blank=True)

    def clean(self):
        """Validation for limit total cards in a deck"""
        total_cards = (
            self.player_cards.count() + 
            self.coach_cards.count() + 
            self.bonus_malus_cards.count()
        )
        if total_cards > 20:
            raise ValidationError("A deck can have a maximum of 20 cards")
        
    def save(self, *args, **kwargs):
        """Apply validation before saving model"""
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} (User: {self.user.username})"


