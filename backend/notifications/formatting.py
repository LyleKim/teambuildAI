"""알림 목록에 찍히는 상대 시간 표시 ('방금 전' / '10분 전' / '어제' 등)."""
from django.utils import timezone


def format_relative_time(dt):
    now = timezone.now()
    seconds = (now - dt).total_seconds()

    if seconds < 60:
        return '방금 전'

    minutes = int(seconds // 60)
    if minutes < 60:
        return f'{minutes}분 전'

    hours = int(minutes // 60)
    if hours < 24:
        return f'{hours}시간 전'

    days = int(hours // 24)
    if days == 1:
        return '어제'
    if days < 7:
        return f'{days}일 전'

    return timezone.localtime(dt).date().strftime('%Y.%m.%d')
