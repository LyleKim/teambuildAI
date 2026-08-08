from django.urls import path

from . import auth_views, views

urlpatterns = [
    path('auth/kakao/login/', auth_views.KakaoLoginView.as_view()),
    path('auth/kakao/callback/', auth_views.KakaoCallbackView.as_view()),
    path('auth/me/', auth_views.MeView.as_view()),
    path('auth/me/badges/', auth_views.MeBadgesView.as_view()),
    path('auth/logout/', auth_views.LogoutView.as_view()),

    path('me/profile/', views.MyProfileView.as_view()),
    path('me/profile/privacy/', views.MyProfilePrivacyView.as_view()),
    path('users/<int:user_id>/profile/', views.MemberProfileView.as_view()),
]
