"""
더미 매칭 스코어러.

외부 AI(LLM) 연동 전까지 두 프로필의 겹침/보완 정도로 점수와 설명 문구를 만든다.
나중에 진짜 AI로 바꿀 때는 score_pair() 하나만 교체하면 되고, 호출부(views.py)는
그대로 둘 수 있도록 시그니처를 (requester_profile, candidate_profile) -> ScoredMatch로 고정한다.
"""
from dataclasses import dataclass


@dataclass
class ScoredMatch:
    score: int
    fit_points: str
    complement: str
    check_point: str
    reason: str


def score_pair(requester_profile, candidate_profile) -> ScoredMatch:
    score = 0

    requester_roles = set(requester_profile.roles)
    candidate_roles = set(candidate_profile.roles)
    overlap_roles = requester_roles & candidate_roles

    if candidate_roles and not overlap_roles:
        score += 40
        role_text = f"{', '.join(candidate_profile.roles)} 역할이 겹치지 않아 팀 구성이 보완됩니다."
    elif overlap_roles:
        score += 15
        role_text = f"{', '.join(overlap_roles)} 역할이 겹쳐 협업 시 역할 조율이 필요할 수 있어요."
    else:
        role_text = '아직 등록된 역할 정보가 부족해 역할 궁합을 판단하기 어려워요.'

    if requester_profile.available_time and requester_profile.available_time == candidate_profile.available_time:
        score += 15
        time_text = f"'{candidate_profile.available_time}' 활동 시간대가 정확히 일치합니다."
    else:
        time_text = '활동 가능 시간대가 달라 사전 조율이 필요해요.'

    if requester_profile.goal and requester_profile.goal == candidate_profile.goal:
        score += 15
        goal_text = f"참여 목표('{candidate_profile.goal}')가 같아 방향성이 잘 맞아요."
    else:
        goal_text = '참여 목표가 달라 팀 목표를 먼저 맞춰보는 게 좋아요.'

    if requester_profile.collaboration and requester_profile.collaboration == candidate_profile.collaboration:
        score += 10

    shared_interests = set(requester_profile.interests) & set(candidate_profile.interests)
    if shared_interests:
        score += min(10, 5 * len(shared_interests))

    score = max(0, min(100, score))

    if candidate_profile.communication:
        check_point = f'"{candidate_profile.communication}"이므로, 커피챗 시 소통 방식을 미리 맞춰보세요.'
    else:
        check_point = '아직 소통 방식 정보가 없어요. 커피챗에서 직접 확인해보세요.'

    reason = (
        f'역할·활동시간·목표를 종합했을 때 {score}점의 매칭 점수가 나왔어요.'
        if score >= 50
        else f'기본 정보는 등록돼 있지만 겹치는 조건이 적어 {score}점에 그쳤어요.'
    )

    return ScoredMatch(
        score=score,
        fit_points=f'{role_text} {time_text}'.strip(),
        complement=goal_text,
        check_point=check_point,
        reason=reason,
    )
