from django.urls import path

from . import views

urlpatterns = [
    path('reviews/', views.ReviewCreateView.as_view()),
    path('reviews/received/', views.MyReceivedReviewsView.as_view()),
]
