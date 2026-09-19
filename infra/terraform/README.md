# teambuildAI 인프라 (실험 단계)

`nginx EC2(TLS 종료 + 정적 파일 + 리버스 프록시) -> WAS EC2(gunicorn) -> RDS(MySQL)` +
이미지 저장용 S3. CloudFront는 안 쓴다(정적 페이지 전달만 목적이면 nginx 단독으로
충분하고, TLS 인증서 관리 자체를 학습 목적으로 nginx에서 직접 한다).

## 파일 구성

| 파일 | 내용 |
|---|---|
| `versions.tf` | Terraform/프로바이더 버전 고정, (주석 처리된) S3 backend 예시 |
| `providers.tf` | AWS 프로바이더 + 공통 태그 |
| `variables.tf` | 입력 변수 전체 |
| `locals.tf` | 리소스 이름 접두사 |
| `network.tf` | VPC, 퍼블릭 서브넷 2개, IGW, 라우팅 |
| `security_groups.tf` | nginx/was/rds 3개 보안그룹 (앞 계층만 다음 계층을 부를 수 있게) |
| `ec2.tf` | nginx, WAS 인스턴스 + nginx용 고정 IP(EIP) |
| `rds.tf` | MySQL 인스턴스 + DB 서브넷 그룹 + 자동 생성 비밀번호 |
| `s3.tf` | 이미지 버킷(공개 읽기 전용) |
| `outputs.tf` | 배포 후 필요한 값들(IP, RDS 엔드포인트, 비밀번호 등) |

## 왜 이렇게 짰는지 (학습 포인트)

- **NAT Gateway를 안 씀**: 정석대로면 WAS/RDS는 프라이빗 서브넷 + NAT 뒤에 둬야
  하지만, NAT Gateway는 시간당 과금(월 3만원+)이라 실험 단계엔 배보다 배꼽이 크다.
  대신 전부 퍼블릭 서브넷에 두고 **보안그룹으로만** 계층을 분리했다
  (`nginx-sg` -> `was-sg` -> `rds-sg` 순으로, 각 보안그룹이 "바로 앞 계층에서만"
  들어오게 함). 실사용자가 늘면 `network.tf`에 프라이빗 서브넷 + NAT를 추가하고
  WAS/RDS를 옮기는 게 다음 단계.
- **AMI를 하드코딩하지 않음**: `data "aws_ami"`로 "최신 Amazon Linux 2023"을 매번
  조회한다. 특정 AMI ID를 박아두면 리전을 옮기거나 시간이 지나 이미지가
  deprecate될 때 조용히 깨진다.
- **SSH 키를 Terraform이 만들지 않음**: 개인키가 상태 파일에 남는 걸 피하려고,
  기존에 만들어둔 키 페어 이름을 변수로 받는 방식을 썼다.
- **RDS 비밀번호는 `random_password`로 자동 생성**: 사람이 비밀번호를 타이핑해서
  tfvars에 적어두는 습관 자체를 없앤다. 확인은 `terraform output -raw db_password`.
- **S3는 버킷 정책으로 공개 읽기, ACL은 계속 차단**: 2023년 이후 AWS 기본값이라
  최신 방식을 따랐다. "쓰기"는 여전히 아무나 못 한다 — 업로드는 IAM으로 별도 통제.
- **Terraform은 인프라만, 소프트웨어 설치는 안 함**: nginx/gunicorn 설치·설정은
  이 코드가 안 건드린다. Terraform(프로비저닝)과 서버 내부 설정(configuration
  management)을 섞으면 나중에 "이 서버가 왜 이 상태인지" 추적이 어려워진다.

## 사용 순서

```bash
# 1. 키 페어가 없으면 먼저 생성
aws ec2 create-key-pair --key-name teambuildai --query 'KeyMaterial' --output text > teambuildai.pem
chmod 400 teambuildai.pem

# 2. 변수 파일 준비
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars 를 열어 ssh_key_name / ssh_allowed_cidr / s3_bucket_name 채우기

# 3. 초기화 -> 계획 확인 -> 적용
terraform init
terraform plan
terraform apply

# 4. 배포 후 필요한 값 확인
terraform output
terraform output -raw db_password
```

## apply 이후 수동으로 해야 하는 것 (Terraform 범위 밖)

1. **WAS EC2**: SSH 접속 후 Docker(또는 uv+Python) 설치, 이 저장소의 `backend/`를
   올려서 `.env`에 다음 값 채우기 — `DB_HOST`(= `terraform output rds_endpoint`),
   `DB_PASSWORD`(= `terraform output -raw db_password`), `DJANGO_ALLOWED_HOSTS`,
   `CORS_ALLOWED_ORIGINS`, `KAKAO_REDIRECT_URI`(실제 도메인으로). 컨테이너는
   `gunicorn config.wsgi:application`으로 뜬다(`backend/Dockerfile` 기본값).
2. **nginx EC2**: nginx 설치, `certbot`으로 Let's Encrypt 인증서 발급(도메인이
   `terraform output nginx_public_ip`를 가리키고 있어야 발급됨), `/`(정적 프론트
   빌드 결과물)와 `/api`,`/admin`,`/static`,`/media`를
   `terraform output was_private_ip`:8000 으로 프록시하도록 설정.
3. **카카오 디벨로퍼스**: Redirect URI를 실제 도메인(`https://.../api/v1/auth/kakao/callback/`)으로 등록.
4. **프론트 빌드**: `pnpm build` 산출물을 nginx EC2로 올리기(scp 등).

## 비용 감

프리티어 대상 계정이면 EC2 2대(t3.micro), RDS(db.t3.micro), S3 소량 트래픽까지
거의 0원. 프리티어가 아니면 월 3~4만원 선(EC2 2대 ~2만원 + RDS ~1.5만원, S3/EIP는
소액). **EIP를 인스턴스에 붙여두지 않고 방치하면 시간당 과금이 붙으니** 실험 끝나고
`terraform destroy`로 정리할 것.

## 정리(destroy)

```bash
terraform destroy
```

RDS는 `skip_final_snapshot = true`라 스냅샷 없이 바로 지워진다 — 실험용이라 이렇게
뒀지만, 지우기 전에 정말 실데이터가 없는지 한 번 확인할 것.
