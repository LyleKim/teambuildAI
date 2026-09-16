import datetime

import yaml
from rest_framework.test import APITestCase

from accounts.models import Profile, User

from .models import Hackathon, ManualParticipant, Participation, TodoItem


class TodoItemTests(APITestCase):
    def setUp(self):
        self.me = User.objects.create_user(email='me@x.com', name='나', password='x')
        self.other = User.objects.create_user(email='other@x.com', name='남', password='x')
        self.hackathon = Hackathon.objects.create(
            title='테스트 해커톤', category='AI',
            start_date=datetime.date.today(), end_date=datetime.date.today(),
        )
        self.client.force_authenticate(self.me)

    def test_create_requires_participation(self):
        res = self.client.post(f'/api/v1/hackathons/{self.hackathon.id}/todos/', {'text': '발표자료 준비'})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(TodoItem.objects.count(), 0)

    def test_create_and_toggle(self):
        Participation.objects.create(user=self.me, hackathon=self.hackathon, join_type='individual')

        res = self.client.post(f'/api/v1/hackathons/{self.hackathon.id}/todos/', {'text': '발표자료 준비'})
        self.assertEqual(res.status_code, 201)
        todo_id = res.data['id']
        self.assertFalse(res.data['is_done'])

        res = self.client.patch(f'/api/v1/todos/{todo_id}/', {'is_done': True})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['is_done'])

    def test_list_scoped_to_owner(self):
        Participation.objects.create(user=self.me, hackathon=self.hackathon, join_type='individual')
        Participation.objects.create(user=self.other, hackathon=self.hackathon, join_type='individual')
        TodoItem.objects.create(hackathon=self.hackathon, user=self.me, text='내 할일')
        TodoItem.objects.create(hackathon=self.hackathon, user=self.other, text='남의 할일')

        res = self.client.get(f'/api/v1/hackathons/{self.hackathon.id}/todos/')
        results = res.data['results']  # ListCreateAPIView라 DRF 기본 페이지네이션이 적용된다
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['text'], '내 할일')

    def test_cannot_touch_others_item(self):
        Participation.objects.create(user=self.other, hackathon=self.hackathon, join_type='individual')
        other_todo = TodoItem.objects.create(hackathon=self.hackathon, user=self.other, text='남의 할일')

        res = self.client.delete(f'/api/v1/todos/{other_todo.id}/')
        self.assertEqual(res.status_code, 404)
        self.assertTrue(TodoItem.objects.filter(id=other_todo.id).exists())


class ParticipationEndTests(APITestCase):
    def setUp(self):
        self.me = User.objects.create_user(email='me@x.com', name='나', password='x')
        self.other = User.objects.create_user(email='other@x.com', name='남', password='x')
        self.hackathon = Hackathon.objects.create(
            title='테스트 해커톤', category='AI',
            start_date=datetime.date.today(), end_date=datetime.date.today(),
        )
        self.participation = Participation.objects.create(
            user=self.me, hackathon=self.hackathon, join_type='individual',
        )
        self.client.force_authenticate(self.me)

    def test_end_sets_timestamp_without_deleting(self):
        res = self.client.patch(f'/api/v1/participations/{self.participation.id}/end/')
        self.assertEqual(res.status_code, 200)
        self.assertIsNotNone(res.data['ended_at'])
        self.assertTrue(Participation.objects.filter(id=self.participation.id).exists())

    def test_end_is_idempotent(self):
        self.client.patch(f'/api/v1/participations/{self.participation.id}/end/')
        first = Participation.objects.get(id=self.participation.id).ended_at

        res = self.client.patch(f'/api/v1/participations/{self.participation.id}/end/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Participation.objects.get(id=self.participation.id).ended_at, first)

    def test_cannot_end_others_participation(self):
        self.client.force_authenticate(self.other)
        res = self.client.patch(f'/api/v1/participations/{self.participation.id}/end/')
        self.assertEqual(res.status_code, 404)
        self.assertIsNone(Participation.objects.get(id=self.participation.id).ended_at)


class ManualParticipantTests(APITestCase):
    def setUp(self):
        self.me = User.objects.create_user(email='me@x.com', name='나', password='x')
        self.member = User.objects.create_user(email='member@x.com', name='회원임', password='x')
        Profile.objects.create(user=self.member, phone='010-1234-5678')
        self.hackathon = Hackathon.objects.create(
            title='테스트 해커톤', category='AI',
            start_date=datetime.date.today(), end_date=datetime.date.today(),
        )
        self.client.force_authenticate(self.me)

    def _url(self):
        return f'/api/v1/hackathons/{self.hackathon.id}/participants/manual/'

    def test_matches_existing_member_by_phone(self):
        res = self.client.post(self._url(), {'phone': '010-1234-5678'})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['user_id'], self.member.id)
        self.assertTrue(res.data['is_member'])
        self.assertEqual(res.data['name'], '회원임')

        # 같은 전화번호로 다시 추가하면 새로 만들지 않고 덮어쓴다 -> 200 (created 아님)
        res = self.client.post(self._url(), {'phone': '010-1234-5678'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(ManualParticipant.objects.count(), 1)

    def test_unknown_phone_requires_name_and_email(self):
        res = self.client.post(self._url(), {'phone': '010-9999-0000'})
        self.assertEqual(res.status_code, 400)
        self.assertIn('not_member', res.data)
        self.assertEqual(ManualParticipant.objects.count(), 0)

        res = self.client.post(self._url(), {
            'phone': '010-9999-0000', 'name': '비회원', 'email': 'nonmember@x.com',
        })
        self.assertEqual(res.status_code, 201)
        self.assertIsNone(res.data['user_id'])
        self.assertFalse(res.data['is_member'])

    def test_list_scoped_to_adder_and_delete_ownership(self):
        self.client.post(self._url(), {'phone': '010-1234-5678'})
        self.client.force_authenticate(self.member)
        res = self.client.get(self._url())
        self.assertEqual(len(res.data['results']), 0)  # member는 추가한 사람이 아니다

        self.client.force_authenticate(self.me)
        res = self.client.get(self._url())
        added_id = res.data['results'][0]['id']

        self.client.force_authenticate(self.member)
        res = self.client.delete(f'/api/v1/participants/manual/{added_id}/')
        self.assertEqual(res.status_code, 404)  # 내가 추가한 게 아니면 못 지운다


class MetaOptionsTests(APITestCase):
    def test_role_categories_and_bucketed_skills_are_exposed(self):
        res = self.client.get('/api/v1/meta/options/')
        self.assertEqual(res.status_code, 200)

        self.assertEqual(res.data['role_categories']['백엔드'], 'dev')
        self.assertEqual(res.data['role_categories']['프론트엔드'], 'dev')
        self.assertEqual(res.data['role_categories']['AI/ML'], 'dev')
        self.assertEqual(res.data['role_categories']['디자인'], 'design')
        self.assertEqual(res.data['role_categories']['기획'], 'planning')

        self.assertIn('Figma', res.data['skills_by_role_category']['design'])
        self.assertIn('Notion', res.data['skills_by_role_category']['planning'])
        self.assertIn('Django', res.data['skills_by_role_category']['dev'])

        # 하위 호환: 통합 skills 리스트도 여전히 내려간다 (역할 미선택 상태의 폴백용)
        self.assertIn('Django', res.data['skills'])
        self.assertIn('Figma', res.data['skills'])
        self.assertIn('Notion', res.data['skills'])

        self.assertEqual(set(res.data['role_categories']), set(res.data['roles']))
        self.assertEqual(
            set(res.data['role_categories'].values()), set(res.data['skills_by_role_category']),
        )


class OpenAPISchemaTests(APITestCase):
    """@extend_schema 애노테이션이 잘못돼 스키마 생성 자체가 깨지는 걸 잡아내는 스모크 테스트.
    (예: inline_serializer가 이미 인스턴스인데 다시 호출하는 실수 등)"""

    def test_schema_and_docs_render(self):
        for url in ('/api/schema/', '/api/docs/', '/api/redoc/'):
            res = self.client.get(url)
            self.assertEqual(res.status_code, 200, f'{url} -> {res.status_code}')

    def test_schema_covers_every_app_endpoint(self):
        res = self.client.get('/api/schema/')
        schema = yaml.safe_load(res.content)
        paths = schema['paths']
        for prefix in (
            '/api/v1/hackathons/', '/api/v1/coffeechats/', '/api/v1/chats/',
            '/api/v1/notifications/', '/api/v1/reviews/', '/api/v1/auth/', '/api/v1/me/',
        ):
            self.assertTrue(
                any(p.startswith(prefix) for p in paths), f'{prefix} 아래 경로가 스키마에 없음',
            )
