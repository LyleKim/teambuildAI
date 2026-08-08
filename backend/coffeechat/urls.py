from django.urls import path

from . import views

urlpatterns = [
    path('coffeechats/', views.CoffeeChatCreateView.as_view()),
    path('coffeechats/received/', views.CoffeeChatReceivedListView.as_view()),
    path('coffeechats/sent/', views.CoffeeChatSentListView.as_view()),
    path('coffeechats/<int:coffeechat_id>/accept/', views.CoffeeChatAcceptView.as_view()),
    path('coffeechats/<int:coffeechat_id>/reject/', views.CoffeeChatRejectView.as_view()),
    path('coffeechats/<int:pk>/', views.CoffeeChatDetailView.as_view()),
]
