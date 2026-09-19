# 특정 AMI ID를 하드코딩하면 리전이 다르거나 시간이 지나 이미지가 deprecate되면
# apply가 깨진다. "최신 Amazon Linux 2023 x86_64" 조건으로 항상 최신 걸 찾게 한다.
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ─── nginx (TLS 종료 + 정적 파일 서빙 + 리버스 프록시) ──────────────────────────
#
# 소프트웨어 설치(nginx, certbot 설정)는 이 Terraform 코드의 책임이 아니다.
# Terraform은 "인프라를 준비"하는 도구고, 그 위에 뭘 올릴지(configuration
# management)는 Ansible이나 수동 SSH의 몫으로 일부러 분리해뒀다 — 두 관심사를
# 섞으면 나중에 "이 서버 상태가 왜 이런지" 추적하기 어려워진다.

resource "aws_instance" "nginx" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public[0].id
  vpc_security_group_ids      = [aws_security_group.nginx.id]
  key_name                    = var.ssh_key_name
  associate_public_ip_address = true

  root_block_device {
    volume_type = "gp3"
    volume_size = 20
  }

  tags = { Name = "${local.name_prefix}-nginx" }
}

# nginx는 도메인 A레코드/카카오 redirect_uri가 이 IP를 가리켜야 해서 재시작해도
# 안 바뀌는 고정 IP(EIP)가 필요하다.
resource "aws_eip" "nginx" {
  instance = aws_instance.nginx.id
  domain   = "vpc"

  tags = { Name = "${local.name_prefix}-nginx-eip" }
}

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
