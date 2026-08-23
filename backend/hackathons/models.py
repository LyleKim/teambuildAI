from django.conf import settings
from django.db import models


class Hackathon(models.Model):
    class Status(models.TextChoices):
        RECRUITING = '모집 중', '모집 중'
        CLOSED = '모집 마감', '모집 마감'

    title = models.CharField(max_length=100)
    category = models.CharField(max_length=30)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RECRUITING)
    start_date = models.DateField()
    end_date = models.DateField()
    # 배너 이미지가 없을 때 프론트가 그리는 그라디언트 시작 색
    color = models.CharField(max_length=7, default='#B8D9F5')
    banner_url = models.URLField(blank=True, null=True)
    description = models.TextField(blank=True)
    # 추천/커피챗 기능 테스트용으로 심어둔 해커톤(seed_recommendation_demo 등)을
    # 홈 화면 목록에서만 감추기 위한 플래그. 연결된 테스트 데이터는 그대로 둔다.
    is_demo = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Participation(models.Model):
    class JoinType(models.TextChoices):
        INDIVIDUAL = 'individual', 'individual'
        TEAM = 'team', 'team'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='participations'
    )
    hackathon = models.ForeignKey(Hackathon, on_delete=models.CASCADE, related_name='participations')
    join_type = models.CharField(max_length=20, choices=JoinType.choices)
    # 개인 트랙일 때만 실제로 쓰인다. 팀 트랙은 연결된 Team.recruit_status를
    # serializer에서 그대로 보여주므로 이 필드는 무시된다.
    status = models.CharField(max_length=20, default='모집 중')
    # 모집 상태(recruit_status)와는 별개로, "나는 이 프로젝트를 마쳤다"는 개인 표시.
    # null이면 아직 진행 중. 종료해도 삭제하지 않아 팀원/TDL은 계속 조회할 수 있다.
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'hackathon')

    def __str__(self):
        return f'{self.user} - {self.hackathon} ({self.join_type})'


class Team(models.Model):
    class RecruitStatus(models.TextChoices):
        RECRUITING = '모집 중', '모집 중'
        MATCHED = '매칭 완료', '매칭 완료'
        RE_RECRUITING = '재모집', '재모집'
        CLOSED = '모집 마감', '모집 마감'
        PRIVATE = '비공개', '비공개'

    hackathon = models.ForeignKey(Hackathon, on_delete=models.CASCADE, related_name='teams')
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='teams')
    # 역할명(문자열) -> 인원수. 역할 목록이 meta/options에서 오는 자유 문자열이라
    # 고정 컬럼 대신 JSONField로 둔다.
    current_members = models.JSONField(default=dict, blank=True)
    needed_roles = models.JSONField(default=dict, blank=True)
    message = models.TextField(blank=True)
    collaboration = models.CharField(max_length=30, blank=True)
    communication = models.CharField(max_length=30, blank=True)
    open_chat_link = models.URLField(blank=True)
    recruit_status = models.CharField(
        max_length=20, choices=RecruitStatus.choices, default=RecruitStatus.RECRUITING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('hackathon', 'creator')

    def __str__(self):
        return f'{self.hackathon} 팀 ({self.creator})'


class TodoItem(models.Model):
    """해커톤별 개인 할 일. 정식 팀 멤버십 테이블이 없어 팀 공유가 아니라
    사용자 1명 기준으로 둔다 — 팀원 목록은 수락된 커피챗에서 유추해서 같은 화면에 보여준다."""

    hackathon = models.ForeignKey(Hackathon, on_delete=models.CASCADE, related_name='todo_items')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='todo_items')
    text = models.CharField(max_length=200)
    is_done = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'[{"x" if self.is_done else " "}] {self.text}'


class ManualParticipant(models.Model):
    """AI 매칭/커피챗을 거치지 않고 직접 추가한 참가자. 전화번호로 기존 회원을 찾으면
    user를 연결하고, 없으면 입력받은 이름/이메일만 갖는 비회원 레코드로 남긴다."""

    hackathon = models.ForeignKey(Hackathon, on_delete=models.CASCADE, related_name='manual_participants')
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='manual_participants_added'
    )
    # 사이트 회원이면 채워진다. 회원이어도 탈퇴 등으로 사라질 수 있어 SET_NULL — 그때도
    # 아래 name/email 스냅샷은 남아 있어 참가자 기록 자체는 유지된다.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='manual_participant_entries',
    )
    name = models.CharField(max_length=50)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('hackathon', 'added_by', 'phone')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.phone})'
