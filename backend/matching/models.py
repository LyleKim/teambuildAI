import uuid

from django.conf import settings
from django.db import models

from hackathons.models import Hackathon


class RecommendationJob(models.Model):
    """
    지금은 요청 안에서 동기적으로 끝나 항상 done/failed로 바로 저장되지만,
    나중에 진짜 비동기 워커(Celery 등)로 바꿔도 프론트가 보는 계약
    (job_id 발급 -> /recommendations/{job_id}/status/ 폴링)은 그대로 유지하기 위해
    처음부터 job 레코드를 둔다.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'pending'
        RUNNING = 'running', 'running'
        DONE = 'done', 'done'
        FAILED = 'failed', 'failed'

    job_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recommendation_jobs'
    )
    hackathon = models.ForeignKey(Hackathon, on_delete=models.CASCADE, related_name='recommendation_jobs')
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'{self.job_id} ({self.status})'


class Recommendation(models.Model):
    """requester가 특정 hackathon에서 받은, target 한 명에 대한 추천 결과 한 건."""

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recommendations_received'
    )
    hackathon = models.ForeignKey(Hackathon, on_delete=models.CASCADE, related_name='recommendations')
    target = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recommendations_appeared_in'
    )
    score = models.PositiveSmallIntegerField()
    fit_points = models.TextField()
    complement = models.TextField()
    check_point = models.TextField()
    reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('requester', 'hackathon', 'target')
        ordering = ['-score']

    def __str__(self):
        return f'{self.requester} -> {self.target} ({self.score}점)'
