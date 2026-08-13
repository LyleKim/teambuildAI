from rest_framework.test import APITestCase

from .models import User

VALID_PROFILE = {
    'roles': ['백엔드'],
    'skills': ['Django'],
    'available_time': '주말 올인',
    'regions': ['서울'],
    'goal': '수상 목적',
    'collaboration': '혼합',
    'communication': '상관없음',
    'interests': ['AI'],
    'one_liner': '빠르게 만들고 검증합니다',
    'bio_style': '차분하게 문제를 뜯어봐요',
    'bio_strength': 'API 설계에 강해요',
    'bio_experience': '해커톤 2회 참가',
    'bio_goal': '결제 기능을 구현해보고 싶어요',
    'bio_contribution': '배포까지 책임질 수 있어요',
    'links': [],
    'open_chat': '',
    'phone': '',
    'is_private': False,
}


class MyProfileBioRequiredTests(APITestCase):
    def setUp(self):
        self.me = User.objects.create_user(email='me@x.com', name='나', password='x')
        self.client.force_authenticate(self.me)

    def test_save_succeeds_with_all_bio_fields_filled(self):
        res = self.client.put('/api/v1/me/profile/', VALID_PROFILE, format='json')
        self.assertEqual(res.status_code, 200)

    def test_save_rejected_when_a_bio_field_is_blank(self):
        payload = {**VALID_PROFILE, 'bio_goal': ''}
        res = self.client.put('/api/v1/me/profile/', payload, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('bio_goal', res.data)

    def test_save_rejected_when_a_bio_field_missing(self):
        payload = {k: v for k, v in VALID_PROFILE.items() if k != 'bio_experience'}
        res = self.client.put('/api/v1/me/profile/', payload, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('bio_experience', res.data)
