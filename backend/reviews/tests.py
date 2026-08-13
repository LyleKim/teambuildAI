import datetime

from rest_framework.test import APITestCase

from accounts.models import Profile, User
from coffeechat.models import CoffeeChat
from hackathons.models import Hackathon

from .models import Review


class ReviewFlowTests(APITestCase):
    def setUp(self):
        self.me = User.objects.create_user(email='me@x.com', name='나', password='x')
        self.teammate = User.objects.create_user(email='mate@x.com', name='팀원', password='x')
        self.stranger = User.objects.create_user(email='stranger@x.com', name='제3자', password='x')
        Profile.objects.create(user=self.me)
        Profile.objects.create(user=self.teammate)
        self.hackathon = Hackathon.objects.create(
            title='테스트 해커톤', category='AI',
            start_date=datetime.date.today(), end_date=datetime.date.today(),
        )
        # me <-> teammate가 이 해커톤에서 커피챗이 수락된 상태여야 리뷰 작성이 가능하다
        CoffeeChat.objects.create(
            sender=self.me, receiver=self.teammate, hackathon=self.hackathon,
            message='hi', status=CoffeeChat.Status.IN_PROGRESS,
        )
        self.client.force_authenticate(self.me)

    def _post(self, reviewee_id, rating=5, content='좋았어요'):
        return self.client.post('/api/v1/reviews/', {
            'hackathon_id': self.hackathon.id, 'reviewee_id': reviewee_id,
            'rating': rating, 'content': content,
        })

    def test_review_requires_accepted_coffeechat(self):
        res = self._post(self.stranger.id)
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Review.objects.count(), 0)

    def test_review_create_and_upsert(self):
        res = self._post(self.teammate.id, rating=5, content='처음 리뷰')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Review.objects.count(), 1)

        res = self._post(self.teammate.id, rating=3, content='수정된 리뷰')
        self.assertEqual(res.status_code, 200)
        # 같은 (해커톤, 작성자, 대상)이면 새 행이 아니라 덮어써야 한다
        self.assertEqual(Review.objects.count(), 1)
        review = Review.objects.get()
        self.assertEqual(review.rating, 3)
        self.assertEqual(review.content, '수정된 리뷰')

    def test_rating_out_of_range_rejected(self):
        res = self._post(self.teammate.id, rating=6)
        self.assertEqual(res.status_code, 400)

    def test_received_list_scoped_to_reviewee(self):
        self._post(self.teammate.id)

        self.client.force_authenticate(self.teammate)
        res = self.client.get('/api/v1/reviews/received/')
        self.assertEqual(res.status_code, 200)
        results = res.data['results']  # ListAPIView라 DRF 기본 페이지네이션이 적용된다
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['reviewer_name'], '나')

        self.client.force_authenticate(self.stranger)
        res = self.client.get('/api/v1/reviews/received/')
        self.assertEqual(len(res.data['results']), 0)
