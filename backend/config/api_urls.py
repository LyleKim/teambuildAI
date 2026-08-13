"""
/api/v1/ 아래 라우트를 모아두는 곳.
각 앱이 만들어지면 여기에 path('hackathons/', include('hackathons.urls')) 식으로 추가한다.
"""
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # 프론트엔드 api/client.ts가 401 시 자동으로 호출하는 경로.
    # {refresh} -> {access} 형태는 SimpleJWT 기본 응답 그대로 쓴다.
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('', include('hackathons.urls')),
    path('', include('accounts.urls')),
    path('', include('matching.urls')),
    path('', include('chat.urls')),
    path('', include('coffeechat.urls')),
    path('', include('notifications.urls')),
    path('', include('reviews.urls')),
]
