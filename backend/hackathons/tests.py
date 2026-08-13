import datetime

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
