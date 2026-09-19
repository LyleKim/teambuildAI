# 해커톤 배너/프로필 이미지 저장용. 이미지는 프론트가 <img src="...">로 바로
# 물어야 하니 객체를 공개 읽기로 둔다 — 대신 "누가 뭘 올릴 수 있는지"는 IAM
# (WAS 인스턴스 롤 등)으로 따로 통제해야 한다. 이 버킷 자체는 "쓰기"를 열어주지
# 않는다, "읽기"만 공개다.

resource "aws_s3_bucket" "images" {
  bucket = var.s3_bucket_name

  tags = { Name = "${local.name_prefix}-images" }
}

resource "aws_s3_bucket_versioning" "images" {
  bucket = aws_s3_bucket.images.id

  versioning_configuration {
    # 잘못된 덮어쓰기/삭제를 되돌릴 수 있게. 이미지 몇 장 수준이라 스토리지
    # 비용 부담은 무시할 만하다.
    status = "Enabled"
  }
}

# 2023년 이후 S3 신규 버킷은 기본적으로 퍼블릭 액세스가 전면 차단된다(AWS가
# 실수로 데이터를 공개하는 사고를 막으려고 강제한 정책). "객체를 공개 읽기로
# 만들겠다"는 의도를 명시적으로 풀어줘야 아래 버킷 정책이 실제로 먹는다.
resource "aws_s3_bucket_public_access_block" "images" {
  bucket = aws_s3_bucket.images.id

  block_public_acls       = true  # ACL 방식의 공개는 계속 막는다 (구식 방식, 정책으로 대체)
  block_public_policy     = false # 버킷 정책을 통한 공개는 허용
  ignore_public_acls      = true
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "images_public_read" {
  bucket = aws_s3_bucket.images.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadOnly"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.images.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.images]
}

# 프론트(브라우저)가 이 버킷의 이미지를 fetch/img 태그로 직접 불러올 때
# 브라우저 CORS 정책에 걸리지 않도록 허용한다.
resource "aws_s3_bucket_cors_configuration" "images" {
  bucket = aws_s3_bucket.images.id

  cors_rule {
    allowed_methods = ["GET"]
    allowed_origins = ["*"]
    allowed_headers = ["*"]
    max_age_seconds = 3600
  }
}
