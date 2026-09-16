from django.http import Http404
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, serializers
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Profile
from .serializers import MemberProfileSerializer, MyProfileSerializer


class MyProfileView(APIView):
    """GET은 프로필이 없으면 404(=신규 작성 케이스), PUT은 없으면 만들고 있으면 덮어쓴다."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses=MyProfileSerializer)
    def get(self, request):
        profile = get_object_or_404(Profile, user=request.user)
        return Response(MyProfileSerializer(profile).data)

    @extend_schema(request=MyProfileSerializer, responses=MyProfileSerializer)
    def put(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = MyProfileSerializer(profile, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


IsPrivateSerializer = inline_serializer('IsPrivate', {'is_private': serializers.BooleanField()})


class MyProfilePrivacyView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=IsPrivateSerializer, responses=IsPrivateSerializer)
    def patch(self, request):
        is_private = request.data.get('is_private')
        if not isinstance(is_private, bool):
            raise ValidationError({'is_private': '이 값은 boolean이어야 합니다.'})

        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.is_private = is_private
        profile.save(update_fields=['is_private'])
        return Response({'is_private': profile.is_private})


RolesSerializer = inline_serializer('Roles', {'roles': serializers.ListField(child=serializers.CharField())})


class MyProfileRoleView(APIView):
    """온보딩(카카오 로그인 직후 역할 선택) 단계에서 역할만 먼저 저장한다.

    MyProfileView(PUT)은 자기소개 5개 필드가 전부 필수라 이 시점엔 쓸 수 없어서
    가벼운 전용 엔드포인트를 둔다. roles 값 자체는 PUT /me/profile/ 과 동일하게
    검증하지 않는다 (원래도 자유 JSONField라 선택지 목록 대조를 하지 않았다).
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(request=RolesSerializer, responses=RolesSerializer)
    def patch(self, request):
        roles = request.data.get('roles')
        if not isinstance(roles, list) or not roles or not all(isinstance(r, str) for r in roles):
            raise ValidationError({'roles': '역할을 최소 1개 선택해주세요.'})

        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.roles = roles
        profile.save(update_fields=['roles'])
        return Response({'roles': profile.roles})


class MemberProfileView(generics.RetrieveAPIView):
    """다른 사람 프로필 상세. 비공개(is_private) 설정이면 본인 외엔 존재 자체를
    숨긴다 — 403이 아니라 404로, 비공개인지 아닌지조차 알 수 없게 한다."""

    serializer_class = MemberProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        profile = get_object_or_404(Profile, user_id=self.kwargs['user_id'])
        if profile.is_private and profile.user_id != self.request.user.id:
            raise Http404
        return profile
