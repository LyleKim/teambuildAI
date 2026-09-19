# ─── VPC ────────────────────────────────────────────────────────────────────

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${local.name_prefix}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${local.name_prefix}-igw" }
}

# 하드코딩된 "ap-northeast-2a" 대신 계정/리전에서 실제로 쓸 수 있는 AZ 목록을
# 조회해서 쓴다 — AZ 이름은 계정마다 물리적으로 다른 데이터센터를 가리킬 수 있어서
# (AZ ID는 같아도) 하드코딩하면 다른 계정/리전에 그대로 재사용할 때 깨진다.
data "aws_availability_zones" "available" {
  state = "available"
}

# ─── 서브넷 ──────────────────────────────────────────────────────────────────
#
# floci(로컬 무료 검증)에서는 비용 문제가 없어 NAT Gateway를 포함한 정석 구조를
# 쓴다. WAS/RDS는 프라이빗 서브넷에 있고, 아웃바운드(패키지 설치, 외부 API 호출)는
# NAT Gateway를 거친다. 실제 AWS에 이관할 때는 NAT Gateway 과금(월 3만원+)을
# 감안해 "SG로만 방어 + 퍼블릭 서브넷" 버전으로 되돌릴지 재검토할 것 — 이건 이
# 플랜 범위 밖의 별도 의사결정이다.

resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = { Name = "${local.name_prefix}-public-${count.index + 1}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${local.name_prefix}-public-rt" }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

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
