from django.db import migrations, models


DEFAULT_SEASON = "24/25.1"


class Migration(migrations.Migration):

    dependencies = [
        ("cards", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="playercard",
            name="season",
            field=models.CharField(default=DEFAULT_SEASON, max_length=20),
        ),
        migrations.AddField(
            model_name="coachcard",
            name="season",
            field=models.CharField(default=DEFAULT_SEASON, max_length=20),
        ),
        migrations.AddField(
            model_name="bonusmaluscard",
            name="season",
            field=models.CharField(default=DEFAULT_SEASON, max_length=20),
        ),
    ]
