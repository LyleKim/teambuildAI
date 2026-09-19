# provider가 누구인지(AWS, Azure, GCP), 그 정보는 어떻게 되는지 알려줘
provider "aws" {
  region = var.aws_region

  # 모든 리소스에 자동으로 붙는 공통 태그. 리소스마다 tags 블록을 반복 안 써도
  # 비용 추적(Cost Explorer)이나 "이거 누가 만든 거지"를 나중에 태그로 필터링할 수 있다.
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

provider "random" {}
