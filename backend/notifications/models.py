from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        REQUEST = 'request', 'request'
        ACCEPTED = 'accepted', 'accepted'
        REJECTED = 'rejected', 'rejected'
        # 트리거 시점(어떤 이벤트에서 울려야 하는지)이 아직 정해지지 않아
        # 스키마만 준비해두고 자동 생성 훅은 연결하지 않는다.
        RECOMMENDATION = 'recommendation', 'recommendation'

    class Target(models.TextChoices):
        COFFEECHAT_INBOX = 'coffeechat-inbox', 'coffeechat-inbox'
        COFFEECHAT_MATCHED = 'coffeechat-matched', 'coffeechat-matched'
        AI_RESULTS = 'ai-results', 'ai-results'
        MESSAGES = 'messages', 'messages'
        MEMBER_PROFILE = 'member-profile', 'member-profile'

    ICONS = {
        Type.REQUEST: '☕',
        Type.ACCEPTED: '✅',
        Type.REJECTED: '❌',
        Type.RECOMMENDATION: '✨',
    }

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=Type.choices)
    text = models.CharField(max_length=200)
    target = models.CharField(max_length=20, choices=Target.choices)
    target_id = models.PositiveIntegerField(null=True, blank=True)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def icon(self):
        return self.ICONS.get(self.type, '🔔')

    def __str__(self):
        return f'{self.user}: {self.text}'
