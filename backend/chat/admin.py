from django.contrib import admin

from .models import ChatMessage, ChatThread


@admin.register(ChatThread)
class ChatThreadAdmin(admin.ModelAdmin):
    list_display = ('id', 'hackathon', 'user_a', 'user_b', 'created_at')


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('thread', 'sender', 'text', 'created_at', 'read_at')
    list_filter = ('thread',)
