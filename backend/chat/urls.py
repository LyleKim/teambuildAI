from django.urls import path

from . import views

urlpatterns = [
    path('chats/threads/', views.ChatThreadListView.as_view()),
    path('chats/threads/<int:thread_id>/', views.ChatThreadDetailView.as_view()),
    path('chats/threads/<int:thread_id>/messages/', views.ChatMessageListView.as_view()),
    path('chats/threads/<int:thread_id>/read/', views.ChatMarkReadView.as_view()),
]
