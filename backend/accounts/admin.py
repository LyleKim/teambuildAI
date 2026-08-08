from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Profile, User


class UserAdmin(BaseUserAdmin):
    model = User
    list_display = ('email', 'name', 'is_staff', 'is_active')
    ordering = ('email',)
    search_fields = ('email', 'name')
    readonly_fields = ('date_joined',)

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('개인 정보', {'fields': ('name', 'avatar_url', 'kakao_id')}),
        ('권한', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('중요 일자', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'name', 'password1', 'password2'),
        }),
    )


admin.site.register(User, UserAdmin)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'available_time', 'goal', 'is_private', 'updated_at')
    search_fields = ('user__email', 'user__name')
    list_filter = ('is_private',)
