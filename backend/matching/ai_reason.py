"""
Groq 배치 호출: 이미 점수가 매겨진 후보 중 상위 N명에 대해서만 '추천 이유' 문구를
자연어로 다듬는다. 점수 산정 자체는 여기서 하지 않는다 — scoring.py: score_pair()가
이미 계산한 값을 문장으로 설명만 한다.

"다시 추천받기" 한 번당 Groq 호출을 정확히 1번으로 고정한다(N명을 한 프롬프트에 묶어
한 번에 받음) — 후보 수와 무관하게 사용량을 예측 가능하게 하기 위함.

프로필의 자유 텍스트(자기소개, 포트폴리오 링크, 오픈채팅, 전화번호)는 절대 보내지
않는다. 정량적 필드(역할/기술스택/지역/시간대/목표/협업/소통/관심사)만 프롬프트에
실어 개인정보 노출 범위를 최소화한다.
"""
import json

import httpx
from django.conf import settings

GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

SYSTEM_PROMPT = (
    '너는 해커톤 팀 매칭 서비스의 추천 이유 작성 도우미다. 아래 규칙을 반드시 지켜라.\n'
    '1. 입력으로 주어진 정량 데이터(역할, 기술 스택, 활동 시간, 선호 지역, 목표, 협업/소통 방식, '
    '관심사, 매칭 점수)에 있는 사실만 근거로 사용한다.\n'
    '2. 입력에 없는 정보(학교, 나이, 경력 연차, 성격, 실적 등)는 추측하거나 지어내지 않는다.\n'
    '3. 각 후보마다 fit_points(잘 맞는 점), complement(상호 보완), check_point(체크 포인트), '
    'reason(추천 이유)을 각 1문장씩, 한국어 존댓말로 작성한다.\n'
    '4. 반드시 JSON 객체 하나만 출력한다. 다른 설명이나 텍스트는 출력하지 않는다.\n'
    '출력 형식: {"candidates": [{"id": <숫자>, "fit_points": "...", "complement": "...", '
    '"check_point": "...", "reason": "..."}, ...]}'
)


def _quant_profile(profile):
    """AI에 보낼 정량 필드만 추린다 — 자기소개/링크/연락처는 제외."""
    return {
        'roles': profile.roles,
        'skills': profile.skills,
        'available_time': profile.available_time,
        'regions': profile.regions,
        'goal': profile.goal,
        'collaboration': profile.collaboration,
        'communication': profile.communication,
        'interests': profile.interests,
    }


def generate_ai_reasons(requester_profile, ranked_candidates):
    """
    ranked_candidates: [(target_user, candidate_profile, ScoredMatch), ...] (상위 N명만 넘길 것)
    반환: {target_user.id: {"fit_points": ..., "complement": ..., "check_point": ..., "reason": ...}}
    실패(키 없음/타임아웃/파싱 오류 등)하면 조용히 빈 dict를 반환해 호출부가 템플릿 문구로
    폴백할 수 있게 한다 — 이 함수가 예외를 던지면 추천 전체가 실패해버리기 때문.
    """
    if not settings.GROQ_API_KEY or not ranked_candidates:
        return {}

    user_prompt = json.dumps(
        {
            'requester': _quant_profile(requester_profile),
            'candidates': [
                {'id': user.id, 'profile': _quant_profile(candidate_profile), 'score': match.score}
                for user, candidate_profile, match in ranked_candidates
            ],
        },
        ensure_ascii=False,
    )

    try:
        response = httpx.post(
            GROQ_URL,
            headers={'Authorization': f'Bearer {settings.GROQ_API_KEY}'},
            json={
                'model': settings.GROQ_MODEL,
                'messages': [
                    {'role': 'system', 'content': SYSTEM_PROMPT},
                    {'role': 'user', 'content': user_prompt},
                ],
                'temperature': 0.3,
                'response_format': {'type': 'json_object'},
            },
            timeout=10,
        )
        response.raise_for_status()
        parsed = json.loads(response.json()['choices'][0]['message']['content'])
    except (httpx.HTTPError, KeyError, IndexError, ValueError):
        return {}

    results = {}
    for item in parsed.get('candidates', []):
        try:
            results[int(item['id'])] = {
                'fit_points': str(item['fit_points']),
                'complement': str(item['complement']),
                'check_point': str(item['check_point']),
                'reason': str(item['reason']),
            }
        except (KeyError, TypeError, ValueError):
            continue  # 후보 하나가 형식을 어겨도 나머지는 살린다
    return results
