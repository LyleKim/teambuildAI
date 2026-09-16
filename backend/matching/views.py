import logging
import random

from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import generics, serializers
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Profile
from hackathons.models import Hackathon, Participation
from hackathons.views import ROLE_CATEGORIES

from .ai_reason import generate_ai_reasons
from .models import Recommendation, RecommendationJob
from .scoring import ScoredMatch, score_pair
from .serializers import RecommendationJobSerializer, RecommendationSerializer

logger = logging.getLogger(__name__)

# "다시 추천받기" 한 번당 Groq 호출을 이 인원수로 고정한다 (ai_reason.py 참고).
AI_REASON_TOP_N = 5

# 프로필에 매칭되는 역할이 없을 때의 기본 카테고리. 프론트 DEFAULT_CATEGORY와 동일한 규칙.
DEFAULT_ROLE_CATEGORY = 'dev'


def category_of(profile):
    """프로필의 첫 매칭 역할로 카테고리('dev'/'design'/'planning')를 판정한다."""
    for role in profile.roles:
        category = ROLE_CATEGORIES.get(role)
        if category:
            return category
    return DEFAULT_ROLE_CATEGORY


class RecommendationView(APIView):
    """
    GET/POST 둘 다 /hackathons/{id}/recommendations/ 하나의 경로를 쓴다
    (프론트 계약이 그렇게 고정돼 있음) — 그래서 뷰를 하나로 합치고 메서드로 분기한다.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(responses=RecommendationSerializer(many=True))
    def get(self, request, hackathon_id):
        qs = Recommendation.objects.filter(
            requester=request.user, hackathon_id=hackathon_id
        ).select_related('target__profile')
        return Response(RecommendationSerializer(qs, many=True).data)

    @extend_schema(
        request=inline_serializer('RecommendationRequest', {
            'target_category': serializers.ChoiceField(
                choices=['dev', 'design', 'planning'], required=False,
                help_text='추천받을 대상 카테고리. 생략하면 본인 카테고리로 기본 처리.',
            ),
        }),
        responses={201: RecommendationJobSerializer},
    )
    def post(self, request, hackathon_id):
        hackathon = get_object_or_404(Hackathon, pk=hackathon_id)

        if not Participation.objects.filter(user=request.user, hackathon=hackathon).exists():
            raise ValidationError('이 해커톤에 먼저 참가 신청을 해주세요.')

        try:
            requester_profile = request.user.profile
        except Profile.DoesNotExist:
            raise ValidationError('프로필을 먼저 작성해주세요.')

        # 추천받을 대상 카테고리. 지정 안 하면(자동생성 지점들) 본인 카테고리로 기본값 처리.
        requester_category = category_of(requester_profile)
        target_category = request.data.get('target_category') or requester_category
        same_category = target_category == requester_category

        job = RecommendationJob.objects.create(
            user=request.user, hackathon=hackathon, status=RecommendationJob.Status.RUNNING,
        )

        # 후보군: 이 해커톤에 개인으로 참가한 사람들(=팀을 찾는 중인 사람들) 중 나 자신과
        # 추천 대상에서 비공개(is_private) 설정한 사람은 제외.
        candidates = (
            Participation.objects.filter(
                hackathon=hackathon, join_type=Participation.JoinType.INDIVIDUAL,
            )
            .exclude(user=request.user)
            .select_related('user__profile')
        )

        scored = []
        for participation in candidates:
            candidate_profile = getattr(participation.user, 'profile', None)
            if candidate_profile is None or candidate_profile.is_private:
                continue
            if category_of(candidate_profile) != target_category:
                continue

            if same_category:
                match = score_pair(requester_profile, candidate_profile)
            else:
                # 다른 역할군 추천: 참여 목표가 같은 사람만, AI 문구 없이 무작위 순서로 보여준다.
                if candidate_profile.goal != requester_profile.goal:
                    continue
                match = ScoredMatch(
                    score=random.randint(1, 100), fit_points='', complement='', check_point='', reason='',
                )
            scored.append((participation.user, candidate_profile, match))

        # 점수 높은 순으로 정렬 후 상위 N명만 AI 문구 대상으로 삼는다.
        # (Recommendation.Meta.ordering도 -score라 GET 조회 시 순서가 그대로 유지된다)
        scored.sort(key=lambda item: item[2].score, reverse=True)

        if same_category:
            top_candidates = scored[:AI_REASON_TOP_N]
            try:
                ai_texts = generate_ai_reasons(requester_profile, top_candidates)
            except Exception:
                # AI 호출 실패로 추천 전체가 죽으면 안 된다 — 템플릿 문구로 조용히 폴백.
                logger.exception('AI 추천 문구 생성 실패 (hackathon_id=%s)', hackathon_id)
                ai_texts = {}
        else:
            # 다른 역할군 추천은 AI 추천 문구가 필요 없다 (스킬+한줄소개만 노출).
            ai_texts = {}

        # 다시 추천받기를 눌러도 이전 결과가 섞이지 않도록 이번 해커톤 결과를 통째로 새로 만든다.
        Recommendation.objects.filter(requester=request.user, hackathon=hackathon).delete()

        Recommendation.objects.bulk_create(
            Recommendation(
                requester=request.user,
                hackathon=hackathon,
                target=user,
                score=match.score,
                fit_points=ai_texts.get(user.id, {}).get('fit_points', match.fit_points),
                complement=ai_texts.get(user.id, {}).get('complement', match.complement),
                check_point=ai_texts.get(user.id, {}).get('check_point', match.check_point),
                reason=ai_texts.get(user.id, {}).get('reason', match.reason),
                ai_generated=user.id in ai_texts,
            )
            for user, candidate_profile, match in scored
        )

        job.status = RecommendationJob.Status.DONE
        job.completed_at = timezone.now()
        job.save(update_fields=['status', 'completed_at'])

        return Response(RecommendationJobSerializer(job).data, status=201)


class RecommendationJobStatusView(generics.RetrieveAPIView):
    serializer_class = RecommendationJobSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'job_id'
    lookup_url_kwarg = 'job_id'

    def get_queryset(self):
        return RecommendationJob.objects.filter(user=self.request.user)
