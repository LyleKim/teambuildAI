# 3계층(nginx -> WAS -> RDS) 각각을 별도 보안그룹으로 나누고, 앞 계층의
# 보안그룹 ID를 참조하는 방식(cidr_blocks 대신 security_groups)으로 허용한다.
# 이렇게 하면 "WAS의 사설 IP가 나중에 바뀌어도" 규칙을 안 고쳐도 되고,
# 무엇보다 "이 포트는 정확히 어떤 계층에서만 들어올 수 있는지"가 규칙 자체에
# 드러나서 나중에 감사(audit)하기 쉽다.
#
# description은 AWS 제약상 영문/숫자만 허용돼서(정규식 검증) 영어로 쓴다.

resource "aws_security_group" "nginx" {
  name        = "${local.name_prefix}-nginx-sg"
  description = "Internet-facing entrypoint. Only HTTP/HTTPS/SSH."
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP (redirected to HTTPS by nginx)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH from admin IP only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
  }

  egress {
    description = "Allow all outbound (package installs, calls to WAS/RDS)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name_prefix}-nginx-sg" }
}

resource "aws_security_group" "was" {
  name        = "${local.name_prefix}-was-sg"
  description = "gunicorn(8000) only reachable from the nginx security group. No direct browser access."
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "gunicorn from nginx only"
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.nginx.id]
  }

  ingress {
    description = "SSH from admin IP only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
  }

  egress {
    description = "Allow all outbound (RDS access, Kakao/Groq API calls)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name_prefix}-was-sg" }
}

resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds-sg"
  description = "MySQL(3306) only reachable from the WAS security group. This is the only inbound rule."
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "MySQL from WAS only"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.was.id]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name_prefix}-rds-sg" }
}
