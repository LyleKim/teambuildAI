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
