from django.core.management.base import BaseCommand, CommandError
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User


class Command(BaseCommand):
    """
    Phase 6에서 카카오 로그인이 붙기 전까지, 개발 중 API를 curl/Postman으로
    테스트할 때 쓰는 임시 명령. 실제 서비스 로그인 경로가 아니며
    프론트엔드는 이 커맨드를 호출하지 않는다.
    """

    help = '지정한 이메일 사용자의 JWT access/refresh 토큰 쌍을 발급한다 (개발용).'

    def add_arguments(self, parser):
        parser.add_argument('email')

    def handle(self, *args, **options):
        email = options['email']
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise CommandError(f'{email} 사용자가 없습니다.')

        refresh = RefreshToken.for_user(user)
        self.stdout.write(f'access:  {refresh.access_token}')
        self.stdout.write(f'refresh: {refresh}')
