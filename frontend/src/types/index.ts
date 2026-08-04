/**
 * 백엔드 API 응답 타입 정의.
 * Django(DRF) 시리얼라이저와 1:1로 대응되며, snake_case를 그대로 사용한다.
 */

// ─── 공통 ─────────────────────────────────────────────────────────────────────

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type JoinType = 'individual' | 'team'
export type CoffeeChatStatus = 'pending' | 'accepted' | 'rejected'
export type NotificationType = 'request' | 'accepted' | 'rejected' | 'recommendation'

/** 서버가 내려주는 화면 이동 대상. 프론트 라우팅 경로로 변환해서 쓴다. */
export type NotificationTarget =
  | 'coffeechat-inbox'
  | 'coffeechat-matched'
  | 'ai-results'
  | 'messages'
  | 'member-profile'

export const LINK_TYPES = [
  'GitHub',
  '블로그',
  'Instagram',
  'Notion',
  'Behance',
  'LinkedIn',
  '기타',
] as const
export type LinkType = (typeof LINK_TYPES)[number]

export interface PortfolioLink {
  type: LinkType
  url: string
}

// ─── 인증 / 사용자 ────────────────────────────────────────────────────────────

export interface TokenPair {
  access: string
  refresh: string
}

export interface Badges {
  unread_notification_count: number
  unread_message_count: number
}

export interface CurrentUser {
  id: number
  name: string
  email: string
  /** 아바타에 표시할 이니셜. 서버가 안 주면 name에서 파생한다. */
  initial?: string
  avatar_url?: string | null
  /** 마이페이지 요약 줄: "백엔드 · Django/Python · 주말 올인 · 수상 목적" */
  summary?: string
  is_private: boolean
  badges?: Badges
}

// ─── 해커톤 ───────────────────────────────────────────────────────────────────

export interface Hackathon {
  id: number
  title: string
  category: string
  /** '모집 중' | '모집 마감' 등 서버 문자열 */
  status: string
  /** 표시용 기간 문자열. 서버가 start_date/end_date만 주면 date는 프론트에서 조립 */
  date: string
  start_date?: string
  end_date?: string
  participants: number
  teams: number
  /** 배너 그라디언트 시작 색. 배너 이미지가 있으면 banner_url 우선 */
  color: string
  banner_url?: string | null
  description: string
}

// ─── 참가 현황 ────────────────────────────────────────────────────────────────

export interface Participation {
  id: number
  hackathon: Pick<Hackathon, 'id' | 'title'>
  join_type: JoinType
  /** '모집 중' | '매칭 완료' | '재모집' | '모집 마감' | '비공개' */
  status: string
  /** join_type === 'team' 일 때 모집 조건 수정으로 연결할 팀 id */
  team_id: number | null
}

// ─── 프로필 ───────────────────────────────────────────────────────────────────

/** 프로필 작성/수정 시 서버로 보내는 페이로드 */
export interface ProfileInput {
  roles: string[]
  skills: string[]
  available_time: string
  regions: string[]
  goal: string
  collaboration: string
  communication: string
  interests: string[]
  one_liner: string
  bio_style: string
  bio_strength: string
  bio_experience: string
  bio_goal: string
  bio_contribution: string
  links: PortfolioLink[]
  open_chat: string
  is_private: boolean
}

export type MyProfile = ProfileInput

/** 다른 사람의 프로필 상세. 연락처는 커피챗 수락 전까지 잠긴다. */
export interface MemberProfile {
  id: number
  name: string
  initial?: string
  roles: string[]
  skills: string[]
  available_time: string
  goal: string
  collaboration: string
  communication: string
  interests: string[]
  one_liner: string
  bio_style: string
  bio_strength: string
  bio_experience: string
  bio_goal: string
  bio_contribution: string
  links: PortfolioLink[]
  /** 커피챗 수락 전에는 반드시 null 이어야 한다 (서버에서 마스킹) */
  open_chat: string | null
  open_chat_locked: boolean
  /** 내가 이 사람에게 이미 커피챗을 보냈는지 */
  coffeechat_sent: boolean
  coffeechat_status: CoffeeChatStatus | null
}

// ─── 팀 모집 ──────────────────────────────────────────────────────────────────

/** 역할명 → 인원수 */
export type RoleCount = Record<string, number>

export interface TeamInput {
  current_members: RoleCount
  needed_roles: RoleCount
  message: string
  collaboration: string
  communication: string
  open_chat_link: string
  recruit_status: string
}

export interface Team extends TeamInput {
  id: number
  hackathon: Pick<Hackathon, 'id' | 'title'>
}

// ─── AI 추천 ──────────────────────────────────────────────────────────────────

export interface RecommendedPerson {
  id: number
  name: string
  initial?: string
  roles: string[]
  skills: string[]
}

export interface Recommendation {
  id: number
  person: RecommendedPerson
  score: number
  fit_points: string
  complement: string
  check_point: string
  reason: string
  coffeechat_sent: boolean
}

/** 추천 생성 작업의 진행 상태 */
export interface RecommendationJob {
  job_id: string
  status: 'pending' | 'running' | 'done' | 'failed'
}

// ─── 커피챗 ───────────────────────────────────────────────────────────────────

export interface CoffeeChatPerson {
  id: number
  name: string
  initial?: string
  role: string
}

export interface CoffeeChat {
  id: number
  /** 받은 신청이면 보낸 사람, 보낸 신청이면 받는 사람 */
  counterpart: CoffeeChatPerson
  hackathon: Pick<Hackathon, 'id' | 'title'>
  message: string
  status: CoffeeChatStatus
  created_at: string
  /** 수락된 경우에만 채워진다 */
  thread_id: number | null
}

// ─── 메시지 ───────────────────────────────────────────────────────────────────

export interface ChatThread {
  id: number
  /** 대화 상대의 user id — 프로필 보기로 연결 */
  person_id: number
  name: string
  initial?: string
  role: string
  hackathon: string
  last_message: string
  last_time: string
  unread: number
}

export interface ChatMessage {
  id: number
  /** 'me' 는 서버가 요청자 기준으로 판단해서 내려준다 */
  from: 'me' | 'them'
  text: string
  time: string
  date: string
  created_at: string
}

// ─── 알림 ─────────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: number
  type: NotificationType
  icon: string
  text: string
  time: string
  target: NotificationTarget
  target_id: number | null
  read: boolean
}

// ─── 선택지 메타 ──────────────────────────────────────────────────────────────

/** 칩/셀렉트 선택지를 서버에서 관리하기 위한 응답 */
export interface MetaOptions {
  categories: string[]
  roles: string[]
  skills: string[]
  available_times: string[]
  regions: string[]
  goals: string[]
  collaborations: string[]
  communications: string[]
  interests: string[]
  recruit_statuses: string[]
}
