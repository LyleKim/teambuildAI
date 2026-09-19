# 프라이빗 서브넷(WAS)에서 S3로 가는 트래픽이 NAT Gateway를 거치지 않고
# AWS 백본으로 바로 나가게 한다 — 무료이고, NAT의 데이터 처리 과금도 아낀다.
# (실무에서 자주 놓치는 비용 최적화 포인트라 일부러 정석대로 넣는다.)
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  tags = { Name = "${local.name_prefix}-s3-endpoint" }
}
