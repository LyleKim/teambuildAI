from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Profile

from .models import Hackathon, ManualParticipant, Participation, Team, TodoItem
from .permissions import IsOwnerOrReadOnly
from .serializers import (
    HackathonSerializer,
    ManualParticipantSerializer,
    ParticipationSerializer,
    TeamSerializer,
    TodoItemSerializer,
)

# ─── 해커톤 ───────────────────────────────────────────────────────────────────


class HackathonListView(generics.ListAPIView):
    serializer_class = HackathonSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Hackathon.objects.filter(is_demo=False).order_by('-created_at')
        q = self.request.query_params.get('q')
        category = self.request.query_params.get('category')
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(category__icontains=q))
        if category:
            qs = qs.filter(category=category)
        return qs


class HackathonDetailView(generics.RetrieveAPIView):
    queryset = Hackathon.objects.all()
    serializer_class = HackathonSerializer
    permission_classes = [AllowAny]


# ─── 참가 ─────────────────────────────────────────────────────────────────────


class ParticipationCreateView(generics.CreateAPIView):
    serializer_class = ParticipationSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        hackathon = get_object_or_404(Hackathon, pk=self.kwargs['hackathon_id'])
        if Participation.objects.filter(user=self.request.user, hackathon=hackathon).exists():
            raise ValidationError('이미 이 해커톤에 참가 신청했습니다.')
        serializer.save(user=self.request.user, hackathon=hackathon)


class MyParticipationListView(generics.ListAPIView):
    serializer_class = ParticipationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Participation.objects.filter(user=self.request.user)
            .select_related('hackathon')
            .order_by('-created_at')
        )


class ParticipationDestroyView(generics.DestroyAPIView):
    serializer_class = ParticipationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # 본인 참가 기록만 삭제 가능 (쿼리셋 자체를 좁혀서 타인 것은 404로 처리)
        return Participation.objects.filter(user=self.request.user)


class ParticipationEndView(APIView):
    """삭제가 아니라 '완료' 표시. 팀원/TDL은 계속 조회할 수 있어야 하므로 지우지 않는다."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        participation = get_object_or_404(Participation, pk=pk, user=request.user)
        if participation.ended_at is None:
            participation.ended_at = timezone.now()
            participation.save(update_fields=['ended_at'])
        return Response(ParticipationSerializer(participation).data)


# ─── 팀 모집 ──────────────────────────────────────────────────────────────────


class TeamCreateView(generics.CreateAPIView):
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        hackathon = get_object_or_404(Hackathon, pk=self.kwargs['hackathon_id'])
        serializer.save(creator=self.request.user, hackathon=hackathon)


class TeamDetailView(generics.RetrieveUpdateAPIView):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]


# ─── 개인 TDL ─────────────────────────────────────────────────────────────────


class TodoItemListCreateView(generics.ListCreateAPIView):
    serializer_class = TodoItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return TodoItem.objects.filter(
            hackathon_id=self.kwargs['hackathon_id'], user=self.request.user,
        )

    def perform_create(self, serializer):
        hackathon = get_object_or_404(Hackathon, pk=self.kwargs['hackathon_id'])
        if not Participation.objects.filter(user=self.request.user, hackathon=hackathon).exists():
            raise ValidationError('이 해커톤에 참가 중인 사용자만 할 일을 남길 수 있어요.')
        serializer.save(user=self.request.user, hackathon=hackathon)


class TodoItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TodoItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # 본인 항목만 보이게 좁혀서 남의 것은 404로 처리
        return TodoItem.objects.filter(user=self.request.user)


# ─── 참가자 수동 추가 ─────────────────────────────────────────────────────────


class ManualParticipantListCreateView(generics.ListCreateAPIView):
    serializer_class = ManualParticipantSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ManualParticipant.objects.filter(
            hackathon_id=self.kwargs['hackathon_id'], added_by=self.request.user,
        ).select_related('user')

    def create(self, request, *args, **kwargs):
        hackathon = get_object_or_404(Hackathon, pk=self.kwargs['hackathon_id'])
        phone = (request.data.get('phone') or '').strip()
        name = (request.data.get('name') or '').strip()
        email = (request.data.get('email') or '').strip()

        if not phone:
            raise ValidationError({'phone': '전화번호를 입력해주세요.'})

        # 사이트 회원이면 회원 정보로, 아니면 입력받은 이름/이메일로 추가한다.
        matched_profile = Profile.objects.filter(phone=phone).select_related('user').first()

        if matched_profile:
            member = matched_profile.user
            participant, _ = ManualParticipant.objects.update_or_create(
                hackathon=hackathon, added_by=request.user, phone=phone,
                defaults={'user': member, 'name': member.name, 'email': member.email},
            )
        else:
            if not name or not email:
                # 프론트가 이 코드를 보고 이름/이메일 입력 UI를 추가로 보여준다
                raise ValidationError({'not_member': '사이트 회원이 아니에요. 이름과 이메일을 입력해주세요.'})
            participant, _ = ManualParticipant.objects.update_or_create(
                hackathon=hackathon, added_by=request.user, phone=phone,
                defaults={'user': None, 'name': name, 'email': email},
            )

        return Response(ManualParticipantSerializer(participant).data, status=201)


class ManualParticipantDeleteView(generics.DestroyAPIView):
    serializer_class = ManualParticipantSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ManualParticipant.objects.filter(added_by=self.request.user)


# ─── 메타 / 통계 ──────────────────────────────────────────────────────────────
# 아직 관리자가 편집할 필요가 없는 고정 선택지라 모델 없이 상수로 둔다.
# 나중에 운영진이 직접 늘리고 싶어지면 그때 DB 테이블로 옮긴다.

META_OPTIONS = {
    'categories': ['전체', 'AI', '모바일', '클라우드', 'DevOps'],
    'roles': ['기획', '디자인', '백엔드', '프론트엔드', 'AI/ML'],
    'skills': ['Django', 'React', 'Figma', 'Python', 'TypeScript', 'Node.js'],
    'available_times': ['평일 저녁', '주말 위주', '주말 올인', '자유'],
    'regions': ['서울', '경기', '온라인'],
    'goals': ['수상 목적', '포트폴리오', '경험'],
    'collaborations': ['오프라인 위주', '온라인 위주', '혼합'],
    'communications': ['직설적 피드백 선호', '부드러운 소통 선호', '상관없음'],
    'interests': ['AI', '핀테크', '헬스케어', '커리어', '소셜'],
    'recruit_statuses': ['모집 중', '매칭 완료', '재모집', '모집 마감', '비공개'],
}


class MetaOptionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(META_OPTIONS)


class LandingStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            'total_participants': Participation.objects.count(),
            'recruiting_teams': Team.objects.filter(recruit_status=Team.RecruitStatus.RECRUITING).count(),
            'active_hackathons': Hackathon.objects.filter(status=Hackathon.Status.RECRUITING).count(),
            # 평점/리뷰 기능이 없어 임시 고정값. 나중에 실제 데이터 소스가 생기면 교체.
            'satisfaction_rate': 92,
        })
