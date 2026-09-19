# RDS 마스터 비밀번호를 변수로 손으로 넘기지 않고 Terraform이 직접 생성하게 한다
# (사람이 tfvars에 비밀번호를 적어두는 습관 자체를 없애는 게 목적).
# special = false인 이유: RDS 마스터 비밀번호는 '/', '@', '"', 공백을 못 쓴다 —
# 특수문자 허용 범위를 일일이 맞추느니 영숫자만 쓰는 게 더 안전하다.
resource "random_password" "db_master" {
  length  = 20
  special = false
}

# RDS는 "DB 서브넷 그룹"이 최소 2개 AZ에 걸쳐 있어야 생성이 된다 — 지금은
# 인스턴스가 하나뿐이라 이 중 한 AZ에만 실제로 뜨지만, 나중에 Multi-AZ로 바꿀
# 여지를 위해 AWS가 강제하는 제약이다.
resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${local.name_prefix}-db-subnet-group" }
}

resource "aws_db_instance" "main" {
  identifier = "${local.name_prefix}-db"

  engine = "mysql"
  # Django 6.x부터 MySQL 백엔드 최소 지원 버전이 8.4로 올라갔다
  # (django.db.backends.mysql.features.minimum_database_version). backend/pyproject.toml이
  # django>=6.0.7을 고정하고 있으므로 RDS도 8.4 이상이어야 한다 — floci 검증 중
  # 8.0으로 뒀다가 migrate가 NotSupportedError로 깨지는 걸 실제로 확인했다.
  engine_version = "8.4"

  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_master.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # 서브넷 자체는 "퍼블릭"이지만 이 플래그 덕에 RDS는 퍼블릭 IP를 아예 안 받는다 —
  # was-sg를 통과한 트래픽만 도달 가능하다.
  publicly_accessible = false

  multi_az                = false # 학습/실험 단계: 이중화 비용 안 씀. 운영 전환 시 true로.
  backup_retention_period = 1
  skip_final_snapshot     = true # 실험용이라 destroy 시 최종 스냅샷 안 만듦. 실데이터 쌓이면 false로.
  deletion_protection     = false

  tags = { Name = "${local.name_prefix}-db" }
}
