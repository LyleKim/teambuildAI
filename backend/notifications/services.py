"""
다른 앱(coffeechat 등)이 알림을 만들 때 거치는 창구.
모델을 직접 만지지 않고 이 함수 하나로 통일해서 text/target 조합 실수를 줄인다.
"""
from .models import Notification


def notify(user, type_, text, target, target_id=None):
    return Notification.objects.create(
        user=user, type=type_, text=text, target=target, target_id=target_id,
    )
