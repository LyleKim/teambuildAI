import datetime

from django.test import override_settings
from rest_framework.test import APITestCase

from accounts.models import Profile, User
from hackathons.models import Hackathon, Participation

from .models import Recommendation


def _profile(user, roles, goal, skills=None, is_private=False):
    return Profile.objects.create(
        user=user, roles=roles, goal=goal, skills=skills or [], is_private=is_private,
    )


@override_settings(GROQ_API_KEY='')  # 로컬 .env에 실키가 있어도 템플릿 폴백 경로를 결정적으로 테스트한다.
class RecommendationCategoryBranchTests(APITestCase):
    """target_category에 따른 같은 역할군(스코어링)/다른 역할군(랜덤+goal 매칭) 분기."""

    def setUp(self):
        self.requester = User.objects.create_user(email='me@x.com', name='나', password='x')
        _profile(self.requester, roles=['백엔드'], goal='수상 목적', skills=['Django'])

        self.hackathon = Hackathon.objects.create(
            title='테스트 해커톤', category='AI',
            start_date=datetime.date.today(), end_date=datetime.date.today(),
        )
        Participation.objects.create(user=self.requester, hackathon=self.hackathon, join_type='individual')

        # 같은 역할군(dev), 스킬은 겹치지 않아 보완 가점을 받는다.
        self.same_category = User.objects.create_user(email='dev@x.com', name='개발자', password='x')
        _profile(self.same_category, roles=['프론트엔드'], goal='포트폴리오용', skills=['React', 'TypeScript'])
        Participation.objects.create(user=self.same_category, hackathon=self.hackathon, join_type='individual')

        # 다른 역할군(design), 목표가 나와 같음 -> target_category='design'일 때 나와야 함.
        self.other_category_same_goal = User.objects.create_user(email='designer@x.com', name='디자이너', password='x')
        _profile(self.other_category_same_goal, roles=['디자인'], goal='수상 목적', skills=['Figma'])
        Participation.objects.create(
            user=self.other_category_same_goal, hackathon=self.hackathon, join_type='individual',
        )

        # 다른 역할군(design), 목표가 달라 -> target_category='design'이어도 제외돼야 함.
        self.other_category_diff_goal = User.objects.create_user(email='designer2@x.com', name='디자이너2', password='x')
        _profile(self.other_category_diff_goal, roles=['디자인'], goal='포트폴리오용', skills=['Zeplin'])
        Participation.objects.create(
            user=self.other_category_diff_goal, hackathon=self.hackathon, join_type='individual',
        )

        self.client.force_authenticate(self.requester)

    def _generate(self, target_category=None):
        payload = {'target_category': target_category} if target_category else {}
        res = self.client.post(f'/api/v1/hackathons/{self.hackathon.id}/recommendations/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        return Recommendation.objects.filter(requester=self.requester, hackathon=self.hackathon)

    def test_default_category_scores_via_score_pair_with_ai_texts_empty(self):
        recs = self._generate()
        self.assertEqual(list(recs.values_list('target__email', flat=True)), ['dev@x.com'])
        rec = recs.get()
        self.assertFalse(rec.ai_generated)  # GROQ_API_KEY 없음 -> 템플릿 폴백
        self.assertTrue(rec.fit_points)  # score_pair가 채운 템플릿 문구

    def test_other_category_filters_by_goal_and_skips_ai_reason(self):
        recs = self._generate(target_category='design')
        self.assertEqual(list(recs.values_list('target__email', flat=True)), ['designer@x.com'])
        rec = recs.get()
        self.assertFalse(rec.ai_generated)
        self.assertEqual(rec.fit_points, '')
        self.assertEqual(rec.reason, '')
        self.assertTrue(0 <= rec.score <= 100)
