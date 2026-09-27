# 1. 빌드 단계 (Build Stage)
FROM node:22-alpine AS builder
WORKDIR /app

# pnpm 패키지 매니저 활성화
RUN corepack enable && corepack prepare pnpm@latest --activate

# 의존성 파일 복사 및 설치
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 전체 소스 코드 복사 후 빌드 (dist 폴더 생성)
COPY . .
RUN pnpm build

# 2. 실행 단계 (Nginx)
FROM nginx:alpine

COPY default.conf /etc/nginx/conf.d/default.conf

# 빌드 결과물(dist)을 Nginx 정적 파일 경로로 복사
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]