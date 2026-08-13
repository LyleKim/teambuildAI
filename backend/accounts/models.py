from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, name, password=None, **extra_fields):
        if not email:
            raise ValueError('이메일은 필수입니다.')
        email = self.normalize_email(email)
        user = self.model(email=email, name=name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, name, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """카카오 OAuth 전용 계정. password는 관리자(superuser) 외에는 쓰이지 않는다."""

    email = models.EmailField(unique=True)
    name = models.CharField(max_length=50)
    avatar_url = models.URLField(blank=True, null=True)
    # 카카오 로그인 연동 전(Phase 0)이라 지금은 항상 null. Phase 6에서 채워진다.
    kakao_id = models.CharField(max_length=64, unique=True, null=True, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    def __str__(self):
        return self.email


class Profile(models.Model):
    """매칭에 쓰이는 상세 정보. User는 인증용으로만 가볍게 두고 여기로 분리했다."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')

    # roles/skills/regions/interests는 meta/options에서 오는 자유 문자열 다건이라
    # 고정 컬럼 대신 JSONField(문자열 배열)로 둔다.
    roles = models.JSONField(default=list, blank=True)
    skills = models.JSONField(default=list, blank=True)
    available_time = models.CharField(max_length=30, blank=True)
    regions = models.JSONField(default=list, blank=True)
    goal = models.CharField(max_length=30, blank=True)
    collaboration = models.CharField(max_length=30, blank=True)
    communication = models.CharField(max_length=30, blank=True)
    interests = models.JSONField(default=list, blank=True)

    one_liner = models.CharField(max_length=100, blank=True)
    bio_style = models.TextField(blank=True)
    bio_strength = models.TextField(blank=True)
    bio_experience = models.TextField(blank=True)
    bio_goal = models.TextField(blank=True)
    bio_contribution = models.TextField(blank=True)

    # [{type, url}, ...]. 개수 제한이 없고 독립적으로 조회할 일도 없어
    # 별도 테이블 없이 JSONField로 둔다.
    links = models.JSONField(default=list, blank=True)
    open_chat = models.URLField(blank=True)
    # 참가자 수동 추가 시 "사이트 회원인지" 조회하는 키. 카카오 로그인이 전화번호를
    # 안 주기 때문에 선택 입력이고, 회원마다 있을 수도 없을 수도 있다.
    phone = models.CharField(max_length=20, blank=True, db_index=True)

    is_private = models.BooleanField(default=False)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.email}의 프로필'
