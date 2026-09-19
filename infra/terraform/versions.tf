# 테라폼의 버전 정보, aws 정보 등을 기록한다.
terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # 지금은 학습/실험 단계라 상태 파일을 로컬에 둔다. 상태 파일에는 RDS 비밀번호 같은
  # 민감정보가 평문으로 들어가므로 절대 git에 커밋하지 말 것(.gitignore 처리됨).
  # 팀원이 늘거나 CI에서 apply하게 되면 아래처럼 S3 backend로 옮긴다 — 그래야
  # 여러 명이 동시에 apply해도 DynamoDB 잠금으로 상태 파일이 깨지지 않는다.
  #
  # backend "s3" {
  #   bucket         = "teambuildai-tfstate"
  #   key            = "experiment/terraform.tfstate"
  #   region         = "ap-northeast-2"
  #   dynamodb_table = "teambuildai-tfstate-lock"
  #   encrypt        = true
  # }
}
