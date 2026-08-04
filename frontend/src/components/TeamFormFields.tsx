import { ChipGroup, CounterRow } from '@/components/ui'
import { useMetaOptions } from '@/hooks/useMetaOptions'
import type { RoleCount, TeamInput } from '@/types'

export const EMPTY_TEAM: TeamInput = {
  current_members: {},
  needed_roles: {},
  message: '',
  collaboration: '',
  communication: '',
  open_chat_link: '',
  recruit_status: '모집 중',
}

/**
 * 팀 모집 조건 입력 필드 묶음.
 * 신규 작성(TeamSetupScreen)과 수정(TeamEditScreen)이 같은 필드를 쓰므로 분리했다.
 */
export function TeamFormFields({
  value,
  onChange,
  showOpenChat = false,
}: {
  value: TeamInput
  onChange: (next: TeamInput) => void
  /** 수정 화면에서만 오픈채팅 링크를 노출한다 */
  showOpenChat?: boolean
}) {
  const { options } = useMetaOptions()

  const setCount = (field: 'current_members' | 'needed_roles', role: string, count: number) => {
    const next: RoleCount = { ...value[field], [role]: count }
    onChange({ ...value, [field]: next })
  }

  return (
    <>
      <p className="text-[13px] font-semibold text-[#0F172A] mb-3">현재 팀원 구성</p>
      <div className="flex flex-col gap-2 mb-8">
        {options.roles.map((role) => (
          <CounterRow
            key={role}
            label={role}
            value={value.current_members[role] ?? 0}
            onChange={(v) => setCount('current_members', role, v)}
          />
        ))}
      </div>

      <p className="text-[13px] font-semibold text-[#0F172A] mb-3">필요한 역할</p>
      <div className="flex flex-col gap-2 mb-8">
        {options.roles.map((role) => (
          <CounterRow
            key={role}
            label={role}
            value={value.needed_roles[role] ?? 0}
            onChange={(v) => setCount('needed_roles', role, v)}
          />
        ))}
      </div>

      <div className="mb-6">
        <p className="text-[13px] font-semibold text-[#0F172A] mb-2">모집 조건/한마디</p>
        <textarea
          value={value.message}
          onChange={(e) => onChange({ ...value, message: e.target.value })}
          rows={3}
          placeholder="꼼꼼하게 소통하며 끝까지 완주할 수 있는 팀원을 찾아요."
          className="w-full bg-white border border-[#E2EAF4] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#0EA5E9] resize-y"
        />
      </div>

      <ChipGroup
        label="협업 방식"
        options={options.collaborations}
        selected={value.collaboration ? [value.collaboration] : []}
        onChange={(v) => onChange({ ...value, collaboration: v[0] ?? '' })}
        multi={false}
      />
      <ChipGroup
        label="소통 방식"
        options={options.communications}
        selected={value.communication ? [value.communication] : []}
        onChange={(v) => onChange({ ...value, communication: v[0] ?? '' })}
        multi={false}
      />

      {showOpenChat && (
        <div className="mb-8">
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
            value={value.open_chat_link}
            onChange={(e) => onChange({ ...value, open_chat_link: e.target.value })}
            placeholder="https://open.kakao.com/o/..."
            className="w-full bg-white border border-[#E2EAF4] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#0EA5E9]"
          />
        </div>
      )}
    </>
  )
}
