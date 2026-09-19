# floci 기반 Private-Subnet 3-Tier 배포 검증 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `infra/terraform/`을 정석 private-subnet 3-tier 구조(NAT Gateway 포함)로 재작성하고, 로컬 AWS 에뮬레이터 `floci`(localhost:4566) 위에서 nginx→WAS(gunicorn)→RDS(MySQL) 전체 스택이 실제로 동작하는지 기능 검증한 뒤, floci가 검증 못 하는 유일한 지점(보안그룹/서브넷 격리)만 실제 AWS 프리티어에서 최종 확인한다.

**Architecture:** VPC 하나에 AZ 2개 × (퍼블릭 서브넷 + 프라이빗 서브넷). nginx(TLS 종료·정적 서빙·리버스 프록시)만 퍼블릭 서브넷에 EIP로 노출되고, WAS(gunicorn)와 RDS(MySQL)는 프라이빗 서브넷에서 NAT Gateway를 통해서만 아웃바운드가 가능하다. `floci`의 EC2는 실제 Docker 컨테이너, RDS는 실제 MySQL 8.0 엔진이므로(직접 검증 완료) 각 컴포넌트 소프트웨어 설정은 하위 에이전트 3개(nginx/WAS/RDS)에 위임해 컨텍스트를 나눈다. 단 `floci`는 VPC/서브넷/보안그룹 격리를 전혀 강제하지 않으므로(직접 검증 완료 — SG 권한 없는 인스턴스도 자유롭게 통과함) 이 부분은 마지막 단계에서 실제 AWS로만 확인한다.

**Tech Stack:** Terraform(hashicorp/aws ~>5.0), floci(Docker 기반 AWS 에뮬레이터, LocalStack 호환 엔드포인트), nginx, gunicorn, Django 6/DRF, MySQL 8.0(RDS), `docker exec` 기반 원격 설정(floci EC2 컨테이너에 SSH도 가능하지만 exec가 더 간단).

**Spec:** 별도 spec 파일 없음 — 이 대화에서 합의된 설계. 요약은 아래 Global Constraints 참고. 기존 산출물: `infra/terraform/*.tf`(2026-09-17 작성, public-subnet 버전), `backend/Dockerfile`(gunicorn CMD로 이미 교체됨), `backend/config/settings.py`(CORS_ALLOWED_ORIGINS 등 env화 완료).

## Global Constraints

- 최종 아키텍처: nginx EC2(퍼블릭) → WAS EC2(프라이빗, gunicorn) → RDS(프라이빗, MySQL) + S3(이미지, 퍼블릭 읽기)
- floci 검증 단계는 비용 문제가 없으므로 NAT Gateway를 포함한 "정석" 구조를 쓴다 — 이전 버전(2026-09-17)의 "NAT 생략, SG로만 방어" 결정을 이 플랜에서 뒤집는다
- **floci 능력 확인 결과(직접 테스트 완료)**: EC2=진짜 Docker 컨테이너(SSH/UserData 가능), RDS=진짜 MySQL 엔진 — 기능 통합 테스트엔 유효. 단 VPC/서브넷/보안그룹은 전혀 격리를 강제하지 않음(관계없는 인스턴스도 SG 없이 8000/22번 포트 자유롭게 통과, RDS도 SG 권한 없이 접속됨) — 보안 경계 검증엔 무효
- floci 컨테이너 네이밍: EC2 인스턴스는 `floci-ec2-<instance-id>`, RDS는 `floci-rds-db-<식별자>`. 인스턴스ID는 `terraform state show aws_instance.<이름>`으로 확인
- 서브에이전트(Phase B)는 각자 독립적으로 `cd infra/terraform && terraform output -json`으로 현재 상태를 조회해야 한다 — apply할 때마다 인스턴스ID/컨테이너명이 바뀌므로 하드코딩 금지
- [[feedback_no_assistant_commits]]: 구현해도 커밋은 사용자가 직접 한다 — 각 태스크 끝에 git commit 스텝을 넣지 않는다 (이 프로젝트의 기존 관례와 다른 점, 의도적)
- 실제 AWS(Phase C)에 apply하기 전 `floci_override.tf`를 반드시 제거/비활성화할 것 — 안 그러면 실제 AWS 대신 계속 로컬 floci로 보내진다

---

## Phase A — Terraform을 private-subnet 구조로 재작성 (메인 세션에서 직접 수행)

### Task 1: 프라이빗 서브넷 + NAT Gateway 추가

**Files:**
- Modify: `infra/terraform/variables.tf`
- Modify: `infra/terraform/network.tf`

**Interfaces:**
- Produces: `aws_subnet.private[*]`, `aws_nat_gateway.main`, `aws_route_table.private` — Task 2가 이 값들을 참조한다

- [ ] **Step 1:** `variables.tf`의 `public_subnet_cidrs` 변수 블록 바로 아래에 추가:

```hcl
variable "private_subnet_cidrs" {
  description = "프라이빗 서브넷 CIDR 목록 (WAS, RDS가 여기 위치)"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}
```

- [ ] **Step 2:** `network.tf`의 "ponytail: 지금은 퍼블릭 서브넷 하나로..." 주석 블록을 아래로 교체:

```hcl
# floci(로컬 무료 검증)에서는 비용 문제가 없어 NAT Gateway를 포함한 정석 구조를
# 쓴다. WAS/RDS는 프라이빗 서브넷에 있고, 아웃바운드(패키지 설치, 외부 API 호출)는
# NAT Gateway를 거친다. 실제 AWS에 이관할 때는 NAT Gateway 과금(월 3만원+)을
# 감안해 "SG로만 방어 + 퍼블릭 서브넷" 버전으로 되돌릴지 재검토할 것 — 이건 이
# 플랜 범위 밖의 별도 의사결정이다.
```

- [ ] **Step 3:** 같은 파일의 `aws_route_table_association.public` 리소스 뒤에 추가:

```hcl
resource "aws_subnet" "private" {
  count                   = length(var.private_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.private_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = false

  tags = { Name = "${local.name_prefix}-private-${count.index + 1}" }
}

# NAT는 IGW처럼 진짜 라우팅을 하려면 자기 자신이 퍼블릭 IP를 가져야 한다 —
# 그래서 퍼블릭 서브넷[0]에 두고, 프라이빗 서브넷들이 전부 이 하나를 공유한다
# (AZ마다 하나씩 두면 더 안전하지만 그만큼 시간당 과금도 배로 늘어난다).
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = { Name = "${local.name_prefix}-nat-eip" }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = { Name = "${local.name_prefix}-nat" }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = { Name = "${local.name_prefix}-private-rt" }
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
```

- [ ] **Step 4:** 검증

```bash
cd infra/terraform && terraform fmt && terraform validate
```
Expected: `Success! The configuration is valid.`

---

### Task 2: WAS·RDS를 프라이빗 서브넷으로 이동

**Files:**
- Modify: `infra/terraform/ec2.tf`
- Modify: `infra/terraform/rds.tf`
- Modify: `infra/terraform/outputs.tf`

**Interfaces:**
- Consumes: `aws_subnet.private` (Task 1)
- Produces: `aws_instance.was`(프라이빗, public IP 없음) — Task 6/7 서브에이전트가 `terraform output was_private_ip`로 참조

- [ ] **Step 1:** `ec2.tf`의 WAS 인스턴스 블록과 그 위 설명 주석을 통째로 교체:

```hcl
# ─── WAS (Django + gunicorn) ────────────────────────────────────────────────
#
# 프라이빗 서브넷에 있어 퍼블릭 IP가 없다. 아웃바운드(패키지 설치, 카카오/Groq
# API 호출)는 NAT Gateway를 거치고, 인바운드는 오직 nginx-sg에서 온 8000번만
# 받는다(security_groups.tf). 관리자가 SSH로 들어가려면 nginx를 점프호스트로
# 거쳐야 한다: ssh -J ec2-user@<nginx_public_ip> ec2-user@<was_private_ip>
resource "aws_instance" "was" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.private[0].id
  vpc_security_group_ids      = [aws_security_group.was.id]
  key_name                    = var.ssh_key_name
  associate_public_ip_address = false

  root_block_device {
    volume_type = "gp3"
    volume_size = 20
  }

  tags = { Name = "${local.name_prefix}-was" }
}
```

- [ ] **Step 2:** `rds.tf`에서 `aws_db_subnet_group.main`의 `subnet_ids`를 교체:

```hcl
  subnet_ids = aws_subnet.private[*].id
```
(기존 `aws_subnet.public[*].id`를 대체)

- [ ] **Step 3:** `outputs.tf`에서 `was_public_ip` output을 삭제하고(더 이상 값이 없음), `was_private_ip`의 description을 갱신:

```hcl
output "was_private_ip" {
  description = "WAS EC2 프라이빗 IP. nginx의 리버스 프록시(proxy_pass) 대상이자, floci 서브에이전트가 docker exec 대상 확인에 쓰는 값. WAS는 퍼블릭 IP가 없다."
  value       = aws_instance.was.private_ip
}
```

- [ ] **Step 4:** 검증

```bash
cd infra/terraform && terraform fmt && terraform validate
```
Expected: `Success! The configuration is valid.`

---

### Task 3: S3용 VPC Gateway 엔드포인트 추가

**Files:**
- Create: `infra/terraform/vpc_endpoints.tf`

**Interfaces:**
- Consumes: `aws_vpc.main.id`, `aws_route_table.private.id`

- [ ] **Step 1:** 새 파일 작성

```hcl
# 프라이빗 서브넷(WAS)에서 S3로 가는 트래픽이 NAT Gateway를 거치지 않고
# AWS 백본으로 바로 나가게 한다 — 무료이고, NAT의 데이터 처리 과금도 아낀다.
# (실무에서 자주 놓치는 비용 최적화 포인트라 일부러 정석대로 넣는다.)
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  tags = { Name = "${local.name_prefix}-s3-endpoint" }
}
```

- [ ] **Step 2:** 검증

```bash
cd infra/terraform && terraform fmt && terraform validate
```
Expected: `Success! The configuration is valid.`

---

### Task 4: floci용 provider override 추가

**Files:**
- Create: `infra/terraform/floci_override.tf`

**Interfaces:**
- Produces: floci로 apply할 때 쓰는 AWS provider 재정의. **실제 AWS에 apply하기 전 이 파일을 지우거나 `.disabled` 확장자로 바꿀 것.**

- [ ] **Step 1:** 새 파일 작성 (`_override.tf`로 끝나는 파일은 Terraform이 자동으로 같은 이름의 블록을 덮어쓴다 — `providers.tf`의 `provider "aws"`를 이 파일이 완전히 대체한다)

```hcl
# floci(로컬 AWS 에뮬레이터, localhost:4566)로 apply할 때만 이 파일을 둔다.
# 실제 AWS에 apply할 때는 이 파일을 지우거나 이름을 바꿀 것 — 안 그러면
# 실제 AWS 대신 계속 로컬 floci로 요청이 간다.
provider "aws" {
  region = var.aws_region

  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  s3_use_path_style           = true

  endpoints {
    ec2 = "http://localhost:4566"
    rds = "http://localhost:4566"
    s3  = "http://localhost:4566"
    iam = "http://localhost:4566"
    sts = "http://localhost:4566"
  }

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
```

- [ ] **Step 2:** `.gitignore`에 이미 있는 패턴과 겹치지 않는지 확인 — 이 파일은 커밋 대상이다(floci 검증용임을 다음 사람도 알아야 함), `.gitignore`를 건드리지 않는다.

---

### Task 5: floci에 실제 apply해서 리소스 생성 확인

**Files:** 없음 (실행만)

- [ ] **Step 1:** floci가 떠 있는지 확인

```bash
curl -s http://localhost:4566/_localstack/health | jq -r .edition
```
Expected: `community` (또는 유사한 값 — 에러 없이 응답하면 OK)

- [ ] **Step 2:** tfvars 준비 (floci 전용이라 실제 키 페어/IP 불필요)

```bash
cd infra/terraform
cat > terraform.tfvars <<'EOF'
ssh_key_name     = "floci-test-key"
ssh_allowed_cidr = "0.0.0.0/0"
s3_bucket_name   = "teambuildai-images-floci-test"
EOF
```

- [ ] **Step 3:** apply

```bash
terraform init
terraform apply -auto-approve
```
Expected: `Apply complete!` 에러 없이 종료

- [ ] **Step 4:** 서브에이전트들이 참조할 수 있게 출력 저장

```bash
terraform output -json > /tmp/floci_outputs.json
cat /tmp/floci_outputs.json
```

- [ ] **Step 5:** 실제 컨테이너 확인

```bash
docker ps --format '{{.Names}}\t{{.Status}}' | grep -E 'floci-ec2|floci-rds'
```
Expected: nginx/WAS 인스턴스에 해당하는 `floci-ec2-*` 컨테이너 2개, `floci-rds-*` 컨테이너 1개가 `Up` 상태

---

## Phase B — 컴포넌트별 설정 (서브에이전트 3개에 위임)

각 태스크는 새 서브에이전트(컨텍스트 없음)에게 그대로 전달할 수 있도록 자기완결적으로 썼다. **Task 6(nginx)과 Task 7(WAS)은 독립적으로 병렬 진행 가능하지만, Task 8(RDS 검증)은 Task 7이 끝난 뒤(gunicorn+migrate 완료 후) 시작해야 한다.**

### Task 6 — 서브에이전트 브리핑: nginx 설정

```
teambuildAI(해커톤 팀원 매칭 서비스) 프로젝트를 floci(로컬 AWS 에뮬레이터,
localhost:4566)에 배포하는 작업 중 nginx 부분을 맡는다. 저장소 경로:
/Users/kimjoonsuk/Desktop/teambuildAI

배경: infra/terraform/ 아래 Terraform으로 이미 VPC/EC2(nginx, WAS)/RDS가
floci 위에 떠 있다. "nginx EC2 인스턴스"의 정체는 실제로는 Docker 컨테이너다
(SSH도 되지만 docker exec가 더 간단하니 그걸 써라). AMI는 Amazon Linux 2023
계열(al2023)이라 dnf 패키지 매니저를 쓴다.

할 일:
1. `cd /Users/kimjoonsuk/Desktop/teambuildAI/infra/terraform && terraform output -json`
   으로 was_private_ip를 확인한다.
2. `terraform state show aws_instance.nginx`로 nginx 인스턴스ID를 확인하고,
   `docker ps --format '{{.Names}}'`에서 `floci-ec2-<그 ID>` 컨테이너를 찾는다.
3. `docker exec <컨테이너명> dnf install -y nginx`로 nginx를 설치한다.
4. `docker exec <컨테이너명> sh -c 'cat > /etc/nginx/conf.d/teambuildai.conf <<EOF
...
EOF'` 형태로 설정 파일을 작성한다. 프록시 경로는 저장소의
   frontend/vite.config.ts 의 server.proxy 설정(/api, /admin, /static, /media, /ws)과
   똑같이 맞춰야 한다 — 그 파일을 먼저 읽고 정확한 경로 목록을 확인해라.
   프록시 대상은 http://<was_private_ip>:8000 이다.
   `/` 경로는 정적 파일을 서빙해야 하는데, 지금 단계는 프론트엔드를 아직
   빌드/배포하지 않았으니 "정적 서빙 자체가 동작하는지"만 확인할 수 있게
   `/usr/share/nginx/html/index.html`에 아무 텍스트나 넣어 확인용으로 쓴다
   (진짜 프론트 빌드 배포는 이 태스크 범위 밖).
5. `docker exec <컨테이너명> nginx -t`로 설정 문법을 검증하고,
   `docker exec <컨테이너명> nginx`(또는 `systemctl start nginx`)로 시작한다.
6. `docker exec <컨테이너명> curl -sf http://localhost/`로 정적 파일이
   나오는지 확인한다.
7. `docker exec <컨테이너명> curl -sf http://localhost/api/v1/meta/options/`로
   WAS까지 프록시가 되는지 확인한다. WAS가 아직 준비 안 됐으면 502/503이
   나올 수 있다 — 그건 정상이니 에러로 취급하지 말고, "WAS 담당 태스크가
   끝난 뒤 재확인 필요"라고 보고서에 남겨라.
8. HTTPS(TLS)는 floci에 실제 도메인이 없어 Let's Encrypt 발급이 불가능하다.
   이번 단계에서는 생략한다 — self-signed 인증서를 만들어서 443도 리스닝만
   해두면 충분하고, 실제 인증서 발급은 이 태스크 범위 밖(나중에 진짜 AWS +
   도메인이 생겼을 때 별도 진행)이다.

완료 기준: `curl http://localhost/`이 200. WAS가 준비돼 있다면
`curl http://localhost/api/v1/meta/options/`도 200.

보고서에 포함할 것: 작성한 nginx 설정 파일 전체 내용, 각 curl 명령의 실제
출력, 안 된 게 있다면 정확히 어느 단계에서 뭐가 실패했는지.
```

### Task 7 — 서브에이전트 브리핑: WAS(gunicorn) 설정

```
teambuildAI(해커톤 팀원 매칭 서비스) 프로젝트를 floci(로컬 AWS 에뮬레이터,
localhost:4566)에 배포하는 작업 중 WAS(백엔드 앱서버) 부분을 맡는다. 저장소
경로: /Users/kimjoonsuk/Desktop/teambuildAI

배경: infra/terraform/ 아래 Terraform으로 이미 VPC/EC2(nginx, WAS)/RDS가
floci 위에 떠 있다. "WAS EC2 인스턴스"의 정체는 실제로는 Docker 컨테이너다
(docker exec 사용). AMI는 Amazon Linux 2023(al2023)이라 dnf를 쓴다. RDS는
진짜 MySQL 8.0 엔진이다(가짜 아님, 직접 검증됨).

할 일:
1. `cd /Users/kimjoonsuk/Desktop/teambuildAI/infra/terraform && terraform output -json`
   으로 rds_endpoint, rds_port, s3_bucket_name을 확인하고,
   `terraform output -raw db_password`로 DB 비밀번호를 확인한다.
2. `terraform state show aws_instance.was`로 WAS 인스턴스ID를 확인, `docker
   ps`에서 `floci-ec2-<그 ID>` 컨테이너를 찾는다.
3. `docker exec <컨테이너명> dnf install -y python3.12 python3.12-pip`
   (또는 사용 가능한 python3 버전 확인 후 설치) — uv가 없으면 pip로 대체해도
   된다, 이 단계에서 uv 설치 자체에 시간 쓰지 말 것.
4. 저장소의 backend/ 디렉토리를 컨테이너에 복사한다:
   `docker cp /Users/kimjoonsuk/Desktop/teambuildAI/backend <컨테이너명>:/app`
5. 컨테이너 안에서 `pip install -r`용 requirements가 없고 pyproject.toml
   기반이니, `cd /app && pip install .` 또는 `python -m pip install
   django djangorestframework djangorestframework-simplejwt django-cors-headers
   drf-spectacular gunicorn pymysql httpx`로 필요한 패키지를 직접 설치한다
   (backend/pyproject.toml의 dependencies 목록을 먼저 읽고 정확히 맞출 것).
6. `/app/.env` 작성 (backend/.env.example 형식을 참고):
   - DJANGO_SECRET_KEY=아무 랜덤 문자열(floci 테스트용)
   - DJANGO_DEBUG=True
   - DJANGO_ALLOWED_HOSTS=*
   - CORS_ALLOWED_ORIGINS=http://localhost (임시)
   - DB_NAME=teambuild, DB_USER=teambuild(테라폼 변수 db_username 기본값),
     DB_PASSWORD=(2번에서 확인한 값), DB_HOST=(rds_endpoint에서 포트 앞부분만),
     DB_PORT=(rds_port)
   주의: rds_endpoint가 실제로 접속 가능한 호스트/IP인지 컨테이너 안에서
   `mysql -h <host> -P <port> -u teambuild -p<password> -e "SELECT 1"`로
   먼저 확인하고, 안 되면 `docker inspect`로 RDS 컨테이너의 실제 IP를 찾아서
   대신 써라 (floci의 rds_endpoint 출력이 곧바로 안 먹힐 수 있다 — 이전
   검증 세션에서 실제로 이런 이슈가 있었다).
7. `cd /app && python manage.py migrate` 실행 — 진짜 MySQL이라 진짜로
   테이블이 생긴다. 에러 없이 끝나야 한다.
8. `gunicorn config.wsgi:application --bind 0.0.0.0:8000 --daemon` 로 백그라운드
   실행.
9. `docker exec <컨테이너명> curl -sf http://localhost:8000/api/v1/meta/options/`
   로 로컬에서 확인.
10. nginx 컨테이너 쪽에서도 `docker exec <nginx 컨테이너명> curl -sf
    http://<was_private_ip>:8000/api/v1/meta/options/` 로 프라이빗 IP를 통한
    접근이 실제로 되는지 확인한다 (VPC 너머로 잘 가는지 최종 확인).

완료 기준: 9번, 10번 curl 둘 다 200과 JSON 응답.

보고서에 포함할 것: 설치한 패키지 목록, 작성한 .env 내용(비밀번호는
마스킹), migrate 출력, 두 curl의 실제 응답, 안 된 게 있다면 정확히 어느
단계에서 뭐가 실패했는지.
```

### Task 8 — 서브에이전트 브리핑: RDS 데이터 계층 검증

```
teambuildAI 프로젝트를 floci(로컬 AWS 에뮬레이터, localhost:4566)에 배포하는
작업 중 RDS(데이터 계층) 검증을 맡는다. 저장소 경로:
/Users/kimjoonsuk/Desktop/teambuildAI

전제 조건: WAS 담당 태스크가 이미 끝나서 `python manage.py migrate`가
RDS(MySQL 8.0 컨테이너)에 대해 성공적으로 실행된 상태다. 이 태스크는 그
결과를 검증하고 데모 데이터를 채우는 역할이다.

할 일:
1. `cd /Users/kimjoonsuk/Desktop/teambuildAI/infra/terraform && terraform
   output -json`으로 rds_endpoint, rds_port를 확인하고 `terraform output -raw
   db_password`로 비밀번호를 확인한다.
2. mysql 클라이언트로 직접 접속해 테이블이 실제로 생성됐는지 확인한다:
   `mysql -h <host> -P <port> -u teambuild -p<password> teambuild -e "SHOW
   TABLES;"` (접속이 안 되면 WAS 태스크 때와 마찬가지로 `docker ps`에서
   `floci-rds-*` 컨테이너를 찾아 `docker inspect <그 컨테이너>`로 실제 IP를
   확인해서 대신 시도한다).
3. Django 모델과 대조해서 최소한 다음 테이블들이 존재하는지 확인한다:
   `accounts_user`, `accounts_profile`, `hackathons_hackathon`,
   `hackathons_participation`, `matching_recommendation`, `coffeechat_coffeechat`,
   `chat_chatthread`, `notifications_notification`, `reviews_review`.
4. WAS 컨테이너에서 데모 데이터를 채운다:
   `docker exec <WAS 컨테이너명> sh -c 'cd /app && python manage.py
   seed_real_hackathons'` (이 management command가 이미 backend/hackathons/
   management/commands/seed_real_hackathons.py에 있다 — 먼저 읽고 어떤 인자를
   받는지 확인해라).
5. 다시 mysql로 접속해 `SELECT COUNT(*) FROM hackathons_hackathon;`로 seed
   데이터가 실제로 들어갔는지 확인한다.
6. `SHOW VARIABLES LIKE 'character_set_database';`로 utf8mb4로 설정됐는지
   확인한다 (backend/config/settings.py의 DATABASES OPTIONS.charset 설정이
   실제로 반영됐는지 — 한글 데이터가 깨지지 않는지 확인 차원).

완료 기준: 4번 seed 커맨드가 에러 없이 끝나고, 5번 COUNT 쿼리가 0보다 큰
값을 반환.

보고서에 포함할 것: SHOW TABLES 전체 출력, seed 커맨드 출력, COUNT 결과,
character_set_database 값.
```

---

## Phase C — 실제 AWS에서 네트워크 격리만 최종 검증

**이 Phase는 Phase A/B가 floci에서 전부 통과한 뒤에만 진행한다. 실제 AWS 비용이 발생하니 반드시 사용자 승인 후 실행.**

### Task 9: floci_override.tf 비활성화 후 실제 AWS에 apply

- [ ] **Step 1:** `mv infra/terraform/floci_override.tf infra/terraform/floci_override.tf.disabled`
- [ ] **Step 2:** `terraform.tfvars`에 실제 값 채우기 (ssh_key_name은 진짜 존재하는 키 페어, ssh_allowed_cidr는 본인 IP `/32`로 반드시 좁힐 것 — floci 때처럼 0.0.0.0/0 쓰면 안 됨)
- [ ] **Step 3:** `terraform init -reconfigure && terraform apply` (실제 AWS 자격증명 필요 — `aws configure` 상태 확인)
- [ ] **Step 4:** 소프트웨어 설정(nginx/gunicorn)은 이번 단계에서 반복하지 않는다 — 목적은 네트워크 경계 검증뿐이다.

### Task 10: 보안 경계 실제로 막히는지 확인

- [ ] **Step 1:** WAS가 인터넷에서 직접 안 보이는지: `curl -m 5 http://<terraform output was_private_ip>:8000/` 를 **로컬 머신에서** 실행 → 타임아웃(연결 안 됨)이어야 정상 (애초에 private IP라 로컬에서 라우팅 자체가 안 됨 — 이건 참고용, 진짜 테스트는 아래)
- [ ] **Step 2:** nginx 인스턴스에 SSH로 들어가서, WAS가 아닌 제3의 위치(예: 로컬 머신)에서 `nginx_public_ip`의 8000번 포트로 직접 접속 시도 — 애초에 nginx만 노출되므로 8000번 자체가 안 열려 있어야 함
- [ ] **Step 3:** RDS 보안그룹에 임시로 `0.0.0.0/0`을 추가하지 **않은 채로**, 로컬 머신에서 `mysql -h <rds_endpoint> -P 3306 ...` 직접 접속 시도 → 타임아웃이어야 정상 (RDS가 프라이빗 서브넷 + WAS-SG로만 제한돼 있으므로)
- [ ] **Step 4:** 결과를 정리해서 보고 — floci에서는 전부 뚫렸던 것과 대조되는 게 이 태스크의 핵심 산출물이다.

### Task 11: 정리 (과금 방지)

- [ ] **Step 1:** `terraform destroy` — 확인 문구에 `yes` 입력 전 삭제 대상 목록을 사람이 눈으로 한 번 확인
- [ ] **Step 2:** `floci_override.tf.disabled`를 다시 `floci_override.tf`로 되돌려서(파일명 원복) 다음 floci 검증 때 바로 쓸 수 있게 해둔다

---

## Self-Review

**Spec 커버리지:**
- ✅ nginx EC2(퍼블릭, TLS+정적서빙+리버스프록시) → Task 1, 2, 6
- ✅ WAS EC2(프라이빗, gunicorn) → Task 1, 2, 7
- ✅ RDS(프라이빗, MySQL) → Task 1, 2, 8
- ✅ S3(이미지) → 기존 s3.tf 그대로 재사용 + Task 3(엔드포인트)로 보강
- ✅ floci 기능 검증 → Phase A, B
- ✅ floci가 못 하는 네트워크 격리 검증 → Phase C
- ✅ 비용 방지(destroy) → Task 11

**타입/인터페이스 일관성:** `was_private_ip`, `rds_endpoint`, `rds_port`, `db_password`, `s3_bucket_name` — outputs.tf에 이미 정의된 이름을 모든 서브에이전트 프롬프트에서 동일하게 사용함. `was_public_ip`는 Task 2에서 삭제되므로 이후 어떤 태스크에서도 참조하지 않음(확인 완료).

**플레이스홀더 스캔:** 각 서브에이전트 프롬프트에 "적절히 처리해라" 류 문구 없음 — 정확한 명령어와 파일 경로, 실패 시 확인해야 할 대안 경로(예: RDS 엔드포인트 대신 컨테이너 IP)까지 명시함.
