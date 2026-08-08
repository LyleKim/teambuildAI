from django.conf import settings
from django.db import models

from hackathons.models import Hackathon


class ChatThread(models.Model):
    """1:1 대화방. 직접 만드는 API는 없고, coffeechat 앱에서 수락 시 자동 생성된다."""

    hackathon = models.ForeignKey(Hackathon, on_delete=models.CASCADE, related_name='chat_threads')
    user_a = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_threads_as_a')
    user_b = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_threads_as_b')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('hackathon', 'user_a', 'user_b')

    def other_user(self, user):
        return self.user_b if self.user_a_id == user.id else self.user_a

    def __str__(self):
        return f'{self.user_a} <-> {self.user_b} ({self.hackathon})'


class ChatMessage(models.Model):
    thread = models.ForeignKey(ChatThread, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_chat_messages'
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    # 상대방(수신자)이 이 메시지를 읽은 시점. null이면 아직 안 읽은 것.
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.sender}: {self.text[:20]}'
