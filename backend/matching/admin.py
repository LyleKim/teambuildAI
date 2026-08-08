from django.contrib import admin

from .models import Recommendation, RecommendationJob


@admin.register(RecommendationJob)
class RecommendationJobAdmin(admin.ModelAdmin):
    list_display = ('job_id', 'user', 'hackathon', 'status', 'created_at')
    list_filter = ('status',)


@admin.register(Recommendation)
class RecommendationAdmin(admin.ModelAdmin):
    list_display = ('requester', 'hackathon', 'target', 'score', 'created_at')
    list_filter = ('hackathon',)
    search_fields = ('requester__email', 'target__email')
