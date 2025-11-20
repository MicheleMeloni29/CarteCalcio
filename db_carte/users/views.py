from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RegisterSerializer

DEFAULT_ACHIEVEMENT_STATS = {
    "totalAnswers": 0,
    "correctAnswers": 0,
    "quizzesCompleted": 0,
}


def _normalize_stats(payload):
    normalized = dict(DEFAULT_ACHIEVEMENT_STATS)
    source = payload if isinstance(payload, dict) else {}
    for key in DEFAULT_ACHIEVEMENT_STATS:
        value = source.get(key)
        if isinstance(value, (int, float)):
            normalized[key] = max(0, int(value))
    return normalized


def _normalize_claims(payload):
    result = []
    seen = set()
    if isinstance(payload, list):
        for item in payload:
            if isinstance(item, str) and item and item not in seen:
                seen.add(item)
                result.append(item)
    return result

class RegisterView(APIView):
    def post(self, request):
        print("Dati ricevuti:", request.data)  # DEBUG: stampa i dati ricevuti
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User registered successfully."}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserCreditsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "credits": request.user.money,
                "username": request.user.username,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        user = request.user
        delta = request.data.get("delta")
        value = request.data.get("value")

        if delta is None and value is None:
            return Response(
                {"detail": "Provide either 'delta' or 'value' to update credits."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if delta is not None and value is not None:
            return Response(
                {"detail": "Use either 'delta' or 'value', not both."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if delta is not None:
                delta = int(delta)
                new_total = user.money + delta
            else:
                new_total = int(value)
        except (TypeError, ValueError):
            return Response(
                {"detail": "Credits values must be integers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_total < 0:
            return Response(
                {"detail": "Credits cannot be negative."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.money = new_total
        user.save(update_fields=["money"])

        return Response(
            {
                "credits": user.money,
                "username": user.username,
            },
            status=status.HTTP_200_OK,
        )


class AchievementProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        stats = _normalize_stats(request.user.achievement_stats)
        claims = _normalize_claims(request.user.achievement_claims)
        return Response(
            {
                "stats": stats,
                "claimedAchievementIds": claims,
                "userId": request.user.id,
                "username": request.user.username,
            },
            status=status.HTTP_200_OK,
        )

    def put(self, request):
        incoming_stats = request.data.get("stats")
        incoming_claims = request.data.get("claimedAchievementIds")

        stats_source = incoming_stats if isinstance(incoming_stats, dict) else request.user.achievement_stats
        claims_source = incoming_claims if isinstance(incoming_claims, list) else request.user.achievement_claims

        stats = _normalize_stats(stats_source)
        claims = _normalize_claims(claims_source)

        user = request.user
        user.achievement_stats = stats
        user.achievement_claims = claims
        user.save(update_fields=["achievement_stats", "achievement_claims"])

        return Response(
            {
                "stats": stats,
                "claimedAchievementIds": claims,
                "userId": request.user.id,
                "username": request.user.username,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        return self.put(request)
