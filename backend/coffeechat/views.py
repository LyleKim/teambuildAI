from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from chat.models import ChatThread
from hackathons.models import Hackathon
from notifications.models import Notification
from notifications.services import notify

from .models import CoffeeChat
from .serializers import CoffeeChatSerializer


class CoffeeChatCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        to_user_id = request.data.get('to_user_id')
        hackathon_id = request.data.get('hackathon_id')
        message = (request.data.get('message') or '').strip()

        if not to_user_id or not hackathon_id:
            raise ValidationError('to_user_id, hackathon_id는 필수입니다.')
        if not message:
            raise ValidationError({'message': '메시지를 입력해주세요.'})
        if int(to_user_id) == request.user.id:
            raise ValidationError('자기 자신에게는 신청할 수 없어요.')

        receiver = get_object_or_404(User, pk=to_user_id)
        hackathon = get_object_or_404(Hackathon, pk=hackathon_id)

        # 방향 상관없이(내가 보냈든 상대가 보냈든) 진행 중인 커피챗이 있으면 중복 신청 막기
        # -> 나중에 accept()가 (hackathon, sender, receiver) 쌍으로 스레드를 만들 때
        # 같은 두 사람 사이에 스레드가 두 개 생기는 걸 원천 차단한다.
        in_progress = CoffeeChat.objects.filter(
            hackathon=hackathon, status__in=[CoffeeChat.Status.PENDING, CoffeeChat.Status.ACCEPTED],
        ).filter(
            Q(sender=request.user, receiver=receiver) | Q(sender=receiver, receiver=request.user)
        ).exists()
        if in_progress:
            raise ValidationError('이미 이 사람과 진행 중인 커피챗이 있어요.')

        coffeechat = CoffeeChat.objects.create(
            sender=request.user, receiver=receiver, hackathon=hackathon, message=message,
        )
        notify(
            user=receiver, type_=Notification.Type.REQUEST,
            text=f'{request.user.name}님이 커피챗을 신청했어요',
            target=Notification.Target.COFFEECHAT_INBOX, target_id=coffeechat.id,
        )
        serializer = CoffeeChatSerializer(coffeechat, context={'request': request})
        return Response(serializer.data, status=201)


class CoffeeChatReceivedListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = CoffeeChat.objects.filter(receiver=request.user).select_related(
            'sender__profile', 'hackathon', 'thread'
        ).order_by('-created_at')
        status_param = request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        return Response(CoffeeChatSerializer(qs, many=True, context={'request': request}).data)


class CoffeeChatSentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = CoffeeChat.objects.filter(sender=request.user).select_related(
            'receiver__profile', 'hackathon', 'thread'
        ).order_by('-created_at')
        status_param = request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        return Response(CoffeeChatSerializer(qs, many=True, context={'request': request}).data)


def _coffeechat_for_receiver(coffeechat_id, user):
    return get_object_or_404(CoffeeChat, pk=coffeechat_id, receiver=user)


class CoffeeChatAcceptView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, coffeechat_id):
        coffeechat = _coffeechat_for_receiver(coffeechat_id, request.user)
        if coffeechat.status != CoffeeChat.Status.PENDING:
            raise ValidationError('이미 처리된 커피챗이에요.')

        thread, _ = ChatThread.objects.get_or_create(
            hackathon=coffeechat.hackathon,
            user_a=coffeechat.sender,
            user_b=coffeechat.receiver,
        )
        coffeechat.status = CoffeeChat.Status.ACCEPTED
        coffeechat.thread = thread
        coffeechat.responded_at = timezone.now()
        coffeechat.save(update_fields=['status', 'thread', 'responded_at'])

        notify(
            user=coffeechat.sender, type_=Notification.Type.ACCEPTED,
            text=f'{coffeechat.receiver.name}님이 커피챗을 수락했어요',
            target=Notification.Target.COFFEECHAT_MATCHED, target_id=coffeechat.id,
        )

        return Response(CoffeeChatSerializer(coffeechat, context={'request': request}).data)


class CoffeeChatRejectView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, coffeechat_id):
        coffeechat = _coffeechat_for_receiver(coffeechat_id, request.user)
        if coffeechat.status != CoffeeChat.Status.PENDING:
            raise ValidationError('이미 처리된 커피챗이에요.')

        coffeechat.status = CoffeeChat.Status.REJECTED
        coffeechat.responded_at = timezone.now()
        coffeechat.save(update_fields=['status', 'responded_at'])

        notify(
            user=coffeechat.sender, type_=Notification.Type.REJECTED,
            text=f'{coffeechat.receiver.name}님이 커피챗을 거절했어요',
            target=Notification.Target.COFFEECHAT_INBOX, target_id=coffeechat.id,
        )

        return Response(CoffeeChatSerializer(coffeechat, context={'request': request}).data)


class CoffeeChatDetailView(generics.RetrieveAPIView):
    serializer_class = CoffeeChatSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CoffeeChat.objects.filter(Q(sender=self.request.user) | Q(receiver=self.request.user))
