from rest_framework import serializers

from hackathons.serializers import HackathonRefSerializer

from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    """받은 리뷰 목록(마이페이지 '리뷰 보기')과 작성 응답에 공통으로 쓴다."""

    hackathon = HackathonRefSerializer(read_only=True)
    reviewer_name = serializers.CharField(source='reviewer.name', read_only=True)
    reviewer_initial = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id', 'hackathon', 'reviewer_name', 'reviewer_initial',
            'rating', 'content', 'created_at',
        ]

    def get_reviewer_initial(self, obj):
        return obj.reviewer.name[:1] if obj.reviewer.name else '?'
