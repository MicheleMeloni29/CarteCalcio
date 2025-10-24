from django.contrib import admin

from .models import QuizTheme, QuizQuestion, QuizAnswer


class QuizAnswerInline(admin.TabularInline):
    model = QuizAnswer
    extra = 0
    min_num = 4
    max_num = 4
    validate_min = True
    validate_max = True


@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = ("text", "theme")
    list_filter = ("theme",)
    search_fields = ("text",)
    inlines = [QuizAnswerInline]


@admin.register(QuizTheme)
class QuizThemeAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}


@admin.register(QuizAnswer)
class QuizAnswerAdmin(admin.ModelAdmin):
    list_display = ("text", "question", "is_correct")
    list_filter = ("question__theme", "is_correct")
    search_fields = ("text", "question__text")
