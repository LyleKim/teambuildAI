from rest_framework.test import APITestCase

from .models import Profile, User

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


class MyProfileRoleTests(APITestCase):
    """온보딩(역할 선택) 단계에서 쓰는 부분 저장 엔드포인트.

    PUT /me/profile/ 은 자기소개 5개 필드가 전부 필수라 이 시점엔 못 쓴다 —
    역할만 먼저 저장하고 나머지는 다음 화면(ProfileSetupScreen)에서 채운다.
    """

    def setUp(self):
        self.me = User.objects.create_user(email='me@x.com', name='나', password='x')
        self.client.force_authenticate(self.me)

    def test_saves_roles_and_creates_profile_if_missing(self):
        res = self.client.patch('/api/v1/me/profile/role/', {'roles': ['디자인']}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['roles'], ['디자인'])
        self.assertEqual(Profile.objects.get(user=self.me).roles, ['디자인'])

    def test_updates_roles_on_existing_profile(self):
        Profile.objects.create(user=self.me, roles=['백엔드'])
        res = self.client.patch('/api/v1/me/profile/role/', {'roles': ['프론트엔드', 'AI/ML']}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Profile.objects.get(user=self.me).roles, ['프론트엔드', 'AI/ML'])

    def test_rejects_empty_roles(self):
        res = self.client.patch('/api/v1/me/profile/role/', {'roles': []}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_rejects_missing_roles(self):
        res = self.client.patch('/api/v1/me/profile/role/', {}, format='json')
        self.assertEqual(res.status_code, 400)


class MemberProfileVisibilityTests(APITestCase):
    """비공개(is_private) 프로필은 본인 외엔 존재 자체를 404로 숨긴다."""

    def setUp(self):
        self.me = User.objects.create_user(email='me@x.com', name='나', password='x')
        self.stranger = User.objects.create_user(email='stranger@x.com', name='제3자', password='x')
        Profile.objects.create(user=self.stranger, is_private=True, roles=['디자인'])
        self.client.force_authenticate(self.me)

    def test_private_profile_hidden_from_others(self):
        res = self.client.get(f'/api/v1/users/{self.stranger.id}/profile/')
        self.assertEqual(res.status_code, 404)

    def test_private_profile_visible_to_self(self):
        self.client.force_authenticate(self.stranger)
        res = self.client.get(f'/api/v1/users/{self.stranger.id}/profile/')
        self.assertEqual(res.status_code, 200)
