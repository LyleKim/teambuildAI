from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Profile
from .serializers import MemberProfileSerializer, MyProfileSerializer


class MyProfileView(APIView):
    """GET은 프로필이 없으면 404(=신규 작성 케이스), PUT은 없으면 만들고 있으면 덮어쓴다."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_object_or_404(Profile, user=request.user)
        return Response(MyProfileSerializer(profile).data)

    def put(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = MyProfileSerializer(profile, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class MyProfilePrivacyView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        is_private = request.data.get('is_private')
        if not isinstance(is_private, bool):
            raise ValidationError({'is_private': '이 값은 boolean이어야 합니다.'})

        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.is_private = is_private
        profile.save(update_fields=['is_private'])
        return Response({'is_private': profile.is_private})


class MyProfileRoleView(APIView):
    """온보딩(카카오 로그인 직후 역할 선택) 단계에서 역할만 먼저 저장한다.

    MyProfileView(PUT)은 자기소개 5개 필드가 전부 필수라 이 시점엔 쓸 수 없어서
    가벼운 전용 엔드포인트를 둔다. roles 값 자체는 PUT /me/profile/ 과 동일하게
    검증하지 않는다 (원래도 자유 JSONField라 선택지 목록 대조를 하지 않았다).
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request):
        roles = request.data.get('roles')
        if not isinstance(roles, list) or not roles or not all(isinstance(r, str) for r in roles):
            raise ValidationError({'roles': '역할을 최소 1개 선택해주세요.'})

        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.roles = roles
        profile.save(update_fields=['roles'])
        return Response({'roles': profile.roles})


class MemberProfileView(generics.RetrieveAPIView):
    serializer_class = MemberProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return get_object_or_404(Profile, user_id=self.kwargs['user_id'])
