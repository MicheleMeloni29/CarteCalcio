from django.urls import path

from . import views

urlpatterns = [
    path("themes/", views.quiz_theme_list, name="quiz_theme_list"),
    path("themes/<slug:slug>/", views.questions_by_theme, name="quiz_questions_by_theme"),
]
