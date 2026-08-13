from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from coffeechat.models import CoffeeChat
from hackathons.models import Hackathon

from .models import Review
from .serializers import ReviewSerializer


class ReviewCreateView(APIView):
    """작성 = upsert. 같은 해커톤·상대에 다시 요청하면 기존 리뷰를 덮어쓴다."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        hackathon_id = request.data.get('hackathon_id')
        reviewee_id = request.data.get('reviewee_id')
        rating = request.data.get('rating')
        content = (request.data.get('content') or '').strip()

        if not hackathon_id or not reviewee_id:
            raise ValidationError('hackathon_id, reviewee_id는 필수입니다.')
        try:
            rating = int(rating)
        except (TypeError, ValueError):
            raise ValidationError({'rating': '1~5 사이의 평점을 입력해주세요.'})
        if not 1 <= rating <= 5:
            raise ValidationError({'rating': '1~5 사이의 평점을 입력해주세요.'})
        if int(reviewee_id) == request.user.id:
            raise ValidationError('자기 자신은 리뷰할 수 없어요.')

        hackathon = get_object_or_404(Hackathon, pk=hackathon_id)
        reviewee = get_object_or_404(User, pk=reviewee_id)

        # 실제로 매칭되어 협업한(수락된 커피챗) 사이에서만 리뷰를 남길 수 있다
        is_teammate = CoffeeChat.objects.filter(
            hackathon=hackathon,
            status__in=[
                CoffeeChat.Status.ACCEPTED, CoffeeChat.Status.IN_PROGRESS, CoffeeChat.Status.COMPLETED,
            ],
        ).filter(
            Q(sender=request.user, receiver=reviewee) | Q(sender=reviewee, receiver=request.user)
        ).exists()
        if not is_teammate:
            raise ValidationError('같은 해커톤에서 커피챗이 수락된 상대만 리뷰할 수 있어요.')

        review, _ = Review.objects.update_or_create(
            hackathon=hackathon, reviewer=request.user, reviewee=reviewee,
            defaults={'rating': rating, 'content': content},
        )
        return Response(ReviewSerializer(review).data, status=200)


class MyReceivedReviewsView(generics.ListAPIView):
    """마이페이지 '리뷰 보기' — 내가 받은 리뷰 전체."""

    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Review.objects.filter(reviewee=self.request.user).select_related('reviewer', 'hackathon')
