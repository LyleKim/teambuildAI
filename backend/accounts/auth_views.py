import secrets
from urllib.parse import urlencode, urlparse

from django.conf import settings
from django.db.models import Q
from django.http import HttpResponseRedirect
from django.shortcuts import redirect
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from chat.models import ChatMessage
from notifications.models import Notification

from . import kakao_client
from .models import User


def _is_allowed_redirect(uri: str) -> bool:
    """redirect_uri를 검증 안 하면 JWT가 실린 리다이렉트를 아무 외부 주소로나
    보낼 수 있는 open redirect가 된다 — 우리 프론트 origin만 허용한다."""
    parsed = urlparse(uri)
    origin = f'{parsed.scheme}://{parsed.netloc}'
    return origin in settings.FRONTEND_ORIGINS


class KakaoLoginView(APIView):
    """
    '카카오로 시작하기'를 누르면 프론트가 전체 페이지 이동으로 여기에 온다.
    로그인 완료 후 돌아갈 프론트 주소(redirect_uri)와 CSRF 방지용 state를
    세션에 잠깐 저장해두고 카카오 인가 화면으로 보낸다.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        redirect_uri = request.query_params.get('redirect_uri')
        if not redirect_uri or not _is_allowed_redirect(redirect_uri):
            return Response({'detail': '허용되지 않은 redirect_uri입니다.'}, status=400)

        state = secrets.token_urlsafe(24)
        request.session['kakao_oauth_state'] = state
        request.session['kakao_oauth_redirect_uri'] = redirect_uri

        return HttpResponseRedirect(kakao_client.build_authorize_url(state))


class KakaoCallbackView(APIView):
    """
    카카오가 사용자를 여기로 돌려보낸다. code를 우리 JWT로 바꿔서
    프론트의 콜백 화면(#/auth/callback?access=&refresh=)으로 다시 리다이렉트한다.
    이 뷰 자체는 프론트에 아무것도 JSON으로 응답하지 않는다 — 항상 리다이렉트.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get('code')
        state = request.query_params.get('state')
        error = request.query_params.get('error')

        redirect_uri = request.session.pop('kakao_oauth_redirect_uri', None)
        expected_state = request.session.pop('kakao_oauth_state', None)

        if not redirect_uri:
            # 세션이 끊겼다(다른 브라우저로 열었거나 너무 오래 걸림) — 보낼 곳이 없어
            # 리다이렉트가 아니라 에러 응답으로 끝낸다.
            return Response({'detail': '로그인 세션이 만료됐어요. 다시 시도해주세요.'}, status=400)

        if error or not code or state != expected_state:
            return redirect(f'{redirect_uri}?{urlencode({"error": "kakao_oauth_failed"})}')

        try:
            kakao_access_token = kakao_client.exchange_code_for_token(code)
            kakao_user = kakao_client.fetch_kakao_user(kakao_access_token)
        except Exception:
            return redirect(f'{redirect_uri}?{urlencode({"error": "kakao_oauth_failed"})}')

        kakao_id = str(kakao_user['id'])
        account = kakao_user.get('kakao_account', {})
        profile = account.get('profile', {})

        name = profile.get('nickname') or f'카카오사용자{kakao_id[-4:]}'
        avatar_url = profile.get('profile_image_url') or ''
        # 닉네임 동의는 기본이지만 이메일 동의는 비즈 앱 전환 등 추가 절차가 필요해서
        # 안 올 수도 있다 — 그 경우 kakao_id 기반 플레이스홀더로 유니크 제약만 만족시킨다.
        email = account.get('email') or f'kakao_{kakao_id}@placeholder.local'

        user, created = User.objects.get_or_create(
            kakao_id=kakao_id,
            defaults={'name': name, 'avatar_url': avatar_url, 'email': email},
        )
        if not created:
            # 닉네임/프로필사진은 카카오 쪽이 최신이므로 로그인할 때마다 동기화.
            # email은 최초 가입 시 값을 그대로 유지한다(계정 병합 등 복잡한 케이스 방지).
            user.name = name
            user.avatar_url = avatar_url
            user.save(update_fields=['name', 'avatar_url'])

        refresh = RefreshToken.for_user(user)
        query = urlencode({'access': str(refresh.access_token), 'refresh': str(refresh)})
        return redirect(f'{redirect_uri}?{query}')


def _badges_for(user):
    return {
        'unread_notification_count': Notification.objects.filter(user=user, read=False).count(),
        'unread_message_count': ChatMessage.objects.filter(
            Q(thread__user_a=user) | Q(thread__user_b=user),
            read_at__isnull=True,
        ).exclude(sender=user).count(),
    }


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = getattr(user, 'profile', None)

        summary = None
        if profile:
            parts = [
                profile.roles[0] if profile.roles else None,
                '/'.join(profile.skills) if profile.skills else None,
                profile.available_time or None,
                profile.goal or None,
            ]
            summary = ' · '.join(p for p in parts if p) or None

        return Response({
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'initial': user.name[:1] if user.name else '?',
            'avatar_url': user.avatar_url or None,
            'summary': summary,
            'is_private': profile.is_private if profile else False,
            'badges': _badges_for(user),
        })


class MeBadgesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(_badges_for(request.user))


class LogoutView(APIView):
    """
    JWT는 서버가 상태를 안 들고 있어(stateless) 만료 전에 강제로 무효화할 방법이
    기본적으로 없다 (SimpleJWT의 token_blacklist 앱을 추가하면 가능하지만
    지금은 access 토큰 수명이 30분으로 짧아 굳이 그 복잡도를 더하지 않았다).
    그래서 여기선 실질적으로 클라이언트가 토큰을 버리는 것으로 로그아웃이 끝나고,
    이 엔드포인트는 프론트 계약(POST /auth/logout/ -> 204)을 맞추기 위해 존재한다.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response(status=204)
