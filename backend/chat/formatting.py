"""채팅 화면에 그대로 찍히는 한국어 시간 표시 포맷터. chat/coffeechat 양쪽에서 재사용한다."""
from datetime import timedelta

from django.utils import timezone


def format_time(dt):
    """'오전 10:12' / '오후 03:45' 형태."""
    local = timezone.localtime(dt)
    period = '오전' if local.hour < 12 else '오후'
    hour12 = local.hour % 12 or 12
    return f'{period} {hour12:02d}:{local.minute:02d}'


def format_date(dt):
    """오늘/어제는 상대 표기, 그 이전은 'YYYY.MM.DD'."""
    local_date = timezone.localtime(dt).date()
    today = timezone.localdate()
    if local_date == today:
        return '오늘'
    if local_date == today - timedelta(days=1):
        return '어제'
    return local_date.strftime('%Y.%m.%d')
