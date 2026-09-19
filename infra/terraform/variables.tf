# 테라폼 내에서 사용할 변수명을 정의한다.
variable "aws_region" {
  description = "리소스를 배포할 AWS 리전"
  type        = string
  default     = "ap-northeast-2"
}

variable "environment" {
  description = "환경 이름. 태그와 리소스 이름 접두사에 쓰인다."
  type        = string
  default     = "experiment"
}

variable "project_name" {
  description = "리소스 이름/태그 접두사"
  type        = string
  default     = "teambuildai"
}

# ─── 네트워크 ──────────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  description = "VPC CIDR 블록"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = <<-EOT
    퍼블릭 서브넷 CIDR 목록. 반드시 2개 이상 필요하다 — RDS가 요구하는
    DB 서브넷 그룹은 최소 2개의 가용영역(AZ)에 걸쳐 있어야 하기 때문
    (인스턴스 자체는 그중 하나에만 뜨더라도, 장애 시 다른 AZ로 옮길 수 있게
    AWS가 강제하는 제약이다).
  EOT
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "프라이빗 서브넷 CIDR 목록 (WAS, RDS가 여기 위치)"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

# ─── EC2 ──────────────────────────────────────────────────────────────────────

variable "instance_type" {
  description = "nginx/WAS EC2 인스턴스 타입"
  type        = string
  default     = "t3.micro"
}

variable "ssh_key_name" {
  description = <<-EOT
    EC2 접속용으로 미리 만들어둔 AWS 키 페어 이름.
    Terraform이 새로 만들게 하지 않는 이유: 개인키를 Terraform 상태 파일에
    남기지 않기 위해서다(상태 파일이 유출되면 서버 SSH 키까지 같이 새는 꼴).
    먼저 아래 명령으로 만들고 .pem 파일을 안전한 곳에 보관할 것:
      aws ec2 create-key-pair --key-name teambuildai --query 'KeyMaterial' --output text > teambuildai.pem
      chmod 400 teambuildai.pem
  EOT
  type        = string
}

variable "ssh_allowed_cidr" {
  description = <<-EOT
    SSH(22번 포트) 접속을 허용할 IP 대역(CIDR, 예: 1.2.3.4/32).
    0.0.0.0/0으로 두면 전 세계에 SSH 포트를 여는 것이므로 절대 금지 —
    본인 공인 IP만 허용한다. IP 확인: curl ifconfig.me
  EOT
  type        = string
}

# ─── RDS ──────────────────────────────────────────────────────────────────────

variable "db_instance_class" {
  description = "RDS 인스턴스 클래스"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS 스토리지(GB). 프리티어 한도가 20GB라 기본값을 그에 맞췄다."
  type        = number
  default     = 20
}

variable "db_name" {
  description = "최초 생성할 데이터베이스 이름 (Django DB_NAME과 맞출 것)"
  type        = string
  default     = "teambuild"
}

variable "db_username" {
  description = "DB 마스터 사용자명 (Django DB_USER와 맞출 것)"
  type        = string
  default     = "teambuild"
}

# ─── S3 ───────────────────────────────────────────────────────────────────────

variable "s3_bucket_name" {
  description = "이미지 저장용 S3 버킷 이름. S3 버킷 이름은 전 세계에서 유니크해야 한다."
  type        = string
}
