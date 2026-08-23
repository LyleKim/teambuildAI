"""
홈 화면(해커톤 탐색)에 실제로 노출할 해커톤 6개를 심는다. 마이그레이션으로 심어둔
더미 3개(2025 카카오 임팩트 해커톤 등)는 다른 테스트 데이터(추천/커피챗)가 걸려
있어 건드리지 않는다 — 노출에서 빼려면 admin에서 따로 처리한다.

title로 update_or_create하므로 여러 번 실행해도 안전하고, 날짜/카테고리가 바뀌면
아래 값만 고쳐서 재실행하면 된다.

category는 홈 화면 필터 칩(hackathons/views.py의 META_OPTIONS['categories'])과
정확히 일치해야 필터링이 걸린다 — 뷰가 부분일치가 아니라 정확히 같은 문자열로만
필터링하기 때문에, 여러 태그를 합친 문구 대신 이 목록에 있는 값 하나만 쓴다.
"""
from django.core.management.base import BaseCommand

from hackathons.models import Hackathon

BANNER_DIR = '/hackathon-banners'

HACKATHONS = [
    dict(
        title='제6회 그린리모델링 챌린지 대학생 해커톤',
        category='AI',
        start_date='2026-08-12',
        end_date='2026-09-30',
        banner_url=f'{BANNER_DIR}/green-remodeling-challenge.png',
    ),
    dict(
        title='RevenueCat Shipaton 2026',
        category='모바일',
        start_date='2026-08-01',
        end_date='2026-09-30',
        banner_url=f'{BANNER_DIR}/revenuecat-shipaton.png',
    ),
    dict(
        title='DevNetwork [API + Cloud + AI] Hackathon 2026',
        category='클라우드',
        start_date='2026-08-17',
        end_date='2026-09-03',
        banner_url=f'{BANNER_DIR}/devnetwork-hackathon.png',
    ),
    dict(
        title='GatewayHacks 2026 | Software & AI',
        category='AI',
        start_date='2026-09-01',
        end_date='2026-10-02',
        banner_url=f'{BANNER_DIR}/gatewayhacks.png',
    ),
    dict(
        title='Hack for Humanity | Summer 2026',
        category='AI',
        start_date='2026-09-02',
        end_date='2026-09-04',
        banner_url=f'{BANNER_DIR}/hack-for-humanity.png',
    ),
    dict(
        title='DeveloperWeek 2026 Hackathon',
        category='DevOps',
        start_date='2026-02-02',
        end_date='2026-02-20',
        banner_url=f'{BANNER_DIR}/developerweek-hackathon.png',
    ),
]


class Command(BaseCommand):
    help = '홈 화면에 보여줄 실제 해커톤 6개를 심는다 (배너 이미지 포함).'

    def handle(self, *args, **options):
        for data in HACKATHONS:
            defaults = {k: v for k, v in data.items() if k != 'title'}
            hackathon, created = Hackathon.objects.update_or_create(title=data['title'], defaults=defaults)
            self.stdout.write(self.style.SUCCESS(
                f'{"생성" if created else "갱신"}: {hackathon.title} (id={hackathon.id})'
            ))
