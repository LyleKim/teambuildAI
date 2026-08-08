from django.conf import settings
from django.db import models

from hackathons.models import Hackathon


class CoffeeChat(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'pending'
        ACCEPTED = 'accepted', 'accepted'
        REJECTED = 'rejected', 'rejected'

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='coffeechats_sent'
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='coffeechats_received'
    )
    hackathon = models.ForeignKey(Hackathon, on_delete=models.CASCADE, related_name='coffeechats')
    message = models.TextField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    # 수락 시점에 chat 앱이 만든 대화방과 1:1로 연결된다.
    thread = models.OneToOneField(
        'chat.ChatThread', on_delete=models.SET_NULL, null=True, blank=True, related_name='coffeechat'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('sender', 'receiver', 'hackathon')

    def __str__(self):
        return f'{self.sender} -> {self.receiver} ({self.status})'
