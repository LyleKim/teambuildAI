# teambuildAI

> **파비콘** — 가장 잘 맞는 팀원과 연결되는 순간
  
해커톤에 나가고 싶지만 **함께할 팀원이 없어 망설이는 대학생**을 위한 AI 기반 팀 매칭 플랫폼입니다.
  
  
## 목차  
  
- [배경](#배경)  
- [주요 기능](#주요-기능)  
- [기술 스택](#기술-스택)  
- [프로젝트 구조](#프로젝트-구조)  
- [시작하기](#시작하기)  
- [테스트 방법](./QA.md)  
- [팀](#팀)  
  
  
  
## 배경  
  
해커톤 수상 경험은 대학생에게 의미 있는 포트폴리오가 되지만, 실력과 의지가 있어도 **"혼자 다 해야 한다"는 부담** 때문에 참가를 포기하는 경우가 많습니다.  
  
기존 구인 게시판(캠퍼스픽, 링커리어 등)은 다음과 같은 한계가 있습니다.  
  
| 문제 | 설명 |  
| --- | --- |  
| **일방향 구조** | 글을 올리고 연락을 기다리는 것 외에 할 수 있는 일이 없음 |  
| **낮은 노출** | 조회수는 있어도 실제 연락으로 이어지지 않음 |  
| **신뢰 부족** | 텍스트 몇 줄로는 상대의 진정성과 역량을 판단할 수 없어 서로 연락을 꺼림 |  
| **낮은 지속성** | 어렵게 연결되어도 성향이 맞지 않아 팀이 와해됨 |  
  
> 실제로 팀원 중 한 명이 해커톤 구인글을 올렸을 때, 수십 명이 글을 조회했지만 연락은 단 한 건도 오지 않았습니다. **"왜 아무도 먼저 말을 걸지 않았을까?"** 라는 질문에서 이 프로젝트가 시작되었습니다.

  
**핵심 차별점** — 사용자가 먼저 다가가야 하는 구조가 아니라, **AI가 대신 말을 걸어주는 구조**입니다. 거절의 부담이 사람이 아닌 시스템으로 옮겨가면서 위축 심리가 크게 줄어듭니다.
  
  
## 주요 기능  

- **해커톤 정보 탐색** — 진행 중인 해커톤 정보를 한곳에서 확인  
- **프로필 기반 AI 매칭** — 성격, 보유 역량, 참여 경험, 자기소개를 종합해 팀 적합도 추천  
- **양방향 제안 시스템** — 한쪽만의 신청이 아닌, AI가 양측 모두에게 동시에 제안  
- **상호 수락형 채팅** — 두 사람이 모두 수락한 경우에만 대화방 개설  
- **오프라인 연결 지원** — 커피챗 등 가벼운 만남으로 이어지는 흐름 설계  
  
  
## 기술 스택  
  
### Frontend  
  
| 분류 | 기술 | 버전 |  
| --- | --- | --- |  
| 언어 | TypeScript | `^5.7` |  
| 프레임워크 | React | `^19.0` |  
| 빌드 도구 | Vite | `^8.0` |  
| 스타일링 | Tailwind CSS | `^4.0` |  
| 상태/데이터 | 자체 `useQuery` / `useMutation` 훅 + React Context | — |  
| 포맷터 | oxfmt | `^0.2` |  
| 패키지 매니저 | pnpm | `10.34.3` |  
| 런타임 | Node.js | `22` |  
  
> 데이터 페칭은 React Query 등 외부 라이브러리 없이 **자체 훅으로 구현**했습니다. 의존성을 최소화하고 캐싱, 재검증 로직을 프로젝트 요구사항에 맞게 직접 제어하기 위한 선택입니다.  
  
### Backend  
  
| 분류 | 기술 | 버전 |  
| --- | --- | --- |  
| 언어 | Python | `3.14` |  
| 프레임워크 | Django | `^6.0.7` |  
| DB 드라이버 | PyMySQL (순수 Python 구현) | `^1.2` |  
| 패키지 매니저 | uv | — |  
| API 레이어 | 미구축 (DRF 미설치) | — |  
  
  
### Database  
  
| 분류 | 내용 |  
| --- | --- |  
| DBMS | MySQL `8.4` (Docker 이미지) |  
| Charset | `utf8mb4` / `utf8mb4_unicode_ci` (한글 및 이모지 지원) |  
  
  
## 프로젝트 구조  
  
```
.
├── frontend/               # React + TypeScript (Vite)
│   ├── src/
│   │   ├── components/     # 공통 UI 컴포넌트
│   │   ├── hooks/          # 자체 useQuery / useMutation 구현
│   │   ├── pages/          # 라우팅 단위 페이지
│   │   ├── contexts/       # 전역 상태 (React Context)
│   │   └── lib/            # API 클라이언트, 유틸리티
│   ├── vite.config.ts      # dev 프록시 설정 (/api, /admin → backend:8000)
│   └── package.json
│
├── backend/                # Django
│   ├── apps/               # 도메인별 앱 (accounts, contests, matching, chat)
│   ├── config/             # settings, urls, wsgi/asgi
│   ├── pyproject.toml      # uv 기반 의존성 관리
│   └── Dockerfile
│
├── docker-compose.yml      # backend + db 구성
└── README.md
```
  
  
## 시작하기  
  
### 요구 사항  
  
- Docker / Docker Compose  
- Node.js `22` 이상  
- pnpm `10.34.3`  
  
### 1. 저장소 클론  
  
```bash
git clone <repository-url>
cd favicon
```
  
### 2. 백엔드 & 데이터베이스 실행  
  
```bash
docker compose up -d
```
  
MySQL 컨테이너와 Django 개발 서버가 함께 기동됩니다.  
DB 데이터는 named volume에 저장되어 컨테이너를 재생성해도 유지됩니다.  
  
```bash
# 마이그레이션
docker compose exec backend uv run python manage.py migrate

# 관리자 계정 생성
docker compose exec backend uv run python manage.py createsuperuser

# 홈 화면에 보여줄 실제 해커톤 6개 심기 (마이그레이션이 아니라 커맨드라 migrate만으론 안 채워짐)
docker compose exec backend uv run python manage.py seed_real_hackathons
```
  
### 3. 프론트엔드 실행  
  
```bash
cd frontend
pnpm install
pnpm dev
```
  
`http://localhost:5173` 에서 접속할 수 있으며, `/api` 와 `/admin` 요청은 Vite 프록시를 통해 `backend:8000` 으로 전달됩니다.
  
### 4. 코드 포맷팅  
  
```bash
pnpm format          # oxfmt
```
  
  

## 테스트 방법  

전 기능 테스트 절차는 [QA.md](./QA.md)를 참고하세요.
  
  

## 팀  
  
숭실대학교 SSU-WAY 프로젝트 참여 팀입니다.  
<div> 
  <div style="display: inline-block; text-align: center; margin-right: 15px;">
    <a href="https://github.com/LyleKim" target="_blank">
      <img src="https://github.com/LyleKim.png" width="40" style="border-radius:50%;" alt="LyleKim" />
    </a>
    <div style="font-size: 12px; margin-top: 4px;">LyleKim</div>
  </div>
</div>

</div>
  <div style="display: inline-block; text-align: center; margin-right: 15px;">
    <a href="https://github.com/minch-070605" target="_blank">
      <img src="https://github.com/minch-070605.png" width="40" style="border-radius:50%;" alt="minch-070605" />
    </a>
    <div style="font-size: 12px; margin-top: 4px;">minch-070605</div>
  </div>
</div>

</div>
  <div style="display: inline-block; text-align: center; margin-right: 15px;">
    <a href="https://github.com/changmin0293" target="_blank">
      <img src="https://github.com/changmin0293.png" width="40" style="border-radius:50%;" alt="changmin0293" />
    </a>
    <div style="font-size: 12px; margin-top: 4px;">changmin0293</div>
  </div>
</div>

</div>
  <div style="display: inline-block; text-align: center; margin-right: 15px;">
    <a href="https://github.com/shim75" target="_blank">
      <img src="https://github.com/shim75.png" width="40" style="border-radius:50%;" alt="shim75" />
    </a>
    <div style="font-size: 12px; margin-top: 4px;">shim75</div>
  </div>
</div>

</div>
  <div style="display: inline-block; text-align: center; margin-right: 15px;">
    <div target="_blank">
      <img src="https://avatars.slack-edge.com/2025-05-14/8891273522918_30c38bf627ac73075db6_512.png" width="40" style="border-radius:50%;" alt="Claude AI" />
    </div>
    <div style="font-size: 12px; margin-top: 4px;">Claude AI</div>
  </div>  
</div>
<br/>


  
## 라이선스

추후 결정 예정입니다.