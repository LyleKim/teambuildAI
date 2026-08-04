/**
 * 기능별 API 모듈.
 *
 * 화면 컴포넌트는 fetch를 직접 호출하지 않고 항상 이 레이어를 통한다.
 * 엔드포인트 경로를 바꿔야 할 때 수정 지점이 여기 하나로 모인다.
 */
import { api, toList } from './client'
import type {
  AppNotification,
  Badges,
  ChatMessage,
  ChatThread,
  CoffeeChat,
  CoffeeChatStatus,
  CurrentUser,
  Hackathon,
  MemberProfile,
  MetaOptions,
  MyProfile,
  Participation,
  ProfileInput,
  Recommendation,
  RecommendationJob,
  Team,
  TeamInput,
  TokenPair,
} from '@/types'

// ─── 인증 ─────────────────────────────────────────────────────────────────────

export const authApi = {
  /** 카카오 인가 페이지로 보낼 URL. 전체 페이지 이동이므로 fetch가 아니라 location 변경에 쓴다. */
  kakaoLoginUrl(redirectTo: string) {
    const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
    return `${base}/auth/kakao/login/?redirect_uri=${encodeURIComponent(redirectTo)}`
  },

  /** 카카오 콜백으로 받은 인가 코드를 토큰으로 교환한다. */
  exchangeCode(code: string, state?: string) {
    return api.post<TokenPair>('/auth/kakao/callback/', { code, state }, { auth: false })
  },

  me() {
    return api.get<CurrentUser>('/auth/me/')
  },

  logout() {
    return api.post<void>('/auth/logout/')
  },

  badges() {
    return api.get<Badges>('/auth/me/badges/')
  },
}

// ─── 해커톤 ───────────────────────────────────────────────────────────────────

export const hackathonApi = {
  async list(params: { q?: string; category?: string } = {}) {
    const data = await api.get<Hackathon[] | { results: Hackathon[] }>('/hackathons/', {
      // '전체'는 필터가 아니라 "필터 없음"이므로 서버로 보내지 않는다
      params: { q: params.q, category: params.category === '전체' ? undefined : params.category },
    })
    return toList(data)
  },

  detail(id: number) {
    return api.get<Hackathon>(`/hackathons/${id}/`)
  },

  async categories() {
    const data = await api.get<string[] | { results: string[] }>('/hackathons/categories/')
    const list = toList(data)
    return list.includes('전체') ? list : ['전체', ...list]
  },
}

// ─── 참가 ─────────────────────────────────────────────────────────────────────

export const participationApi = {
  join(hackathonId: number, joinType: 'individual' | 'team') {
    return api.post<Participation>(`/hackathons/${hackathonId}/participations/`, {
      join_type: joinType,
    })
  },

  async mine() {
    const data = await api.get<Participation[] | { results: Participation[] }>(
      '/me/participations/',
    )
    return toList(data)
  },

  leave(participationId: number) {
    return api.delete<void>(`/participations/${participationId}/`)
  },
}

// ─── 프로필 ───────────────────────────────────────────────────────────────────

export const profileApi = {
  mine() {
    return api.get<MyProfile>('/me/profile/')
  },

  save(input: ProfileInput) {
    return api.put<MyProfile>('/me/profile/', input)
  },

  setPrivate(isPrivate: boolean) {
    return api.patch<{ is_private: boolean }>('/me/profile/privacy/', { is_private: isPrivate })
  },

  member(userId: number) {
    return api.get<MemberProfile>(`/users/${userId}/profile/`)
  },
}

// ─── 팀 모집 ──────────────────────────────────────────────────────────────────

export const teamApi = {
  create(hackathonId: number, input: TeamInput) {
    return api.post<Team>(`/hackathons/${hackathonId}/teams/`, input)
  },

  detail(teamId: number) {
    return api.get<Team>(`/teams/${teamId}/`)
  },

  update(teamId: number, input: Partial<TeamInput>) {
    return api.patch<Team>(`/teams/${teamId}/`, input)
  },

  setStatus(teamId: number, status: string) {
    return api.patch<Team>(`/teams/${teamId}/status/`, { recruit_status: status })
  },
}

// ─── AI 추천 ──────────────────────────────────────────────────────────────────

export const recommendationApi = {
  /** 프로필/모집조건 저장 직후 호출해 추천 생성을 트리거한다. */
  generate(hackathonId: number) {
    return api.post<RecommendationJob>(`/hackathons/${hackathonId}/recommendations/`)
  },

  async list(hackathonId: number) {
    const data = await api.get<Recommendation[] | { results: Recommendation[] }>(
      `/hackathons/${hackathonId}/recommendations/`,
    )
    return toList(data)
  },

  jobStatus(jobId: string) {
    return api.get<RecommendationJob>(`/recommendations/${jobId}/status/`)
  },
}

// ─── 커피챗 ───────────────────────────────────────────────────────────────────

export const coffeechatApi = {
  send(params: { to_user_id: number; hackathon_id: number; message: string }) {
    return api.post<CoffeeChat>('/coffeechats/', params)
  },

  async received(status: CoffeeChatStatus | 'all' = 'all') {
    const data = await api.get<CoffeeChat[] | { results: CoffeeChat[] }>('/coffeechats/received/', {
      params: { status: status === 'all' ? undefined : status },
    })
    return toList(data)
  },

  async sent(status: CoffeeChatStatus | 'all' = 'all') {
    const data = await api.get<CoffeeChat[] | { results: CoffeeChat[] }>('/coffeechats/sent/', {
      params: { status: status === 'all' ? undefined : status },
    })
    return toList(data)
  },

  /** 수락하면 채팅방이 생성되므로 응답의 thread_id로 바로 이동할 수 있다. */
  accept(id: number) {
    return api.patch<CoffeeChat>(`/coffeechats/${id}/accept/`)
  },

  reject(id: number) {
    return api.patch<CoffeeChat>(`/coffeechats/${id}/reject/`)
  },

  detail(id: number) {
    return api.get<CoffeeChat>(`/coffeechats/${id}/`)
  },
}

// ─── 메시지 ───────────────────────────────────────────────────────────────────

export const chatApi = {
  async threads() {
    const data = await api.get<ChatThread[] | { results: ChatThread[] }>('/chats/threads/')
    return toList(data)
  },

  thread(threadId: number) {
    return api.get<ChatThread>(`/chats/threads/${threadId}/`)
  },

  async messages(threadId: number) {
    const data = await api.get<ChatMessage[] | { results: ChatMessage[] }>(
      `/chats/threads/${threadId}/messages/`,
    )
    return toList(data)
  },

  send(threadId: number, text: string) {
    return api.post<ChatMessage>(`/chats/threads/${threadId}/messages/`, { text })
  },

  markRead(threadId: number) {
    return api.patch<void>(`/chats/threads/${threadId}/read/`)
  },
}

// ─── 알림 ─────────────────────────────────────────────────────────────────────

export const notificationApi = {
  async list() {
    const data = await api.get<AppNotification[] | { results: AppNotification[] }>(
      '/notifications/',
    )
    return toList(data)
  },

  unreadCount() {
    return api.get<{ count: number }>('/notifications/unread-count/')
  },

  markRead(id: number) {
    return api.patch<void>(`/notifications/${id}/read/`)
  },

  markAllRead() {
    return api.patch<void>('/notifications/read-all/')
  },
}

// ─── 선택지 메타 ──────────────────────────────────────────────────────────────

export const metaApi = {
  options() {
    return api.get<MetaOptions>('/meta/options/')
  },
}

// ─── 랜딩 통계 ────────────────────────────────────────────────────────────────

export interface LandingStats {
  total_participants: number
  recruiting_teams: number
  active_hackathons: number
  satisfaction_rate: number
}

export const statsApi = {
  /** 랜딩 히어로 하단 4개 숫자. 비로그인 상태에서도 접근 가능해야 한다. */
  landing() {
    return api.get<LandingStats>('/stats/landing/', { auth: false })
  },
}

export { ApiError, tokenStore } from './client'
