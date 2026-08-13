from django.conf import settings
from django.db import models

from hackathons.models import Hackathon


class Review(models.Model):
    """같은 해커톤에서 커피챗이 수락된(협업한) 상대에게 남기는 리뷰.
    한 해커톤에서 같은 상대에게는 하나만 존재 — 다시 작성하면 upsert로 덮어쓴다."""

    hackathon = models.ForeignKey(Hackathon, on_delete=models.CASCADE, related_name='reviews')
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews_written'
    )
    reviewee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews_received'
    )
    rating = models.PositiveSmallIntegerField()
    content = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('hackathon', 'reviewer', 'reviewee')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.reviewer} -> {self.reviewee} ({self.rating}점)'
