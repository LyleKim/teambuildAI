#!/bin/sh
# MySQL 최초 초기화 시 mysqld가 임시 소켓으로 부트스트랩했다가 재시작하는데,
# 그 사이 healthcheck가 잠깐 통과해버려 backend가 너무 일찍 붙는 경우가 있다.
# 재시작으로 포트가 잠깐 닫혔다 열리므로, 연속 3회 성공해야 "진짜 준비됨"으로 본다.
set -e

host="${DB_HOST:-db}"
port="${DB_PORT:-3306}"

check() {
  python -c "import socket; socket.create_connection(('$host', $port), timeout=1).close()" 2>/dev/null
}

echo "Waiting for MySQL at $host:$port..."
attempts=0
consecutive=0
until [ "$consecutive" -ge 3 ]; do
  if check; then
    consecutive=$((consecutive + 1))
  else
    consecutive=0
  fi
  attempts=$((attempts + 1))
  if [ "$attempts" -ge 60 ]; then
    echo "MySQL did not become stably available in time" >&2
    exit 1
  fi
  sleep 1
done
echo "MySQL is up."

exec "$@"
