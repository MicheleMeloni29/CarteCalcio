from django.urls import path
from .views import RegisterView, UserCreditsView, AchievementProgressView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/credits/', UserCreditsView.as_view(), name='user_credits'),
    path('me/achievements/', AchievementProgressView.as_view(), name='user_achievements'),
]
