from django.db.models import Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChatMessage, ChatThread
from .serializers import ChatThreadSerializer, serialize_message


def _thread_for_participant(thread_id, user):
    """참가자가 아니면 403이 아니라 404 — 남의 1:1 대화방은 존재 자체를 숨긴다."""
    thread = get_object_or_404(ChatThread, pk=thread_id)
    if user.id not in (thread.user_a_id, thread.user_b_id):
        raise Http404
    return thread


class ChatThreadListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        threads = ChatThread.objects.filter(
            Q(user_a=request.user) | Q(user_b=request.user)
        ).select_related('user_a__profile', 'user_b__profile', 'hackathon')
        serializer = ChatThreadSerializer(threads, many=True, context={'request': request})
        return Response(serializer.data)


class ChatThreadDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, thread_id):
        thread = _thread_for_participant(thread_id, request.user)
        serializer = ChatThreadSerializer(thread, context={'request': request})
        return Response(serializer.data)


class ChatMessageListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, thread_id):
        thread = _thread_for_participant(thread_id, request.user)
        messages = thread.messages.all()
        return Response([serialize_message(m, request.user) for m in messages])

    def post(self, request, thread_id):
        thread = _thread_for_participant(thread_id, request.user)
        text = (request.data.get('text') or '').strip()
        if not text:
            raise ValidationError({'text': '메시지를 입력해주세요.'})
        message = ChatMessage.objects.create(thread=thread, sender=request.user, text=text)
        return Response(serialize_message(message, request.user), status=201)


class ChatMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, thread_id):
        thread = _thread_for_participant(thread_id, request.user)
        thread.messages.filter(read_at__isnull=True).exclude(sender=request.user).update(
            read_at=timezone.now()
        )
        return Response(status=204)
