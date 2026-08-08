"""
카카오 OAuth 연동용 얇은 HTTP 클라이언트.

KAKAO_REST_API_KEY 등이 아직 .env에 없어도 이 모듈 자체는 정상 임포트/동작한다 —
실제로 카카오에 요청을 보내는 시점에 카카오 쪽이 400/401로 거부할 뿐이라,
"키 없음"과 "코드 버그"를 구분하기 쉽다.
"""
from urllib.parse import urlencode

import httpx
from django.conf import settings

KAUTH_BASE = 'https://kauth.kakao.com'
KAPI_BASE = 'https://kapi.kakao.com'


def build_authorize_url(state: str) -> str:
    """사용자를 이 URL로 리다이렉트하면 카카오 로그인/동의 화면이 뜬다."""
    params = {
        'client_id': settings.KAKAO_REST_API_KEY,
        'redirect_uri': settings.KAKAO_REDIRECT_URI,
        'response_type': 'code',
        'state': state,
    }
    return f'{KAUTH_BASE}/oauth/authorize?{urlencode(params)}'


def exchange_code_for_token(code: str) -> str:
    """인가 코드를 카카오 access_token으로 교환한다. 실패하면 예외를 던진다."""
    response = httpx.post(
        f'{KAUTH_BASE}/oauth/token',
        data={
            'grant_type': 'authorization_code',
            'client_id': settings.KAKAO_REST_API_KEY,
            'client_secret': settings.KAKAO_CLIENT_SECRET,
            'redirect_uri': settings.KAKAO_REDIRECT_URI,
            'code': code,
        },
        headers={'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'},
        timeout=5,
    )
    response.raise_for_status()
    return response.json()['access_token']


def fetch_kakao_user(kakao_access_token: str) -> dict:
    """카카오 access_token으로 프로필(닉네임/이메일 등)을 가져온다."""
    response = httpx.get(
        f'{KAPI_BASE}/v2/user/me',
        headers={'Authorization': f'Bearer {kakao_access_token}'},
        timeout=5,
    )
    response.raise_for_status()
    return response.json()
