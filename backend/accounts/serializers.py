from django.db.models import Q
from rest_framework import serializers

from .models import Profile

# 프론트엔드 src/types/index.ts의 LINK_TYPES와 동일하게 맞춘다.
# meta/options로 서버가 내려주는 값이 아니라 프론트에 하드코딩된 상수라
# 여기서도 그대로 하드코딩한다.
LINK_TYPES = ('GitHub', '블로그', 'Instagram', 'Notion', 'Behance', 'LinkedIn', '기타')


class PortfolioLinkSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=LINK_TYPES)
    url = serializers.URLField()


class MyProfileSerializer(serializers.ModelSerializer):
    """내 프로필 조회/저장 겸용 (GET/PUT 응답·입력 형태가 동일하다).

    상세 자기소개 5개 항목은 AI 매칭의 핵심 근거라 필수로 바뀌었다 — 모델은
    blank=True로 남겨두되(과거 데이터 호환) 여기서 required=True로 막는다.
    프론트 검증만 믿지 않고 API를 직접 호출해도 막히도록 하는 게 목적이다.
    """

    links = PortfolioLinkSerializer(many=True, required=False)
    bio_style = serializers.CharField(allow_blank=False)
    bio_strength = serializers.CharField(allow_blank=False)
    bio_experience = serializers.CharField(allow_blank=False)
    bio_goal = serializers.CharField(allow_blank=False)
    bio_contribution = serializers.CharField(allow_blank=False)

    class Meta:
        model = Profile
        fields = [
            'roles', 'skills', 'available_time', 'regions', 'goal',
            'collaboration', 'communication', 'interests', 'one_liner',
            'bio_style', 'bio_strength', 'bio_experience', 'bio_goal',
            'bio_contribution', 'links', 'open_chat', 'phone', 'is_private',
        ]


class MemberProfileSerializer(serializers.ModelSerializer):
    """다른 사람의 프로필 상세. 연락처는 커피챗 수락 전까지 마스킹한다."""

    id = serializers.IntegerField(source='user.id', read_only=True)
    name = serializers.CharField(source='user.name', read_only=True)
    initial = serializers.SerializerMethodField()
    links = PortfolioLinkSerializer(many=True, read_only=True)
    open_chat = serializers.SerializerMethodField()
    open_chat_locked = serializers.SerializerMethodField()
    coffeechat_sent = serializers.SerializerMethodField()
    coffeechat_status = serializers.SerializerMethodField()
    review_summary = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            'id', 'name', 'initial', 'roles', 'skills', 'available_time',
            'goal', 'collaboration', 'communication', 'interests', 'one_liner',
            'bio_style', 'bio_strength', 'bio_experience', 'bio_goal', 'bio_contribution',
            'links', 'open_chat', 'open_chat_locked', 'coffeechat_sent', 'coffeechat_status',
            'review_summary', 'reviews',
        ]

    def get_initial(self, obj):
        return obj.user.name[:1] if obj.user.name else '?'

    # 이 엔드포인트(/users/{id}/profile/)엔 hackathon_id가 없어서 "이 해커톤에서"로
    # 좁히지 못하고 프로젝트 전체 기준으로 판단한다 (해커톤별로 나누고 싶으면
    # 프론트에서 ?hackathon= 쿼리를 추가로 받아야 함 — 지금 계약엔 없다).
    def _accepted_coffeechat(self, obj):
        if not hasattr(obj, '_accepted_cc_cache'):
            from coffeechat.models import CoffeeChat  # 앱 간 순환 임포트 방지용 지역 import

            request = self.context['request']
            obj._accepted_cc_cache = CoffeeChat.objects.filter(
                # in_progress/completed도 이미 수락된 관계다 — ACCEPTED만 보면
                # 진행 상태를 넘긴 순간 다시 잠기는 회귀가 생긴다.
                status__in=[
                    CoffeeChat.Status.ACCEPTED, CoffeeChat.Status.IN_PROGRESS, CoffeeChat.Status.COMPLETED,
                ],
            ).filter(
                Q(sender=request.user, receiver=obj.user) | Q(sender=obj.user, receiver=request.user)
            ).first()
        return obj._accepted_cc_cache

    def _my_sent_coffeechat(self, obj):
        if not hasattr(obj, '_sent_cc_cache'):
            from coffeechat.models import CoffeeChat

            request = self.context['request']
            obj._sent_cc_cache = (
                CoffeeChat.objects.filter(sender=request.user, receiver=obj.user)
                .order_by('-created_at')
                .first()
            )
        return obj._sent_cc_cache

    def get_open_chat(self, obj):
        return obj.open_chat if self._accepted_coffeechat(obj) else None

    def get_open_chat_locked(self, obj):
        return self._accepted_coffeechat(obj) is None

    def get_coffeechat_sent(self, obj):
        return self._my_sent_coffeechat(obj) is not None

    def get_coffeechat_status(self, obj):
        cc = self._my_sent_coffeechat(obj)
        return cc.status if cc else None

    def get_review_summary(self, obj):
        from reviews.services import review_summary  # 앱 간 순환 임포트 방지용 지역 import

        return review_summary(obj.user)

    def get_reviews(self, obj):
        from reviews.models import Review  # 앱 간 순환 임포트 방지용 지역 import
        from reviews.serializers import ReviewSerializer

        qs = Review.objects.filter(reviewee=obj.user).select_related('reviewer', 'hackathon')[:20]
        return ReviewSerializer(qs, many=True).data
