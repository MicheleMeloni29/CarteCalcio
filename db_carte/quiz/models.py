from django.db import models
from django.db.models import Q
from django.utils.text import slugify


class QuizTheme(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class QuizQuestion(models.Model):
    theme = models.ForeignKey(
        QuizTheme,
        on_delete=models.CASCADE,
        related_name="questions",
    )
    text = models.CharField(max_length=255)
    explanation = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["theme", "id"]
        indexes = [
            models.Index(fields=["theme"]),
        ]

    def __str__(self):
        return self.text[:80]


class QuizAnswer(models.Model):
    question = models.ForeignKey(
        QuizQuestion,
        on_delete=models.CASCADE,
        related_name="answers",
    )
    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)

    class Meta:
        ordering = ["question", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["question"],
                condition=Q(is_correct=True),
                name="quiz_unique_correct_answer",
            )
        ]

    def __str__(self):
        return f"{self.question.text[:40]} - {self.text[:40]}"
