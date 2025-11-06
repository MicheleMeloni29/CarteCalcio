from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("cards", "0004_goalkeepercard_usercollection_goalkeeper_cards_and_more"),
    ]

    operations = [
        migrations.RenameField(
            model_name="goalkeepercard",
            old_name="save",
            new_name="saves",
        ),
    ]

