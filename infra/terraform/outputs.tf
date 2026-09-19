output "nginx_public_ip" {
  description = "nginx EC2 고정 퍼블릭 IP. 도메인 A레코드와 카카오 디벨로퍼스 redirect_uri 등록에 쓴다."
  value       = aws_eip.nginx.public_ip
}

output "was_private_ip" {
  description = "WAS EC2 프라이빗 IP. nginx의 리버스 프록시(proxy_pass) 대상이자, floci 서브에이전트가 docker exec 대상 확인에 쓰는 값. WAS는 퍼블릭 IP가 없다."
  value       = aws_instance.was.private_ip
}

output "rds_endpoint" {
  description = "RDS 엔드포인트(호스트명). Django DB_HOST 환경변수에 그대로 쓴다."
  value       = aws_db_instance.main.address
}

output "rds_port" {
  value = aws_db_instance.main.port
}

output "db_password" {
  description = "RDS 마스터 비밀번호. `terraform output -raw db_password`로만 확인할 것(평소엔 안 보이게 마스킹)."
  value       = random_password.db_master.result
  sensitive   = true
}

output "s3_bucket_name" {
  description = "이미지 버킷 이름. Django 환경변수(AWS_STORAGE_BUCKET_NAME 등)에 쓴다."
  value       = aws_s3_bucket.images.bucket
}

output "s3_bucket_domain" {
  description = "버킷 객체에 붙는 기본 퍼블릭 URL 접두사 (https://<이 값>/<key>)"
  value       = aws_s3_bucket.images.bucket_regional_domain_name
}
