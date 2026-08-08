from django.urls import path

from . import views

urlpatterns = [
    path('hackathons/<int:hackathon_id>/recommendations/', views.RecommendationView.as_view()),
    path('recommendations/<uuid:job_id>/status/', views.RecommendationJobStatusView.as_view()),
]
