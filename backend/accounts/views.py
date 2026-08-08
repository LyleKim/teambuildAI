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


class MemberProfileView(generics.RetrieveAPIView):
    serializer_class = MemberProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return get_object_or_404(Profile, user_id=self.kwargs['user_id'])
