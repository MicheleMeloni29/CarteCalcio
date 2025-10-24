from django.db import migrations


THEME_NAME = "Top Scorer"
THEME_SLUG = "top-scorer"


def create_top_scorer_theme(apps, schema_editor):
    QuizTheme = apps.get_model("quiz", "QuizTheme")
    QuizTheme.objects.get_or_create(
        name=THEME_NAME,
        defaults={"slug": THEME_SLUG},
    )


def remove_top_scorer_theme(apps, schema_editor):
    QuizTheme = apps.get_model("quiz", "QuizTheme")
    QuizTheme.objects.filter(name=THEME_NAME).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("quiz", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_top_scorer_theme, remove_top_scorer_theme),
    ]
