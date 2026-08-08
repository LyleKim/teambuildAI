from rest_framework import serializers

from hackathons.serializers import HackathonRefSerializer

from .models import CoffeeChat


class CoffeeChatPersonSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    initial = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    def get_initial(self, user):
        return user.name[:1] if user.name else '?'

    def get_role(self, user):
        profile = getattr(user, 'profile', None)
        return profile.roles[0] if profile and profile.roles else ''


class CoffeeChatSerializer(serializers.ModelSerializer):
    """받은 신청이면 counterpart=보낸 사람, 보낸 신청이면 counterpart=받는 사람으로 보여준다."""

    counterpart = serializers.SerializerMethodField()
    hackathon = HackathonRefSerializer(read_only=True)
    thread_id = serializers.IntegerField(source='thread.id', read_only=True, default=None)

    class Meta:
        model = CoffeeChat
        fields = ['id', 'counterpart', 'hackathon', 'message', 'status', 'created_at', 'thread_id']

    def get_counterpart(self, obj):
        request = self.context['request']
        other = obj.receiver if obj.sender_id == request.user.id else obj.sender
        return CoffeeChatPersonSerializer(other).data
