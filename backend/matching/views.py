from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Profile
from hackathons.models import Hackathon, Participation

from .ai_reason import generate_ai_reasons
from .models import Recommendation, RecommendationJob
from .scoring import score_pair
from .serializers import RecommendationJobSerializer, RecommendationSerializer

# "다시 추천받기" 한 번당 Groq 호출을 이 인원수로 고정한다 (ai_reason.py 참고).
AI_REASON_TOP_N = 5


class RecommendationView(APIView):
    """
    GET/POST 둘 다 /hackathons/{id}/recommendations/ 하나의 경로를 쓴다
    (프론트 계약이 그렇게 고정돼 있음) — 그래서 뷰를 하나로 합치고 메서드로 분기한다.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, hackathon_id):
        qs = Recommendation.objects.filter(
            requester=request.user, hackathon_id=hackathon_id
        ).select_related('target__profile')
        return Response(RecommendationSerializer(qs, many=True).data)

    def post(self, request, hackathon_id):
        hackathon = get_object_or_404(Hackathon, pk=hackathon_id)

        if not Participation.objects.filter(user=request.user, hackathon=hackathon).exists():
            raise ValidationError('이 해커톤에 먼저 참가 신청을 해주세요.')

        try:
            requester_profile = request.user.profile
        except Profile.DoesNotExist:
            raise ValidationError('프로필을 먼저 작성해주세요.')

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
            match = score_pair(requester_profile, candidate_profile)
            scored.append((participation.user, candidate_profile, match))

        # 점수 높은 순으로 정렬 후 상위 N명만 AI 문구 대상으로 삼는다.
        # (Recommendation.Meta.ordering도 -score라 GET 조회 시 순서가 그대로 유지된다)
        scored.sort(key=lambda item: item[2].score, reverse=True)
        top_candidates = scored[:AI_REASON_TOP_N]

        try:
            ai_texts = generate_ai_reasons(requester_profile, top_candidates)
        except Exception:
            # AI 호출 실패로 추천 전체가 죽으면 안 된다 — 템플릿 문구로 조용히 폴백.
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
