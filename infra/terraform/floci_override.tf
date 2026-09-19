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
