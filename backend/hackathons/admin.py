from django.contrib import admin

from .models import Hackathon, Participation, Team


@admin.register(Hackathon)
class HackathonAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'status', 'start_date', 'end_date')
    list_filter = ('category', 'status')
    search_fields = ('title',)


@admin.register(Participation)
class ParticipationAdmin(admin.ModelAdmin):
    list_display = ('user', 'hackathon', 'join_type', 'status', 'created_at')
    list_filter = ('join_type',)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('hackathon', 'creator', 'recruit_status', 'updated_at')
    list_filter = ('recruit_status',)
