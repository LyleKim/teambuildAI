# PyMySQL을 MySQLdb API로 노출한다.
# Django의 mysql 백엔드는 기본적으로 mysqlclient(MySQLdb)를 찾는데,
# 우리는 시스템 컴파일 의존성이 없는 순수 Python 드라이버(PyMySQL)를 쓴다.
import pymysql

pymysql.install_as_MySQLdb()
