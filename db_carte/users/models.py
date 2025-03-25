from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    # Users fields
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    bio = models.TextField(blank=True)
    # Card collection (relationship with card model)
    # Link with card model with foreign key
    # Statistiche del giocatore
    matches_played = models.IntegerField(default=0)
    matches_won = models.IntegerField(default=0)
    matches_lost = models.IntegerField(default=0)
    # Altri dettagli
    level = models.IntegerField(default=1)
    money = models.IntegerField(default=500)

    def __str__(self):
        return self.username
