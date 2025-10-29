from django.urls import path

from .views import PackListView, PackPurchaseView, UserCollectionView


urlpatterns = [
    path("", PackListView.as_view(), name="pack-list"),
    path("<slug:slug>/purchase/", PackPurchaseView.as_view(), name="pack-purchase"),
    path("collection/", UserCollectionView.as_view(), name="user-collection"),
]
