"""
AI 추천("다시 추천받기") 화면을 눈으로 확인하기 위한 더미 데이터.

전용 해커톤 하나를 새로 만들고(기존 해커톤 데이터는 건드리지 않는다) 정량 스펙이
서로 다른 개인 참가자 12명을 채워 넣는다 — 상위 5명 AI 카드, 6번째 이후 가로 스크롤
카드, 비공개/프로필없음 후보 제외, 한 줄 소개 미입력 폴백 문구까지 한 번에 확인할 수
있게 구성했다. 여러 번 실행해도 안전하다(get_or_create 기반, 중복 생성 없음).
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import Profile, User
from hackathons.models import Hackathon, Participation

HACKATHON_TITLE = 'AI 추천 테스트용 해커톤'

# (이름, 역할, 기술스택, 활동시간, 지역, 목표, 협업방식, 소통방식, 관심사, 한줄소개, 비공개여부)
CANDIDATES = [
    ('이서연', ['디자인'], ['Figma'], '주말 올인', ['서울'], '수상 목적', '오프라인 위주', '직설적 피드백 선호', ['AI'], '산뜻한 UI를 빠르게 뽑아내는 걸 좋아해요', False),
    ('박민준', ['백엔드'], ['Django', 'Python'], '평일 저녁', ['경기'], '포트폴리오', '온라인 위주', '부드러운 소통 선호', ['핀테크'], '견고한 API 설계에 자신 있어요', False),
    ('최유진', ['프론트엔드'], ['React', 'TypeScript'], '주말 올인', ['서울'], '수상 목적', '오프라인 위주', '직설적 피드백 선호', ['AI', '헬스케어'], 'React로 빠르게 프로토타입 뽑는 걸 좋아해요', False),
    ('정하늘', ['AI/ML'], ['Python'], '자유', ['온라인'], '경험', '혼합', '상관없음', ['AI', '커리어'], '모델 튜닝보다 데이터 정제가 더 재밌어요', False),
    ('한소민', ['백엔드', 'AI/ML'], ['Python', 'Django'], '주말 올인', ['경기'], '수상 목적', '온라인 위주', '직설적 피드백 선호', ['AI', '핀테크'], '수상 경험 3회, 백엔드와 ML 둘 다 가능해요', False),
    ('김도윤', ['기획'], [], '주말 위주', ['서울'], '포트폴리오', '오프라인 위주', '부드러운 소통 선호', ['소셜', '커리어'], '유저 인터뷰부터 시작하는 기획을 선호해요', False),
    ('오지훈', ['프론트엔드'], ['React', 'Node.js'], '평일 저녁', ['온라인'], '경험', '온라인 위주', '상관없음', ['헬스케어'], '풀스택 지향 프론트엔드예요', False),
    ('배수아', ['AI/ML'], ['Python', 'TypeScript'], '주말 올인', ['서울'], '수상 목적', '온라인 위주', '상관없음', ['AI'], '컴퓨터 비전 프로젝트 경험 있어요', False),
    ('윤태양', ['프론트엔드', '디자인'], ['React', 'Figma'], '평일 저녁', ['온라인'], '포트폴리오', '혼합', '부드러운 소통 선호', ['소셜', 'AI'], '디자인도 코드도 둘 다 손대는 편이에요', False),
    ('임채원', ['디자인', '기획'], ['Figma'], '자유', ['서울'], '포트폴리오', '혼합', '부드러운 소통 선호', ['소셜'], '', False),  # 한 줄 소개 미입력 폴백 확인용
    ('신동혁', ['백엔드'], ['Node.js'], '주말 위주', ['경기'], '경험', '오프라인 위주', '직설적 피드백 선호', ['핀테크', '커리어'], '', False),  # 한 줄 소개 미입력 폴백 확인용
    ('강나은', ['기획'], [], '자유', ['경기'], '경험', '온라인 위주', '상관없음', ['헬스케어', '커리어'], '비공개로 지원 현황만 확인 중', True),  # 비공개 → 후보 제외 확인용
    ('조은비', ['백엔드'], ['Java', 'Spring'], '평일 저녁', ['서울'], '포트폴리오', '온라인 위주', '상관없음', ['핀테크'], 'Spring으로 안정적인 서버 짜는 걸 좋아해요', False),
    ('한지호', ['프론트엔드', 'AI/ML'], ['React', 'Python'], '주말 올인', ['온라인'], '수상 목적', '혼합', '직설적 피드백 선호', ['AI', '소셜'], 'AI 서비스를 프론트까지 붙여서 완성하는 걸 좋아해요', False),
    ('서지우', ['디자인'], ['Figma', 'Photoshop'], '자유', ['경기'], '경험', '오프라인 위주', '부드러운 소통 선호', ['헬스케어'], '', False),  # 한 줄 소개 미입력 폴백 확인용
    ('권도현', ['백엔드', '기획'], ['Node.js'], '주말 위주', ['서울'], '수상 목적', '온라인 위주', '상관없음', ['커리어', '핀테크'], '기획부터 서버까지 혼자 굴려본 경험 있어요', False),
    ('문세아', ['AI/ML', '프론트엔드'], ['Python', 'React'], '평일 저녁', ['온라인'], '포트폴리오', '혼합', '직설적 피드백 선호', ['AI'], '모델 데모를 웹으로 바로 보여주는 걸 좋아해요', False),
]

NO_PROFILE_NAME = '무프로필유저'  # 프로필 미작성 → 후보 제외 확인용


class Command(BaseCommand):
    help = 'AI 추천 화면 테스트용 더미 해커톤/참가자를 만든다.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            default='kakao_5028439528@placeholder.local',
            help='이 해커톤에 "나"로 같이 참가시킬 계정 이메일 (기본값: 개발 중 로그인해온 카카오 계정)',
        )
        parser.add_argument(
            '--hackathon-id',
            type=int,
            default=None,
            help='더미 후보를 채워 넣을 기존 해커톤 id. 생략하면 전용 데모 해커톤을 새로 만든다.',
        )

    def handle(self, *args, **options):
        if options['hackathon_id'] is not None:
            hackathon = Hackathon.objects.get(pk=options['hackathon_id'])
            self.stdout.write(self.style.SUCCESS(f'기존 해커톤 재사용: {hackathon.title} (id={hackathon.id})'))
        else:
            hackathon, created = Hackathon.objects.update_or_create(
                title=HACKATHON_TITLE,
                defaults=dict(
                    category='AI',
                    status=Hackathon.Status.RECRUITING,
                    start_date=timezone.now().date(),
                    end_date=timezone.now().date() + timezone.timedelta(days=30),
                    description='추천 알고리즘 + AI 문구 생성을 테스트하기 위한 더미 해커톤입니다.',
                    is_demo=True,  # 홈 화면 목록에는 노출되지 않는다
                ),
            )
            self.stdout.write(self.style.SUCCESS(
                f'해커톤 {"생성" if created else "재사용"}: {hackathon.title} (id={hackathon.id})'
            ))

        for i, (name, roles, skills, time, regions, goal, collab, comm, interests, one_liner, private) in enumerate(
            CANDIDATES, start=1
        ):
            email = f'demo_rec_{i}@test.local'
            user, _ = User.objects.get_or_create(email=email, defaults={'name': name})
            Profile.objects.update_or_create(
                user=user,
                defaults=dict(
                    roles=roles, skills=skills, available_time=time, regions=regions,
                    goal=goal, collaboration=collab, communication=comm, interests=interests,
                    one_liner=one_liner, is_private=private,
                ),
            )
            Participation.objects.get_or_create(
                user=user, hackathon=hackathon, defaults={'join_type': Participation.JoinType.INDIVIDUAL},
            )
            self.stdout.write(f'  - {name} ({email}){" [비공개]" if private else ""}')

        no_profile_user, _ = User.objects.get_or_create(
            email='demo_rec_noprofile@test.local', defaults={'name': NO_PROFILE_NAME}
        )
        Participation.objects.get_or_create(
            user=no_profile_user, hackathon=hackathon,
            defaults={'join_type': Participation.JoinType.INDIVIDUAL},
        )
        self.stdout.write(f'  - {NO_PROFILE_NAME} (프로필 없음, 후보에서 자동 제외됨)')

        email = options['email']
        me = User.objects.filter(email=email).first()
        if me:
            Participation.objects.get_or_create(
                user=me, hackathon=hackathon, defaults={'join_type': Participation.JoinType.INDIVIDUAL},
            )
            self.stdout.write(self.style.SUCCESS(f'{me.name}({email})를 이 해커톤 개인 참가자로 등록했어요.'))
        else:
            self.stdout.write(self.style.WARNING(
                f'{email} 계정을 찾지 못해 "나" 참가자 등록은 건너뜁니다. '
                f'--email 옵션으로 실제 로그인 계정을 지정하세요.'
            ))

        self.stdout.write(self.style.SUCCESS(
            f'프론트에서 /hackathons/{hackathon.id}/recommendations 로 들어가 '
            f'"다시 추천받기"를 눌러 확인하세요.'
        ))
