from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('player/', views.player_cards_list, name='player_cards_list'),  # Carte giocatore
    path('coach/', views.coach_cards_list, name='coach_cards_list'),  # Carte allenatore
    path('bonus_malus/', views.bonus_malus_cards_list, name='bonus_malus_cards_list'),  # Carte bonus/malus
    path('all/', views.all_cards_list, name='all_cards_list'),  # Tutte le carte
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
