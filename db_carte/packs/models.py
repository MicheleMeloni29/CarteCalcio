from decimal import Decimal

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.validators import MinValueValidator
from django.db import models


class Pack(models.Model):
    """
    Represents a purchasable pack definition (name, price, odds, etc.).
    """

    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    price = models.PositiveIntegerField()
    cards_per_pack = models.PositiveIntegerField(default=5)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("price", "id")

    def __str__(self) -> str:
        return self.name

    def total_weight(self) -> Decimal:
        return sum(weight.weight for weight in self.rarity_weights.all())


class PackRarityWeight(models.Model):
    """
    Stores the probability distribution for pulling a given rarity from a pack.
    The values are expressed as percentages (e.g. 89.89 for 89.89%).
    """

    pack = models.ForeignKey(
        Pack,
        on_delete=models.CASCADE,
        related_name="rarity_weights",
    )
    rarity = models.ForeignKey(
        "cards.CardRarity",
        on_delete=models.CASCADE,
        related_name="pack_weights",
    )
    weight = models.DecimalField(
        max_digits=6,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.000"))],
        help_text="Percentage weight for this rarity within the pack.",
    )

    class Meta:
        unique_together = ("pack", "rarity")
        ordering = ("pack", "rarity__name")

    def __str__(self) -> str:
        return f"{self.pack.name} -> {self.rarity.name}: {self.weight}%"


class PackPurchase(models.Model):
    """
    Audit log of pack openings. Keeps track of which user opened which pack.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="pack_purchases",
    )
    pack = models.ForeignKey(
        Pack,
        on_delete=models.CASCADE,
        related_name="purchases",
    )
    cost = models.PositiveIntegerField()
    cards_count = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.user} opened {self.pack.name} ({self.created_at:%Y-%m-%d %H:%M:%S})"


class PackPurchaseCard(models.Model):
    """
    Stores the individual cards that were produced by a pack opening.
    Uses a generic foreign key so we can point to any card model.
    """

    purchase = models.ForeignKey(
        PackPurchase,
        on_delete=models.CASCADE,
        related_name="opened_cards",
    )
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    card = GenericForeignKey("content_type", "object_id")
    rarity = models.ForeignKey("cards.CardRarity", on_delete=models.CASCADE)

    class Meta:
        ordering = ("id",)

    def __str__(self) -> str:
        if self.card:
            return f"{self.card} (from {self.purchase})"
        return f"Unknown card (ID {self.object_id})"

    @property
    def card_type(self) -> str:
        return self.content_type.model
