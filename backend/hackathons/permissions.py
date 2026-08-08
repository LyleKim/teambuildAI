from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """GET/HEAD/OPTIONS는 인증된 누구나, 수정/삭제는 소유자만."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        owner = getattr(obj, 'creator', None) or getattr(obj, 'user', None)
        return owner == request.user
