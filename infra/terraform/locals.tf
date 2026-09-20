# 접두사 관리. 
locals {
  # 모든 리소스 이름에 공통으로 붙이는 접두사. "teambuildai-experiment-nginx-sg" 처럼
  # 콘솔에서 리소스 목록을 볼 때 프로젝트/환경별로 한눈에 구분되게 한다.
  name_prefix = "${var.project_name}-${var.environment}"
}
