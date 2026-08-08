from django.urls import path

from . import views

urlpatterns = [
    path('hackathons/', views.HackathonListView.as_view()),
    path('hackathons/<int:pk>/', views.HackathonDetailView.as_view()),
    path('hackathons/<int:hackathon_id>/participations/', views.ParticipationCreateView.as_view()),
    path('hackathons/<int:hackathon_id>/teams/', views.TeamCreateView.as_view()),

    path('me/participations/', views.MyParticipationListView.as_view()),
    path('participations/<int:pk>/', views.ParticipationDestroyView.as_view()),

    path('teams/<int:pk>/', views.TeamDetailView.as_view()),

    path('meta/options/', views.MetaOptionsView.as_view()),
    path('stats/landing/', views.LandingStatsView.as_view()),
]
