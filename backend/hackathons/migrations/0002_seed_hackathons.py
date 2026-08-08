from django.db import migrations

HACKATHONS = [
    {
        'title': '2025 카카오 임팩트 해커톤',
        'category': 'AI',
        'start_date': '2026-11-15',
        'end_date': '2026-11-17',
        'color': '#B8D9F5',
        'description': (
            'AI 기술을 활용해 카카오 서비스와 연계되는 새로운 임팩트를 만드는 2박 3일 해커톤입니다. '
            'AI/ML, 백엔드, 프론트엔드, 기획, 디자인 등 다양한 역할이 모여 팀을 이룹니다.'
        ),
    },
    {
        'title': '핀테크 이노베이션 챌린지',
        'category': '핀테크',
        'start_date': '2026-12-06',
        'end_date': '2026-12-08',
        'color': '#C4D9F0',
        'description': (
            '금융 혁신을 주제로 한 핀테크 해커톤입니다. 결제, 투자, 대출 등 다양한 '
            '금융 서비스를 재정의하는 프로젝트를 만들어보세요.'
        ),
    },
    {
        'title': '헬스케어 AI 해커톤',
        'category': '헬스케어',
        'start_date': '2026-12-20',
        'end_date': '2026-12-22',
        'color': '#D0E8F5',
        'description': (
            '의료 데이터와 AI를 결합하여 더 나은 헬스케어 서비스를 만드는 해커톤입니다. '
            '의료진, 개발자, 기획자가 함께 협업합니다.'
        ),
    },
]


def seed(apps, schema_editor):
    Hackathon = apps.get_model('hackathons', 'Hackathon')
    for data in HACKATHONS:
        Hackathon.objects.create(**data)


def unseed(apps, schema_editor):
    Hackathon = apps.get_model('hackathons', 'Hackathon')
    Hackathon.objects.filter(title__in=[h['title'] for h in HACKATHONS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('hackathons', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
