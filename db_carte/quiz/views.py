from django.db.models import Count, Prefetch
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET

from .models import QuizTheme, QuizQuestion, QuizAnswer


@require_GET
def quiz_theme_list(_request):
    themes = (
        QuizTheme.objects.annotate(question_count=Count("questions"))
        .order_by("name")
    )
    data = [
        {
            "id": theme.id,
            "name": theme.name,
            "slug": theme.slug,
            "question_count": theme.question_count,
        }
        for theme in themes
    ]
    return JsonResponse({"themes": data})


@require_GET
def questions_by_theme(_request, slug: str):
    theme = get_object_or_404(
        QuizTheme.objects.prefetch_related(
            Prefetch(
                "questions",
                queryset=QuizQuestion.objects.prefetch_related(
                    Prefetch("answers", queryset=QuizAnswer.objects.order_by("id"))
                ).order_by("id"),
            )
        ),
        slug=slug,
    )

    questions_payload = []
    for question in theme.questions.all():
        answers_payload = [
            {
                "id": answer.id,
                "text": answer.text,
                "is_correct": answer.is_correct,
            }
            for answer in question.answers.all()
        ]
        questions_payload.append(
            {
                "id": question.id,
                "text": question.text,
                "explanation": question.explanation,
                "answers": answers_payload,
            }
        )

    return JsonResponse(
        {
            "id": theme.id,
            "name": theme.name,
            "slug": theme.slug,
            "questions": questions_payload,
        }
    )
