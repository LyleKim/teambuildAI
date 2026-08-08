from django.contrib import admin

from .models import CoffeeChat


@admin.register(CoffeeChat)
class CoffeeChatAdmin(admin.ModelAdmin):
    list_display = ('sender', 'receiver', 'hackathon', 'status', 'created_at')
    list_filter = ('status',)
