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
        fields = [
            'id', 'counterpart', 'hackathon', 'message', 'sender_contact', 'status',
            'created_at', 'thread_id',
        ]

    def get_counterpart(self, obj):
        request = self.context['request']
        other = obj.receiver if obj.sender_id == request.user.id else obj.sender
        return CoffeeChatPersonSerializer(other).data


class TeammateSerializer(CoffeeChatSerializer):
    """수락된(진행중/완료 포함) 커피챗을 '팀원' 관점으로 보여줄 때 쓴다. 내가 이미
    남긴 리뷰가 있으면 함께 내려서 프론트가 '작성하기'/'수정하기'를 구분하게 한다."""

    my_review = serializers.SerializerMethodField()

    class Meta(CoffeeChatSerializer.Meta):
        fields = CoffeeChatSerializer.Meta.fields + ['my_review']

    def get_my_review(self, obj):
        from reviews.models import Review  # 앱 간 순환 임포트 방지용 지역 import

        request = self.context['request']
        counterpart_id = obj.receiver_id if obj.sender_id == request.user.id else obj.sender_id
        review = Review.objects.filter(
            hackathon=obj.hackathon, reviewer=request.user, reviewee_id=counterpart_id,
        ).first()
        if not review:
            return None
        return {'rating': review.rating, 'content': review.content}
