import type { CoffeeChatStatus, LinkType, MetaOptions, NotificationType } from '@/types'

/**
 * `/meta/options/` 응답을 못 받았을 때 쓰는 기본 선택지.
 * 서버가 응답하면 그 값이 우선한다 (useMetaOptions 참고).
 */
export const DEFAULT_META_OPTIONS: MetaOptions = {
  categories: ['전체', 'AI', '핀테크', '헬스케어', '커리어', '소셜'],
  roles: ['기획', '디자인', '백엔드', '프론트엔드', 'AI/ML'],
  skills: ['Django', 'React', 'Figma', 'Python', 'TypeScript', 'Node.js'],
  available_times: ['평일 저녁', '주말 위주', '주말 올인', '자유'],
  regions: ['서울', '경기', '온라인'],
  goals: ['수상 목적', '포트폴리오', '경험'],
  collaborations: ['오프라인 위주', '온라인 위주', '혼합'],
  communications: ['직설적 피드백 선호', '부드러운 소통 선호', '상관없음'],
  interests: ['AI', '핀테크', '헬스케어', '커리어', '소셜'],
  recruit_statuses: ['모집 중', '매칭 완료', '재모집', '모집 마감', '비공개'],
}

export const LINK_META: Record<LinkType, { icon: string; color: string; bg: string; border: string }> = {
  GitHub: { icon: '🐙', color: 'text-[#0F172A]', bg: 'bg-[#F1F5F9]', border: 'border-[#E2EAF4]' },
  블로그: { icon: '📝', color: 'text-[#0F172A]', bg: 'bg-[#F0F9FF]', border: 'border-[#BAE6FD]' },
  Instagram: { icon: '📷', color: 'text-[#EC4899]', bg: 'bg-[#FDF2F8]', border: 'border-[#FBCFE8]' },
  Notion: { icon: '📋', color: 'text-[#0F172A]', bg: 'bg-[#F8FAFC]', border: 'border-[#E2EAF4]' },
  Behance: { icon: '🎨', color: 'text-[#0047FF]', bg: 'bg-[#EFF6FF]', border: 'border-[#BFDBFE]' },
  LinkedIn: { icon: '💼', color: 'text-[#0369A1]', bg: 'bg-[#F0F9FF]', border: 'border-[#BAE6FD]' },
  기타: { icon: '🔗', color: 'text-[#64748B]', bg: 'bg-[#F1F5F9]', border: 'border-[#E2EAF4]' },
}

export const COFFEECHAT_STATUS_BADGE: Record<CoffeeChatStatus, { label: string; cls: string }> = {
  pending: { label: '대기중', cls: 'text-[#F59E0B] bg-[#FFF7ED] border border-[#FDE68A]' },
  accepted: { label: '수락됨', cls: 'text-[#22C55E] bg-[#F0FDF4] border border-[#BBF7D0]' },
  rejected: { label: '거절됨', cls: 'text-[#F43F5E] bg-[#FFF1F2] border border-[#FECDD3]' },
}

export const COFFEECHAT_FILTERS: { label: string; value: CoffeeChatStatus | 'all' }[] = [
  { label: '전체', value: 'all' },
  { label: '대기중', value: 'pending' },
  { label: '수락됨', value: 'accepted' },
  { label: '거절됨', value: 'rejected' },
]

export const RECRUIT_STATUS_STYLES: Record<string, string> = {
  '모집 중': 'text-[#22C55E] bg-[#F0FDF4] border border-[#BBF7D0]',
  '매칭 완료': 'text-[#0EA5E9] bg-[#E0F2FE] border border-[#BAE6FD]',
  재모집: 'text-[#F59E0B] bg-[#FFF7ED] border border-[#FDE68A]',
  '모집 마감': 'text-[#64748B] bg-[#F1F5F9] border border-[#E2EAF4]',
  비공개: 'text-[#64748B] bg-[#F1F5F9] border border-[#E2EAF4]',
}

export const NOTIF_ICON_STYLE: Record<NotificationType, { bg: string; color: string }> = {
  request: { bg: '#FFF7ED', color: '#F59E0B' },
  accepted: { bg: '#F0FDF4', color: '#22C55E' },
  rejected: { bg: '#FFF1F2', color: '#F43F5E' },
  recommendation: { bg: '#F0F9FF', color: '#0EA5E9' },
}

/** NavBar 탭 라벨 → 라우트 경로 */
export const NAV_ITEMS: { label: string; path: string }[] = [
  { label: '홈', path: '/hackathons' },
  { label: '추천', path: '/hackathons' },
  { label: '커피챗', path: '/coffeechats' },
  { label: '내 현황', path: '/my/status' },
  { label: '마이페이지', path: '/mypage' },
]

/** 메시지 폴링 주기(ms). WebSocket 도입 전까지의 임시 수단. */
export const CHAT_POLL_INTERVAL = 5000

/** 알림 배지 폴링 주기(ms) */
export const BADGE_POLL_INTERVAL = 30000
