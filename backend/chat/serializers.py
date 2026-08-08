from rest_framework import serializers

from .formatting import format_date, format_time


class ChatThreadSerializer(serializers.Serializer):
    """
    ChatThread는 참가자가 나/상대 구분 없이 user_a/user_b로만 저장되는데,
    응답은 항상 "보는 사람 기준 상대방" 하나만 노출해야 해서 SerializerMethodField로
    매번 요청자 기준으로 계산한다.
    """

    id = serializers.IntegerField()
    person_id = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    initial = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    hackathon = serializers.CharField(source='hackathon.title')
    last_message = serializers.SerializerMethodField()
    last_time = serializers.SerializerMethodField()
    unread = serializers.SerializerMethodField()

    def _other(self, obj):
        return obj.other_user(self.context['request'].user)

    def _last_message(self, obj):
        if not hasattr(obj, '_last_message_cache'):
            obj._last_message_cache = obj.messages.order_by('-created_at').first()
        return obj._last_message_cache

    def get_person_id(self, obj):
        return self._other(obj).id

    def get_name(self, obj):
        return self._other(obj).name

    def get_initial(self, obj):
        other = self._other(obj)
        return other.name[:1] if other.name else '?'

    def get_role(self, obj):
        profile = getattr(self._other(obj), 'profile', None)
        return profile.roles[0] if profile and profile.roles else ''

    def get_last_message(self, obj):
        last = self._last_message(obj)
        return last.text if last else ''

    def get_last_time(self, obj):
        last = self._last_message(obj)
        return format_time(last.created_at) if last else ''

    def get_unread(self, obj):
        request = self.context['request']
        return obj.messages.filter(read_at__isnull=True).exclude(sender=request.user).count()


def serialize_message(message, viewer):
    """
    ChatMessage의 'from' 필드가 파이썬 예약어라 DRF Serializer 선언형으로 깔끔하게
    못 쓴다 (to_representation을 오버라이드해야 해서 이 편이 더 간단하다).
    """
    return {
        'id': message.id,
        'from': 'me' if message.sender_id == viewer.id else 'them',
        'text': message.text,
        'time': format_time(message.created_at),
        'date': format_date(message.created_at),
        'created_at': message.created_at.isoformat(),
    }
