import datetime

from rest_framework.test import APITestCase

from accounts.models import Profile, User
from hackathons.models import Hackathon

from .models import CoffeeChat


class CoffeeChatFlowTests(APITestCase):
    """신청 -> 수락 -> 진행 -> 완료 / 삭제 흐름의 핵심 분기만 훑는 스모크 테스트."""

    def setUp(self):
        self.sender = User.objects.create_user(email='a@x.com', name='보내는사람', password='x')
        self.receiver = User.objects.create_user(email='b@x.com', name='받는사람', password='x')
        self.stranger = User.objects.create_user(email='c@x.com', name='제3자', password='x')
        Profile.objects.create(user=self.sender, open_chat='https://open.kakao.com/sender')
        Profile.objects.create(user=self.receiver, roles=['디자인'])
        self.hackathon = Hackathon.objects.create(
            title='테스트 해커톤', category='AI',
            start_date=datetime.date.today(), end_date=datetime.date.today(),
        )
        self.client.force_authenticate(self.sender)

    def _send(self, message='안녕하세요! 디자인 스택이 저희 팀과 잘 맞는 것 같아 커피챗 신청드려요.'):
        return self.client.post(
            '/api/v1/coffeechats/',
            {'to_user_id': self.receiver.id, 'hackathon_id': self.hackathon.id, 'message': message},
        )

    def test_send_without_open_chat_is_rejected(self):
        self.client.force_authenticate(self.receiver)  # receiver의 profile엔 open_chat이 없음
        res = self.client.post(
            '/api/v1/coffeechats/',
            {'to_user_id': self.sender.id, 'hackathon_id': self.hackathon.id, 'message': 'hi'},
        )
        self.assertEqual(res.status_code, 400)

    def test_send_without_message_is_rejected(self):
        res = self._send(message='  ')
        self.assertEqual(res.status_code, 400)

    def test_send_uses_client_message_and_snapshots_contact(self):
        res = self._send()
        self.assertEqual(res.status_code, 201)
        self.assertIn('디자인', res.data['message'])
        self.assertEqual(res.data['sender_contact'], 'https://open.kakao.com/sender')
        self.assertEqual(res.data['status'], 'pending')

    def test_progress_moves_forward_one_step_at_a_time(self):
        cc_id = self._send().data['id']
        self.client.force_authenticate(self.receiver)
        self.client.patch(f'/api/v1/coffeechats/{cc_id}/accept/')

        # accepted -> completed 건너뛰기는 막힌다
        res = self.client.patch(f'/api/v1/coffeechats/{cc_id}/progress/', {'status': 'completed'})
        self.assertEqual(res.status_code, 400)

        # accepted -> in_progress -> completed는 양쪽 다 호출 가능
        res = self.client.patch(f'/api/v1/coffeechats/{cc_id}/progress/', {'status': 'in_progress'})
        self.assertEqual(res.status_code, 200)
        self.client.force_authenticate(self.sender)
        res = self.client.patch(f'/api/v1/coffeechats/{cc_id}/progress/', {'status': 'completed'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'completed')

    def test_progress_rejected_while_still_pending(self):
        cc_id = self._send().data['id']
        res = self.client.patch(f'/api/v1/coffeechats/{cc_id}/progress/', {'status': 'in_progress'})
        self.assertEqual(res.status_code, 400)

    def test_delete_allowed_for_participants_only(self):
        cc_id = self._send().data['id']

        self.client.force_authenticate(self.stranger)
        res = self.client.delete(f'/api/v1/coffeechats/{cc_id}/delete/')
        self.assertEqual(res.status_code, 404)
        self.assertTrue(CoffeeChat.objects.filter(id=cc_id).exists())

        self.client.force_authenticate(self.receiver)
        res = self.client.delete(f'/api/v1/coffeechats/{cc_id}/delete/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(CoffeeChat.objects.filter(id=cc_id).exists())

    def test_teammates_only_lists_accepted_and_beyond(self):
        pending_id = self._send().data['id']

        self.client.force_authenticate(self.receiver)
        res = self.client.get(f'/api/v1/hackathons/{self.hackathon.id}/teammates/')
        self.assertEqual(res.data, [])  # 아직 pending이라 팀원이 아니다

        self.client.patch(f'/api/v1/coffeechats/{pending_id}/accept/')
        res = self.client.get(f'/api/v1/hackathons/{self.hackathon.id}/teammates/')
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['counterpart']['id'], self.sender.id)
        self.assertIsNone(res.data[0]['my_review'])

        # 발신자 쪽에서 봐도 자신 기준 상대(수신자)로 대칭적으로 보인다
        self.client.force_authenticate(self.sender)
        res = self.client.get(f'/api/v1/hackathons/{self.hackathon.id}/teammates/')
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['counterpart']['id'], self.receiver.id)
