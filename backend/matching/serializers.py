from rest_framework import serializers

from .models import Recommendation, RecommendationJob


class RecommendedPersonSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    initial = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    skills = serializers.SerializerMethodField()
    review_summary = serializers.SerializerMethodField()

    def get_initial(self, user):
        return user.name[:1] if user.name else '?'

    def get_roles(self, user):
        profile = getattr(user, 'profile', None)
        return profile.roles if profile else []

    def get_skills(self, user):
        profile = getattr(user, 'profile', None)
        return profile.skills if profile else []

    def get_review_summary(self, user):
        from reviews.services import review_summary  # 앱 간 순환 임포트 방지용 지역 import

        return review_summary(user)


class RecommendationSerializer(serializers.ModelSerializer):
    person = RecommendedPersonSerializer(source='target', read_only=True)
    coffeechat_sent = serializers.SerializerMethodField()

    class Meta:
        model = Recommendation
        fields = ['id', 'person', 'score', 'fit_points', 'complement', 'check_point', 'reason', 'coffeechat_sent']

    def get_coffeechat_sent(self, obj):
        from coffeechat.models import CoffeeChat  # 앱 간 순환 임포트 방지용 지역 import

        # Recommendation은 hackathon을 들고 있어서 accounts 쪽 스텁과 달리
        # "이 해커톤에서" 보냈는지까지 정확히 좁혀 판단할 수 있다.
        return CoffeeChat.objects.filter(
            sender=obj.requester, receiver=obj.target, hackathon=obj.hackathon,
        ).exists()


class RecommendationJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecommendationJob
        fields = ['job_id', 'status']
