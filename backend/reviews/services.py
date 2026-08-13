"""리뷰 요약(평균/개수) 계산. matching(추천 카드)과 accounts(프로필)가 공통으로 쓴다."""
from django.db.models import Avg, Count

from .models import Review


def review_summary(user):
    agg = Review.objects.filter(reviewee=user).aggregate(average=Avg('rating'), count=Count('id'))
    return {
        'average': round(agg['average'], 1) if agg['average'] is not None else None,
        'count': agg['count'],
    }
