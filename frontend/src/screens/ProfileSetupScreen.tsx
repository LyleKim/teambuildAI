import { useEffect, useState } from 'react'
import { profileApi, recommendationApi } from '@/api'
import { Page } from '@/components/NavBar'
import { ErrorState, LoadingState } from '@/components/states'
import { ChipGroup, InlineError, PrimaryButton, Toggle } from '@/components/ui'
import { useMetaOptions } from '@/hooks/useMetaOptions'
import { useMutation } from '@/hooks/useMutation'
import { useQuery } from '@/hooks/useQuery'
import { LINK_META } from '@/lib/constants'
import { toArray, toSingle } from '@/lib/format'
import { routes, useNavigate } from '@/lib/router'
import { LINK_TYPES } from '@/types'
import type { LinkType, PortfolioLink, ProfileInput } from '@/types'

const BIO_QUESTIONS = [
  { key: 'bio_style', label: '저는 이런 사람이에요', placeholder: '차분하게 문제를 뜯어보는 편이고, 마감은 꼭 지켜요' },
  { key: 'bio_strength', label: '이런 걸 잘해요', placeholder: 'REST API 설계와 DB 최적화에 자신 있어요' },
  { key: 'bio_experience', label: '이런 경험이 있어요', placeholder: '교내 해커톤 2회 참가, 사이드 프로젝트로 예약 서비스 개발' },
  { key: 'bio_goal', label: '이번 해커톤에서 이걸 하고 싶어요', placeholder: '결제 기능을 처음부터 끝까지 구현해보고 싶어요' },
  { key: 'bio_contribution', label: '팀에 이렇게 기여할 수 있어요', placeholder: '백엔드 전반을 책임지고, 배포까지 맡을 수 있어요' },
] as const

const EMPTY_PROFILE: ProfileInput = {
  roles: [],
  skills: [],
  available_time: '',
  regions: [],
  goal: '',
  collaboration: '',
  communication: '',
  interests: [],
  one_liner: '',
  bio_style: '',
  bio_strength: '',
  bio_experience: '',
  bio_goal: '',
  bio_contribution: '',
  links: [],
  open_chat: '',
  phone: '',
  is_private: false,
}

/**
 * 개인 프로필 & 희망 조건 작성.
 *
 * `hackathonId`가 있으면 저장 후 해당 해커톤의 추천 생성을 트리거하고 결과 화면으로,
 * 없으면(마이페이지에서 진입) 저장만 하고 마이페이지로 돌아간다.
 */
export function ProfileSetupScreen({ hackathonId }: { hackathonId: number | null }) {
  const navigate = useNavigate()
  const { options } = useMetaOptions()

  const { data, loading, error, refetch } = useQuery('me:profile', () => profileApi.mine())
  const [form, setForm] = useState<ProfileInput>(EMPTY_PROFILE)
  const [bioOpen, setBioOpen] = useState(true)

  // 서버에서 받은 기존 프로필로 폼을 초기화한다
  useEffect(() => {
    if (data) setForm({ ...EMPTY_PROFILE, ...data })
  }, [data])

  const set = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const addLink = () => set('links', [...form.links, { type: 'GitHub', url: '' }])
  const removeLink = (index: number) =>
    set('links', form.links.filter((_, i) => i !== index))
  const updateLink = (index: number, patch: Partial<PortfolioLink>) =>
    set('links', form.links.map((l, i) => (i === index ? { ...l, ...patch } : l)))

  const save = useMutation(
    async (input: ProfileInput) => {
      await profileApi.save(input)
      // 프로필이 바뀌었으니 추천을 다시 계산하도록 요청한다.
      // 추천 생성이 실패해도 프로필 저장 자체는 성공이므로 여기서 막지 않는다.
      if (hackathonId) {
        try {
          await recommendationApi.generate(hackathonId)
        } catch {
          /* 추천 결과 화면에서 재시도할 수 있다 */
        }
      }
    },
    {
      onSuccess: () => {
        navigate(hackathonId ? routes.recommendations(hackathonId) : routes.mypage)
      },
    },
  )

  // 상세 자기소개 5개 항목은 전부 채워야 한다 — AI 매칭 근거로 쓰이는 핵심 정보라 필수로 바뀌었다
  const bioComplete = BIO_QUESTIONS.every((q) => form[q.key].trim().length > 0)
  // 최소 조건: 역할 하나는 골라야 매칭이 의미가 있다
  const canSubmit = form.roles.length > 0 && bioComplete && !save.loading

  if (loading) {
    return (
      <Page>
        <LoadingState label="프로필을 불러오는 중이에요…" />
      </Page>
    )
  }

  // 404(아직 프로필 없음)는 에러가 아니라 신규 작성 케이스로 취급한다
  if (error && error.status !== 404) {
    return (
      <Page>
        <ErrorState error={error} onRetry={refetch} />
      </Page>
    )
  }

  return (
    <Page>
      <h1 className="text-[20px] font-bold text-gray-800">개인 프로필 &amp; 희망 조건</h1>
      <p className="text-[13px] text-[#8FA3BF] mt-1 mb-8">AI 추천을 위해 정보를 입력해주세요</p>

      <ChipGroup label="대표 역할" options={options.roles} selected={form.roles} onChange={(v) => set('roles', v)} />
      <ChipGroup label="기술 스택" options={options.skills} selected={form.skills} onChange={(v) => set('skills', v)} />
      <ChipGroup
        label="활동 가능 시간"
        options={options.available_times}
        selected={toArray(form.available_time)}
        onChange={(v) => set('available_time', toSingle(v))}
        multi={false}
      />
      <ChipGroup label="선호 지역" options={options.regions} selected={form.regions} onChange={(v) => set('regions', v)} />
      <ChipGroup
        label="참여 목표"
        options={options.goals}
        selected={toArray(form.goal)}
        onChange={(v) => set('goal', toSingle(v))}
        multi={false}
      />
      <ChipGroup
        label="협업 방식"
        options={options.collaborations}
        selected={toArray(form.collaboration)}
        onChange={(v) => set('collaboration', toSingle(v))}
        multi={false}
      />

      {/* 소통 방식 — AI 체크포인트 근거 항목이라 강조 배치 */}
      <div className="mb-6 bg-[#F0F9FF] rounded-2xl border border-[#BAE6FD] p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <p className="text-[13px] font-semibold text-[#0F172A]">소통 방식</p>
          <span className="text-[11px] font-semibold text-[#0EA5E9] bg-[#E0F2FE] px-2 py-0.5 rounded-full">
            AI 체크포인트 반영
          </span>
        </div>
        <p className="text-[12px] text-[#64748B] mb-3">
          이 항목은 AI 추천 카드의 '체크 포인트' 근거로 사용돼요. 팀원 간 소통 스타일 불일치를 미리 알려드려요.
        </p>
        <div className="flex flex-wrap gap-2">
          {options.communications.map((opt) => (
            <button
              key={opt}
              onClick={() => set('communication', opt)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
                form.communication === opt
                  ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]'
                  : 'bg-white text-[#64748B] border-[#E2EAF4] hover:border-[#0EA5E9]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <ChipGroup label="관심 분야" options={options.interests} selected={form.interests} onChange={(v) => set('interests', v)} />

      <div className="mb-5">
        <p className="text-[13px] font-semibold text-[#0F172A] mb-0.5">한 줄 자기소개</p>
        <p className="text-[12px] text-[#64748B] mb-2">추천 카드에 표시되는 짧은 소개 (30자 이내 권장)</p>
        <input
          type="text"
          value={form.one_liner}
          onChange={(e) => set('one_liner', e.target.value)}
          maxLength={50}
          placeholder="예: 백엔드로 빠르게 만들고 검증하는 걸 좋아합니다"
          className="w-full bg-white border border-[#E2EAF4] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#0EA5E9]"
        />
      </div>

      {/* 상세 자기소개 — 5개 질문 아코디언 */}
      <div className="mb-5">
        <button onClick={() => setBioOpen((v) => !v)} className="w-full flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-semibold text-[#0F172A]">상세 자기소개</p>
            <span className="text-[11px] text-[#F43F5E] font-semibold">필수</span>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="#64748B"
            strokeWidth="1.8"
            strokeLinecap="round"
            className={`transition-transform ${bioOpen ? 'rotate-180' : ''}`}
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>
        <p className="text-[12px] text-[#64748B] mb-3">
          프로필 상세 페이지에 항목별로 표시돼요. 5개 항목 모두 작성해야 저장할 수 있어요.
        </p>

        {bioOpen && (
          <div className="bg-white border border-[#E2EAF4] rounded-2xl overflow-hidden">
            {BIO_QUESTIONS.map((q, idx) => (
              <div key={q.key} className={idx < BIO_QUESTIONS.length - 1 ? 'border-b border-[#F1F5F9]' : ''}>
                <div className="px-5 py-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <p className="text-[13px] font-semibold text-[#0F172A]">{q.label}</p>
                    <span className="text-[11px] text-[#F43F5E]">*</span>
                  </div>
                  <textarea
                    value={form[q.key]}
                    onChange={(e) => set(q.key, e.target.value)}
                    rows={2}
                    placeholder={q.placeholder}
                    className="w-full bg-[#F8FAFC] border border-[#E2EAF4] rounded-xl px-4 py-2.5 text-[13px] text-[#0F172A] outline-none focus:border-[#0EA5E9] focus:bg-white resize-none placeholder-[#94A3B8] transition-colors"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 포트폴리오 링크 */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-1">
          <p className="text-[13px] font-semibold text-[#0F172A]">포트폴리오 링크</p>
          <span className="text-[11px] text-[#64748B]">(선택)</span>
        </div>
        <p className="text-[12px] text-[#64748B] mb-3">GitHub, 블로그, Behance 등 여러 링크를 등록할 수 있어요.</p>

        <div className="flex flex-col gap-2">
          {form.links.map((link, i) => {
            const meta = LINK_META[link.type] ?? LINK_META['기타']
            return (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={link.type}
                  onChange={(e) => updateLink(i, { type: e.target.value as LinkType })}
                  className="bg-white border border-[#E2EAF4] rounded-xl px-3 py-2.5 text-[13px] text-[#0F172A] outline-none focus:border-[#0EA5E9] cursor-pointer flex-shrink-0 w-[120px]"
                >
                  {LINK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {LINK_META[t].icon} {t}
                    </option>
                  ))}
                </select>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] pointer-events-none">
                    {meta.icon}
                  </span>
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => updateLink(i, { url: e.target.value })}
                    placeholder="https://"
                    className="w-full bg-white border border-[#E2EAF4] rounded-xl pl-9 pr-4 py-2.5 text-[13px] outline-none focus:border-[#0EA5E9] placeholder-[#94A3B8]"
                  />
                </div>
                <button
                  onClick={() => removeLink(i)}
                  aria-label="링크 삭제"
                  className="w-8 h-8 flex items-center justify-center rounded-full text-[#94A3B8] hover:bg-[#FFF1F2] hover:text-[#F43F5E] transition-colors flex-shrink-0"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M2 2l10 10M12 2L2 12" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>

        <button
          onClick={addLink}
          className="mt-2 flex items-center gap-1.5 text-[#0EA5E9] text-[13px] font-medium hover:text-[#0284C7] transition-colors py-1"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M7 2v10M2 7h10" />
          </svg>
          링크 추가
        </button>
      </div>

      {/* 오픈채팅 링크 */}
      <div className="mb-5">
        <p className="text-[13px] font-semibold text-[#0F172A] mb-1">오픈채팅/연락처 링크</p>
        <p className="text-[12px] text-[#64748B] mb-2 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#64748B" strokeWidth="1.4" strokeLinecap="round">
            <rect x="3" y="5" width="6" height="5" rx="1" />
            <path d="M4.5 5V3.5a1.5 1.5 0 0 1 3 0V5" />
          </svg>
          커피챗 수락 후 상대방에게만 공개됩니다
        </p>
        <input
          type="url"
          value={form.open_chat}
          onChange={(e) => set('open_chat', e.target.value)}
          placeholder="https://open.kakao.com/o/..."
          className="w-full bg-white border border-[#E2EAF4] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#0EA5E9]"
        />
      </div>

      {/* 전화번호 — 팀장이 "수동으로 참가자 추가"할 때 회원 조회 키로 쓰인다 */}
      <div className="mb-5">
        <p className="text-[13px] font-semibold text-[#0F172A] mb-1">전화번호</p>
        <p className="text-[12px] text-[#64748B] mb-2">
          팀장이 참가자를 수동으로 추가할 때 회원 확인용으로 쓰여요. (선택)
        </p>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          placeholder="010-1234-5678"
          className="w-full bg-white border border-[#E2EAF4] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#0EA5E9]"
        />
      </div>

      <div className="flex items-center justify-between bg-[#F0F5FC] rounded-xl border border-[#E2EAF4] px-4 py-3.5 mb-8">
        <div>
          <p className="text-[13px] font-semibold text-gray-700">추천 대상에서 비공개</p>
          <p className="text-[12px] text-[#8FA3BF] mt-0.5">켜면 다른 사람의 추천 리스트에 노출되지 않아요</p>
        </div>
        <Toggle value={form.is_private} onChange={(v) => set('is_private', v)} />
      </div>

      <InlineError message={save.error?.message} />
      {!canSubmit && form.roles.length === 0 && (
        <p className="text-[12px] text-[#94A3B8] mb-2">대표 역할을 최소 1개 선택해주세요.</p>
      )}
      {!canSubmit && form.roles.length > 0 && !bioComplete && (
        <p className="text-[12px] text-[#94A3B8] mb-2">상세 자기소개 5개 항목을 모두 작성해주세요.</p>
      )}

      <PrimaryButton onClick={() => save.mutate(form)} loading={save.loading} disabled={!canSubmit} className="w-full">
        {hackathonId ? '저장하고 추천받기' : '프로필 저장'}
      </PrimaryButton>
    </Page>
  )
}
