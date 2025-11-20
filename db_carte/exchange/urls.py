from django.urls import path

from .views import (
    ExchangeFeedView,
    ExchangeNotificationListView,
    ExchangeNotificationReadView,
    ExchangeOfferCreateView,
    ExchangeOfferDetailView,
    ExchangeOfferJoinView,
    MyExchangeOffersView,
)

urlpatterns = [
    path('offers/', ExchangeOfferCreateView.as_view(), name='exchange-offer-create'),
    path('offers/mine/', MyExchangeOffersView.as_view(), name='exchange-offer-mine'),
    path('offers/feed/', ExchangeFeedView.as_view(), name='exchange-offer-feed'),
    path('offers/<uuid:offer_id>/', ExchangeOfferDetailView.as_view(), name='exchange-offer-detail'),
    path('offers/<uuid:offer_id>/join/', ExchangeOfferJoinView.as_view(), name='exchange-offer-join'),
    path('notifications/', ExchangeNotificationListView.as_view(), name='exchange-notifications'),
    path('notifications/read/', ExchangeNotificationReadView.as_view(), name='exchange-notifications-read'),
]
