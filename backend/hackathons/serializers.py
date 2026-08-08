from rest_framework import serializers

from .models import Hackathon, Participation, Team


class HackathonRefSerializer(serializers.ModelSerializer):
    """Participation/Team이 물고 있는 해커톤을 {id, title}만 가볍게 보여줄 때 쓴다."""

    class Meta:
        model = Hackathon
        fields = ['id', 'title']


class HackathonSerializer(serializers.ModelSerializer):
    date = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()
    teams = serializers.SerializerMethodField()

    class Meta:
        model = Hackathon
        fields = [
            'id', 'title', 'category', 'status', 'date',
            'start_date', 'end_date', 'participants', 'teams',
            'color', 'banner_url', 'description',
        ]

    def get_date(self, obj):
        return f'{obj.start_date:%m.%d} ~ {obj.end_date:%m.%d}'

    def get_participants(self, obj):
        return obj.participations.filter(join_type=Participation.JoinType.INDIVIDUAL).count()

    def get_teams(self, obj):
        return obj.teams.count()


class ParticipationSerializer(serializers.ModelSerializer):
    hackathon = HackathonRefSerializer(read_only=True)
    status = serializers.SerializerMethodField()
    team_id = serializers.SerializerMethodField()

    class Meta:
        model = Participation
        fields = ['id', 'hackathon', 'join_type', 'status', 'team_id']
        read_only_fields = ['id', 'hackathon', 'status', 'team_id']

    def _team(self, obj):
        """팀 트랙일 때만 연결된 Team을 찾는다. 요청 1건당 한 번만 조회하도록 캐싱."""
        if obj.join_type != Participation.JoinType.TEAM:
            return None
        if not hasattr(obj, '_team_cache'):
            obj._team_cache = Team.objects.filter(hackathon=obj.hackathon, creator=obj.user).first()
        return obj._team_cache

    def get_status(self, obj):
        team = self._team(obj)
        return team.recruit_status if team else obj.status

    def get_team_id(self, obj):
        team = self._team(obj)
        return team.id if team else None


class TeamSerializer(serializers.ModelSerializer):
    hackathon = HackathonRefSerializer(read_only=True)

    class Meta:
        model = Team
        fields = [
            'id', 'hackathon', 'current_members', 'needed_roles',
            'message', 'collaboration', 'communication',
            'open_chat_link', 'recruit_status',
        ]
        read_only_fields = ['id', 'hackathon']
