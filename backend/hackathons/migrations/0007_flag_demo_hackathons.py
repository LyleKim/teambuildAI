from django.db import migrations

DEMO_TITLES = [
    '2025 카카오 임팩트 해커톤',
    '핀테크 이노베이션 챌린지',
    '헬스케어 AI 해커톤',
    'AI 추천 테스트용 해커톤',
]


def flag_demo(apps, schema_editor):
    Hackathon = apps.get_model('hackathons', 'Hackathon')
    Hackathon.objects.filter(title__in=DEMO_TITLES).update(is_demo=True)


def unflag_demo(apps, schema_editor):
    Hackathon = apps.get_model('hackathons', 'Hackathon')
    Hackathon.objects.filter(title__in=DEMO_TITLES).update(is_demo=False)


class Migration(migrations.Migration):

    dependencies = [
        ('hackathons', '0006_hackathon_is_demo'),
    ]

    operations = [
        migrations.RunPython(flag_demo, unflag_demo),
    ]
