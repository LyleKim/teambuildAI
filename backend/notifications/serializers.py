from rest_framework import serializers

from .formatting import format_relative_time
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    icon = serializers.CharField(read_only=True)
    time = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'type', 'icon', 'text', 'time', 'target', 'target_id', 'read']

    def get_time(self, obj):
        return format_relative_time(obj.created_at)
