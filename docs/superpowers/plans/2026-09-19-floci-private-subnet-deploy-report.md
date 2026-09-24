# floci 기반 Private-Subnet 3-Tier 배포 검증 — 실행 기록

**대상 플랜:** `docs/superpowers/plans/2026-09-19-floci-private-subnet-deploy.md`
**실행일:** 2026-09-19
**범위:** Phase A(Terraform 재작성) + Phase B(nginx/WAS/RDS 소프트웨어 설정, 서브에이전트 3개). Phase C(실제 AWS 네트워크 격리 검증)는 사용자 승인 대기 중, 미실행.

---

## 1. 배경 — 왜 이 작업을 하게 됐나

원래 목표는 해커톤 크롤링 파이프라인(크롤러 → S3 → Lambda 비동기 처리 → RDS/S3)이었으나, "한세월 걸릴 것 같다"는 판단 아래 그보다 먼저 **teambuildAI 본체를 CloudFront→EC2(nginx)→EC2(WAS)→RDS 구조로 실제 배포할 수 있는지 실험**하기로 방향을 잡았다. 이후 다음 순서로 논의가 좁혀졌다:

1. CloudFront는 멀티리전 캐싱이 목적이 아니라 TLS 인증서 관리 편의가 주된 이유인데, "학습이 목적"이므로 CloudFront 없이 **nginx가 TLS+정적서빙+리버스프록시를 직접** 하기로 결정.
2. 최종 아키텍처 확정: **nginx EC2 → WAS EC2(gunicorn) → RDS(MySQL) + S3(이미지)**.
3. 기존 코드에서 이 인프라를 위해 고칠 점 점검 → `STATIC_ROOT` 없음(정적 파일 자체를 아직 안 모음), 이미지가 전부 `URLField`라 S3 업로드 API 자체가 없음(신규 기능 필요), WSGI 서버가 `runserver`였음 → **gunicorn 도입**(`backend/pyproject.toml`에 추가, `backend/Dockerfile`의 `CMD`를 `gunicorn config.wsgi:application`으로 교체, 실제 요청 처리까지 검증 완료).
4. 1:1 채팅은 애초에 웹소켓이 아니라 5초 폴링(REST)으로 구현돼 있어 이번 배포 방식과 무관함을 확인.
5. Terraform으로 위 인프라를 정석대로 구성(REST API/DTO/CORS/예외처리/OpenAPI 정비를 마친 뒤 이어진 작업) — `infra/terraform/`에 최초 버전 작성(퍼블릭 서브넷 + 보안그룹만으로 방어, NAT Gateway는 비용 이유로 생략).
6. 비용 문제로 **로컬 AWS 에뮬레이터에서 먼저 검증**하자는 아이디어 → 사용자가 "floci"를 언급했으나 실제로는 `floci-az`(Azure 에뮬레이터, 포트 4577) 링크를 줘서 혼선이 있었음. 조사 결과 같은 프로젝트의 형제 제품 중 AWS용은 **`floci`(포트 4566, LocalStack drop-in replacement)** 임을 확인.

---

## 2. floci 능력 검증 (계획 수립 전 별도로 진행) — 무엇을 테스트했고 결과가 어땠는가

Terraform을 다시 짜기 전에, **floci가 정말로 이 검증에 쓸 만한지** 실제로 리소스를 만들어보며 확인했다. 이 결과가 이후 "정석 private-subnet 구조로 가도 되는가"를 결정한 근거다.

| 테스트 | 방법 | 결과 |
|---|---|---|
| API 골격 지원 | AWS CLI로 VPC/서브넷/IGW/라우팅테이블/보안그룹 생성 | ✅ 전부 정상 응답 |
| EC2가 진짜 컴퓨트인가 | `run-instances` 2개(퍼블릭/프라이빗 서브넷) 후 `docker ps` | ✅ **실제 Docker 컨테이너**(`floci-ec2-<instance-id>`)가 뜸 |
| RDS가 진짜 엔진인가 | `create-db-instance`(MySQL) 후 컨테이너 내부에서 `SELECT VERSION()` | ✅ **실제 MySQL 8.0.36 엔진** 응답 |
| 서브넷 격리 | public/private 서브넷에 각각 인스턴스를 두고 ping | 🔴 **완전히 뚫림** — 두 컨테이너가 VPC당 하나의 공유 Docker 브릿지 네트워크에 subnet CIDR IP만 배정받아 붙어있을 뿐, 실제 L3 격리 없음 |
| 보안그룹 강제력 (허용 경로) | nginx-sg → was-sg:8000 (규칙상 허용) | ✅ 연결 성공 (의도대로) |
| 보안그룹 강제력 (거부돼야 할 경로) | 아무 SG 권한도 없는 3번째 인스턴스 → WAS:8000, WAS:22(sshd) | 🔴 **둘 다 연결 성공** — 막혔어야 정상, SG가 전혀 강제되지 않음 |
| RDS 보안그룹 | RDS에 아무 ingress 규칙도 안 준 채 WAS → RDS 접속(`--skip-ssl`) | 🔴 **완전히 성공** — RDS 컨테이너는 애초에 커스텀 VPC 네트워크에 붙어있지도 않고 기본 bridge 네트워크에 있었음 |

**결론(계획에 반영):** EC2/RDS 자체는 진짜라 **기능 통합 테스트**(nginx가 WAS로 진짜 프록시하는지, WAS가 RDS에 진짜 migrate하는지)에는 그대로 쓸 수 있다. 그러나 VPC/서브넷/보안그룹 격리는 전혀 강제되지 않으므로 **"private 서브넷이 실제로 보호해주는가"라는 보안 경계 검증에는 쓸 수 없다** — 이 부분만 Phase C에서 실제 AWS로 확인하기로 함. 검증이 끝난 뒤 테스트에 썼던 VPC/인스턴스/RDS는 전부 정리(`terminate-instances`, `delete-db-instance`, 서브넷/IGW/보안그룹 삭제)했다.

---

## 3. 전체 플랜 구조

플랜 파일(`2026-09-19-floci-private-subnet-deploy.md`)은 3단계로 구성됨:

- **Phase A** — Terraform을 private-subnet 구조로 재작성 (메인 세션이 직접 수행)
- **Phase B** — nginx/WAS/RDS 소프트웨어 설정 (서브에이전트 3개에 위임 — 컨텍스트 오염 방지 목적)
- **Phase C** — 실제 AWS에서 네트워크 격리만 최종 검증 (사용자 승인 필요, **미실행**)

Global Constraints로 명시한 것: NAT Gateway 포함 정석 구조 채택(floci는 비용 문제 없음), floci 컨테이너 네이밍 규칙(`floci-ec2-<instance-id>`, `floci-rds-db-...`), 서브에이전트는 하드코딩 대신 매번 `terraform output`으로 현재 상태를 조회할 것, 실제 AWS 적용 전 `floci_override.tf` 제거 필수.

---

## 4. Phase A 실행 내역 — Terraform 재작성 (메인 세션 직접 수행)

### Task 1: 프라이빗 서브넷 + NAT Gateway 추가
- `infra/terraform/variables.tf`: `private_subnet_cidrs` 변수 추가 (default `["10.0.11.0/24", "10.0.12.0/24"]`)
- `infra/terraform/network.tf`: "NAT 생략" ponytail 주석을 "floci는 비용 문제 없어 정석 구조로 전환, 실제 AWS 이관 시 NAT 비용(월 3만원+) 재검토 필요"로 교체. `aws_subnet.private`(count 2), `aws_eip.nat`, `aws_nat_gateway.main`(퍼블릭 서브넷[0]에 위치), `aws_route_table.private`(0.0.0.0/0 → NAT), `aws_route_table_association.private` 추가.
- 검증: `terraform validate` 성공.

### Task 2: WAS·RDS를 프라이빗 서브넷으로 이동
- `infra/terraform/ec2.tf`: WAS 인스턴스의 `subnet_id`를 `aws_subnet.private[0].id`로, `associate_public_ip_address`를 `false`로 변경. 주석을 "관리자 SSH는 nginx를 점프호스트로 거쳐야 한다"로 갱신.
- `infra/terraform/rds.tf`: `aws_db_subnet_group.main`의 `subnet_ids`를 `aws_subnet.private[*].id`로 변경.
- `infra/terraform/outputs.tf`: 이제 값이 없는 `was_public_ip` output 삭제, `was_private_ip` 설명 갱신.
- 검증: `terraform validate` 성공.

### Task 3: S3 VPC Gateway 엔드포인트 추가
- 신규 파일 `infra/terraform/vpc_endpoints.tf`: `aws_vpc_endpoint.s3`(Gateway 타입, `aws_route_table.private`에 연결) — 프라이빗 서브넷에서 S3로 가는 트래픽이 NAT를 거치지 않게 해 데이터 처리 과금을 아낌.

### Task 4: floci용 provider override 추가
- 신규 파일 `infra/terraform/floci_override.tf` — `_override.tf` 파일은 Terraform이 같은 이름의 블록(여기선 `provider "aws"`)을 자동으로 덮어쓰는 메커니즘을 이용. `endpoints` 블록에 ec2/rds/s3/iam/sts를 전부 `http://localhost:4566`으로, `access_key`/`secret_key`는 더미값(`test`), `s3_use_path_style = true`. **실제 AWS 적용 전 이 파일을 지우거나 이름을 바꿔야 한다는 경고 주석 포함.**

### Task 5: floci에 실제 apply
- `terraform.tfvars` 생성(`ssh_key_name`, `ssh_allowed_cidr=0.0.0.0/0`(floci 전용이라 무관), `s3_bucket_name`).
- `terraform init` → `terraform apply -auto-approve` 실행. RDS 생성 대기로 2분 54초 소요, 전체 apply는 120초 타임아웃을 넘겨 백그라운드로 이어짐.
- **결과: `Apply complete! Resources: 29 added, 0 changed, 0 destroyed.`**
- 검증:
  - `docker ps`에 `floci-ec2-*` 2개(nginx, WAS) + `floci-rds-*` 1개, 전부 `Up` 확인.
  - `terraform state show aws_instance.was`로 `associate_public_ip_address = false`, `public_ip = null`, `private_ip = "10.0.11.10"`(private CIDR 대역) 확인 — 이전 floci 테스트 때의 "퍼블릭 서브넷" 버전과 달리 이번엔 설계대로 배치됨을 실증.
  - `terraform output -json`을 `/tmp/floci_outputs.json`에 저장해 Phase B 서브에이전트들이 참조하게 함.

**Phase A 최종 출력값:**
```
nginx_public_ip  = "127.0.0.1"   (floci의 EIP 에뮬레이션 특성상 로컬 주소로 나옴 — 실제 AWS에선 진짜 공인 IP)
was_private_ip   = "10.0.11.10"
rds_endpoint     = "172.17.0.2"  (floci 내부 Docker 브릿지 IP)
rds_port         = 7001
s3_bucket_name   = "teambuildai-images-floci-test"
s3_bucket_domain = "teambuildai-images-floci-test.s3.ap-northeast-2.amazonaws.com"
db_password      = (sensitive, terraform output -raw db_password로만 확인)
```

---

## 5. Phase B 실행 내역 — 서브에이전트 3개 디스패치

Task 6(nginx)과 Task 7(WAS)은 한 메시지에 두 개의 Agent 호출로 **병렬** 디스패치. Task 8(RDS)은 Task 7 완료 후 순차 진행(마이그레이션 결과가 있어야 검증 가능하므로).

### Task 6 — nginx 설정 (서브에이전트, 소요 약 4분/247초, 22 tool call)

**대상:** `floci-ec2-i-778616889657d198a` (nginx, private_ip `10.0.1.11`)

**수행 내역:**
1. `dnf install -y nginx` (nginx 1.30.4)
2. `openssl`로 self-signed TLS 인증서 생성 (`/etc/nginx/ssl/selfsigned.crt`/`.key`, RSA 2048, 365일)
3. `frontend/vite.config.ts`의 `server.proxy`를 직접 읽고 프록시 경로(`/api`, `/admin`, `/static`, `/media`, `/ws`)를 그대로 맞춤. `/ws`는 `Upgrade`/`Connection: upgrade` 헤더 포함.
4. `/usr/share/nginx/html/index.html`에 확인용 텍스트 작성.

**문제 발견 및 해결:** `nginx -t`/기동 시 `bind() to 0.0.0.0:80 failed (Address already in use)` 발생. 원인은 **floci가 컨테이너 내부에서 이미 `socat`으로 EC2 IMDS(인스턴스 메타데이터 서비스)를 `169.254.169.254:80`으로 에뮬레이션 중**이었기 때문(`0.0.0.0` 와일드카드 바인드가 이미 점유된 특정 주소와 충돌). nginx 설정 실수가 아니라 floci 인프라 자체의 기존 프로세스라 손대지 않고, 대신 `listen 80;`을 `listen 127.0.0.1:80;` + `listen 10.0.1.11:80;`(443도 동일)로 특정 주소 바인딩으로 변경해 우회. 이 문제는 **floci 에뮬레이터에서만 발생**하며 실제 AWS EC2에서는 IMDS가 169.254.169.254 하나만 쓰므로 `listen 80;`/`listen 443 ssl;`으로 되돌려도 무방하다고 보고서에 명시.

**검증 결과:**
- `curl http://localhost/` → **200**, 정적 파일 정상 서빙
- `curl http://localhost/api/v1/meta/options/` → 502 (이 시점엔 WAS가 아직 준비 안 됨 — 예상된 결과로 기록, "WAS 완료 후 재확인 필요"로 남김)
- `curl -k https://localhost/` → 200 (TLS 리스닝 정상, self-signed라 `-k` 필요)

### Task 7 — WAS(gunicorn) 설정 (서브에이전트, 소요 약 8분/477초, 34 tool call)

**대상:** `floci-ec2-i-f5fc4d35835a599a1` (WAS, private_ip `10.0.11.10`)

**수행 내역:**
1. `dnf install -y python3.12 python3.12-pip` (컨테이너 base인 al2023엔 python3.9만 있었음)
2. `docker cp`로 저장소 `backend/`를 컨테이너 `/app`에 복사
3. **문제 발견:** `pip install .`이 `pyproject.toml`의 `requires-python = ">=3.14"` 때문에 거부됨 → 개별 패키지로 직접 설치(django, djangorestframework, djangorestframework-simplejwt, django-cors-headers, drf-spectacular, gunicorn, pymysql, httpx).
4. **핵심 버그 발견:** 버전 지정 없이 설치하니 Django 6.1.1이 깔렸는데, `migrate` 시 `django.db.utils.NotSupportedError: MySQL 8.4 or later is required (found 8.0.46)` 발생. **Django 6.x부터 MySQL 백엔드 최소 지원 버전이 8.4로 상향**됐는데 floci RDS는 실제 8.0.46 엔진이라 불일치. `pip install "django<6.0"`으로 5.2.17(LTS)로 낮춰 우회. 저장소의 `pyproject.toml`(`django>=6.0.7`)은 이 시점엔 건드리지 않고 "실제 배포 파이프라인에 그대로 태우면 동일 문제가 재현된다"고 보고.
5. **환경변수 문제 발견:** `backend/config/settings.py`는 `os.environ`만 읽고 `.env` 파일을 직접 로드하지 않음(원래 docker-compose의 `env_file` 주입에 의존하는 구조). 이 컨테이너는 docker-compose가 아니므로 `/app/.env`를 만들어도 자동 반영이 안 됨 → `set -a; . /app/.env; set +a`로 직접 export한 뒤 명령 실행.
6. `python manage.py migrate` — 34개 마이그레이션 전부 성공(W042 경고만 있음, floci와 무관한 기존 이슈).
7. `gunicorn config.wsgi:application --bind 0.0.0.0:8000 --daemon`으로 기동, 로그에 `Listening at: http://0.0.0.0:8000` 확인.

**검증 결과:**
- `curl http://localhost:8000/api/v1/meta/options/` (컨테이너 내부) → **200**, JSON 정상
- `curl http://10.0.11.10:8000/api/v1/meta/options/` (nginx 컨테이너에서 WAS 프라이빗 IP로) → **200**, 동일 JSON — **VPC 프라이빗 IP를 통한 통신 확인**

**남긴 참고사항:** gunicorn은 `--daemon`으로만 띄워 컨테이너 재시작 시 자동 복구 안 됨(systemd/supervisor 미설정) — floci 테스트 목적상 범위 밖으로 판단, 손대지 않음.

### 메인 세션의 추가 확인 (Task 7 완료 직후)
Task 6에서 502로 남겨뒀던 부분을 직접 재확인: `docker exec floci-ec2-i-778616889657d198a curl ... http://localhost/api/v1/meta/options/` → **200**. nginx→WAS 전체 경로가 실제로 동작함을 최종 확인.

### 발견된 버그의 처리(사용자 결정 반영)
Task 7이 발견한 Django 6.x/MySQL 8.4 요구사항 vs RDS 8.0 설계 충돌에 대해 사용자에게 해결 방향을 물었고, **"RDS를 MySQL 8.4로 올린다"**를 선택받아 다음을 반영:
- `infra/terraform/rds.tf`의 `engine_version`을 `"8.0"` → `"8.4"`로 변경, 왜 이 버전이어야 하는지(Django `minimum_database_version`)를 주석으로 남김.
- `backend/pyproject.toml`(`django>=6.0.7`)은 변경하지 않음 — Django는 최신 버전 그대로 유지.
- `terraform fmt && terraform validate` 통과 확인.

### Task 8 — RDS 데이터 계층 검증 (서브에이전트, 소요 약 1분/76초, 9 tool call)

**전제:** Task 7이 이미 `migrate`를 완료(Django 5.2.17로, floci 검증 환경에 한해)한 상태.

**수행 내역:**
1. 로컬에 mysql 클라이언트가 없어 WAS 컨테이너의 pymysql(2.2.8)로 대신 조회.
2. `SHOW TABLES` → **23개 테이블** 확인. 필수 9개(`accounts_user`, `accounts_profile`, `hackathons_hackathon`, `hackathons_participation`, `matching_recommendation`, `coffeechat_coffeechat`, `chat_chatthread`, `notifications_notification`, `reviews_review`) 전부 존재.
3. `backend/hackathons/management/commands/seed_real_hackathons.py`를 먼저 읽고(인자 없음, `title` 기준 `update_or_create`하는 멱등 커맨드) 실행:
   ```
   docker exec floci-ec2-i-f5fc4d35835a599a1 sh -c 'cd /app && set -a; . /app/.env; set +a; python3.12 manage.py seed_real_hackathons'
   ```
   해커톤 6개(그린리모델링 챌린지, RevenueCat Shipaton 2026, DevNetwork Hackathon 2026, GatewayHacks 2026, Hack for Humanity, DeveloperWeek 2026) 생성 성공, 에러 없음.
4. `SELECT COUNT(*) FROM hackathons_hackathon;` → **9** (마이그레이션이 심어둔 더미 3개 + 신규 시딩 6개).
5. `SHOW VARIABLES LIKE 'character_set_database';` → **utf8mb4** 확인. 한글 제목("제6회 그린리모델링 챌린지 대학생 해커톤" 등)이 깨지지 않고 그대로 조회되는 것까지 확인해 실제 데이터 왕복 검증 완료.

**완료 기준 충족:** seed 커맨드 에러 없음, COUNT > 0.

---

## 6. 발견된 문제 총정리

| # | 문제 | 발견 지점 | 원인 | 해결/처리 |
|---|---|---|---|---|
| 1 | "floci" 용어 혼동 | 계획 전 논의 | 사용자가 준 링크가 Azure 에뮬레이터(`floci-az`)였음 | 형제 제품 중 AWS용(`floci`, 포트 4566)이 맞는 도구임을 조사로 확인 |
| 2 | LocalStack 대비 floci 능력 불확실 | 계획 전 논의 | 문서만으로는 EC2/RDS가 진짜인지, VPC 격리가 진짜인지 불명 | 직접 리소스를 만들어 empirical 테스트 — EC2/RDS는 진짜, VPC/SG 격리는 가짜임을 확인 |
| 3 | nginx 컨테이너 80번 포트 바인드 실패 | Task 6 | floci가 IMDS 에뮬레이션에 이미 169.254.169.254:80(와일드카드 충돌)을 쓰고 있었음 | `listen 0.0.0.0:80` 대신 특정 IP(`127.0.0.1`, `10.0.1.11`)로 바인딩 — floci 전용 우회, 실제 AWS에선 불필요 |
| 4 | `pip install .` 거부 | Task 7 | `pyproject.toml`의 `requires-python = ">=3.14"`, 컨테이너엔 python3.12만 설치 가능 | 개별 패키지로 직접 설치 |
| 5 | **Django 6.x ↔ MySQL 8.0 비호환** | Task 7 | Django 6.x부터 MySQL 최소 지원 버전이 8.4로 상향, RDS는 8.0 설계 | (floci 검증 중) Django를 5.2.17로 임시 다운그레이드 → (저장소 반영) 사용자 결정에 따라 **`infra/terraform/rds.tf`의 `engine_version`을 8.4로 상향**, Django 코드는 유지 |
| 6 | `.env`가 자동 로드 안 됨 | Task 7 | `settings.py`가 `os.environ`만 읽고 dotenv 미사용(docker-compose `env_file` 의존 구조) | `set -a; . /app/.env; set +a`로 수동 export 후 실행 |
| 7 | RDS 접속 정보(`terraform output`)가 곧바로 안 먹힐 수 있음(사전 우려) | 계획 작성 시 미리 경고 | floci RDS 엔드포인트가 Docker 브릿지 IP로 나올 수 있음(이전 검증 세션에서 실제로 겪음) | 이번 실행에서는 `rds_endpoint`(172.17.0.2:7001) 그대로 접속 성공해 별도 조치 불필요했음 |

---

## 7. 최종 산출물

### 신규 생성 파일
- `infra/terraform/vpc_endpoints.tf` — S3 VPC Gateway 엔드포인트
- `infra/terraform/floci_override.tf` — floci용 AWS provider 엔드포인트 재정의 (실제 AWS 적용 전 제거 필요)
- `docs/superpowers/plans/2026-09-19-floci-private-subnet-deploy.md` — 이번 작업의 플랜
- `docs/superpowers/plans/2026-09-19-floci-private-subnet-deploy-report.md` — 본 문서

### 수정 파일
- `infra/terraform/variables.tf` — `private_subnet_cidrs` 변수 추가
- `infra/terraform/network.tf` — 프라이빗 서브넷 2개, NAT Gateway, 프라이빗 라우팅테이블/연결 추가
- `infra/terraform/ec2.tf` — WAS를 프라이빗 서브넷·퍼블릭 IP 없음으로 변경
- `infra/terraform/rds.tf` — DB 서브넷 그룹을 프라이빗으로, `engine_version`을 8.0→8.4로 변경
- `infra/terraform/outputs.tf` — `was_public_ip` 삭제, `was_private_ip` 설명 갱신
- `backend/Dockerfile` — (이전 세션에서 완료) `CMD`를 `gunicorn config.wsgi:application`으로 교체, 이번에 floci 컨테이너 안에서 실제 gunicorn 기동까지 재검증됨

### floci 위에 살아있는 상태(로컬 전용, 커밋 대상 아님)
- VPC(`vpc-c4adf486`류) + 프라이빗/퍼블릭 서브넷 4개 + NAT Gateway
- nginx 컨테이너(`floci-ec2-i-778616889657d198a`) — nginx 기동 중, TLS(self-signed) 리스닝 중
- WAS 컨테이너(`floci-ec2-i-f5fc4d35835a599a1`) — gunicorn 기동 중(`--daemon`), Django 5.2.17 + 의존 패키지 설치됨
- RDS 컨테이너(MySQL 8.0, floci 특성상 요청한 8.4가 아니라 8.0 엔진으로 뜬 상태 — Terraform 코드는 8.4로 바꿨지만 이 floci 인스턴스를 재적용하진 않음) — 테이블 23개 + 해커톤 데모 데이터 9건 보유
- S3 버킷 `teambuildai-images-floci-test`

### 문서화된 설계 결정 (주석으로 코드에 남김)
- NAT Gateway 채택 이유와 실제 AWS 이관 시 재검토 필요성 (`network.tf`)
- WAS SSH는 nginx를 점프호스트로 거쳐야 함 (`ec2.tf`)
- RDS 8.4 버전 고정 이유 (`rds.tf`)
- floci 전용 override 파일임을 명시하는 경고 (`floci_override.tf`)

---

## 8. 남은 일

- Task 7이 남긴 참고사항: gunicorn의 자동 재시작(systemd/supervisor)은 이번 범위 밖으로 남겨둠 — 실제 AWS 배포 시 별도 처리 필요.
- **2026-09-22 정리 완료**: 사용자 요청으로 floci 위에 떠 있던 AWS 에뮬레이션 리소스를 `terraform destroy -auto-approve`(`infra/terraform/`, `floci_override.tf` 활성 상태라 localhost:4566에만 적용됨)로 전량 정리. `terraform state list` 0건, `docker ps`에서 `floci-ec2-*`(nginx/WAS 2대) · `floci-rds-*` 컨테이너 소멸 확인 — VPC/서브넷/NAT Gateway/보안그룹 3개/RDS/S3 버킷 등 29개 리소스 전부 제거됨. floci/floci-ui 에뮬레이터 엔진 자체(도구, AWS 리소스 아님)는 남겨둠. 첫 시도는 Claude Code 자동 모드가 `-auto-approve` 무인 실행을 "blind apply"로 차단해 사용자가 직접 터미널에서 실행함.
