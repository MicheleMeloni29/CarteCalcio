from django.db import migrations, models


def default_stats():
    return {}


def default_claims():
    return []


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='achievement_stats',
            field=models.JSONField(blank=True, default=default_stats),
        ),
        migrations.AddField(
            model_name='customuser',
            name='achievement_claims',
            field=models.JSONField(blank=True, default=default_claims),
        ),
    ]
