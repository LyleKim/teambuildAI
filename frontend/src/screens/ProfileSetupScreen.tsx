import { useEffect, useState } from "react"
import { profileApi, recommendationApi } from "@/api"
import { Page } from "@/components/NavBar"
import { ErrorState, LoadingState } from "@/components/states"
import { ChipGroup, InlineError, PrimaryButton, Toggle } from "@/components/ui"
import { useMetaOptions } from "@/hooks/useMetaOptions"
import { useMutation } from "@/hooks/useMutation"
import { useProfileCategory } from "@/hooks/useProfileCategory"
import { useQuery } from "@/hooks/useQuery"
import { routes, useNavigate } from "@/lib/router"
import { DesignProfileForm } from "./profile/DesignProfileForm"
import { DevProfileForm } from "./profile/DevProfileForm"
import { PlanningProfileForm } from "./profile/PlanningProfileForm"
import type { PortfolioLink, ProfileInput } from "@/types"

const EMPTY_PROFILE: ProfileInput = {
  roles: [],
  skills: [],
  available_time: "",
  regions: [],
  goal: "",
  collaboration: "",
  communication: "",
  interests: [],
  one_liner: "",
  bio_style: "",
  bio_strength: "",
  bio_experience: "",
  bio_goal: "",
  bio_contribution: "",
  links: [],
  open_chat: "",
  phone: "",
  is_private: false,
}

/**
 * 개인 프로필 & 희망 조건 작성.
 *
 * `hackathonId`가 있으면 저장 후 해당 해커톤의 추천 생성을 트리거하고 결과 화면으로,
 * 없으면(마이페이지에서 진입) 저장만 하고 마이페이지로 돌아간다.
 *
 * 대표 역할 선택과 저장 버튼 등 공통 UI만 여기서 그리고, 역할 카테고리에 따라
 * 달라지는 나머지 입력 영역은 DevProfileForm/DesignProfileForm/PlanningProfileForm에
 * 위임한다 (profile/ 디렉토리 참고).
 */
export function ProfileSetupScreen({
  hackathonId,
}: {
  hackathonId: number | null
}) {
  const navigate = useNavigate()
  const { options } = useMetaOptions()

  const { data, loading, error, refetch } = useQuery("me:profile", () =>
    profileApi.mine(),
  )
  const [form, setForm] = useState<ProfileInput>(EMPTY_PROFILE)
  const [bioOpen, setBioOpen] = useState(true)

  const { primaryCategory, skillOptions, bioQuestions, oneLinerPlaceholder } =
    useProfileCategory(form.roles, options, form.skills)

  // 서버에서 받은 기존 프로필로 폼을 초기화한다
  useEffect(() => {
    if (data) setForm({ ...EMPTY_PROFILE, ...data })
  }, [data])

  const set = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const addLink = () =>
    set("links", [...form.links, { type: "GitHub", url: "" }])
  const removeLink = (index: number) =>
    set(
      "links",
      form.links.filter((_, i) => i !== index),
    )
  const updateLink = (index: number, patch: Partial<PortfolioLink>) =>
    set(
      "links",
      form.links.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    )

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
        navigate(
          hackathonId ? routes.recommendations(hackathonId) : routes.mypage,
        )
      },
    },
  )

  // 상세 자기소개 5개 항목은 전부 채워야 한다 — AI 매칭 근거로 쓰이는 핵심 정보라 필수로 바뀌었다
  const bioComplete = bioQuestions.every((q) => form[q.key].trim().length > 0)
  // AI 카드가 없는 추천(5위 밖, AI 호출 실패)은 이 문구로 사람을 소개하므로 비워둘 수 없다
  const oneLinerComplete = form.one_liner.trim().length > 0
  // 다른 역할군 추천(랜덤 매칭)이 참여 목표로만 필터링되므로 항상 채워져 있어야 한다
  const goalComplete = form.goal.trim().length > 0
  // 최소 조건: 역할 하나는 골라야 매칭이 의미가 있다
  const canSubmit =
    form.roles.length > 0 &&
    oneLinerComplete &&
    bioComplete &&
    goalComplete &&
    !save.loading

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

  const formProps = {
    form,
    set,
    options,
    skillOptions,
    bioQuestions,
    oneLinerPlaceholder,
    bioOpen,
    setBioOpen,
    addLink,
    removeLink,
    updateLink,
  }

  return (
    <Page>
      <h1 className="text-[22px] text-ink font-[family-name:var(--font-display)]">
        개인 프로필 &amp; 희망 조건
      </h1>
      <p className="text-[13px] text-ink-soft mt-1 mb-8">
        AI 추천을 위해 정보를 입력해주세요
      </p>

      <ChipGroup
        label="대표 역할"
        options={options.roles}
        selected={form.roles}
        onChange={(v) => set("roles", v)}
        multi={false}
      />

      {primaryCategory === "design" ? (
        <DesignProfileForm {...formProps} />
      ) : primaryCategory === "planning" ? (
        <PlanningProfileForm {...formProps} />
      ) : (
        <DevProfileForm {...formProps} />
      )}

      {/* 오픈채팅 링크 */}
      <div className="mb-5">
        <p className="text-[13px] font-semibold text-ink mb-1">
          오픈채팅/연락처 링크
        </p>
        <p className="text-[12px] text-ink-soft mb-2 flex items-center gap-1">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="var(--color-ink-soft)"
            strokeWidth="1.4"
            strokeLinecap="round"
          >
            <rect x="3" y="5" width="6" height="5" rx="1" />
            <path d="M4.5 5V3.5a1.5 1.5 0 0 1 3 0V5" />
          </svg>
          커피챗 수락 후 상대방에게만 공개됩니다
        </p>
        <input
          type="url"
          value={form.open_chat}
          onChange={(e) => set("open_chat", e.target.value)}
          placeholder="https://open.kakao.com/o/..."
          className="w-full bg-white border border-border rounded-xl px-4 py-3 text-[14px] outline-none focus:border-brand"
        />
      </div>

      {/* 전화번호 — 팀장이 "수동으로 참가자 추가"할 때 회원 조회 키로 쓰인다 */}
      <div className="mb-5">
        <p className="text-[13px] font-semibold text-ink mb-1">전화번호</p>
        <p className="text-[12px] text-ink-soft mb-2">
          팀장이 참가자를 수동으로 추가할 때 회원 확인용으로 쓰여요. (선택)
        </p>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="010-1234-5678"
          className="w-full bg-white border border-border rounded-xl px-4 py-3 text-[14px] outline-none focus:border-brand"
        />
      </div>

      <div className="flex items-center justify-between bg-border/20 rounded-xl border border-border px-4 py-3.5 mb-8">
        <div>
          <p className="text-[13px] font-semibold text-ink">
            추천 대상에서 비공개
          </p>
          <p className="text-[12px] text-ink-soft mt-0.5">
            켜면 다른 사람의 추천 리스트에 노출되지 않아요
          </p>
        </div>
        <Toggle
          value={form.is_private}
          onChange={(v) => set("is_private", v)}
        />
      </div>

      <InlineError message={save.error?.message} />
      {!canSubmit && form.roles.length === 0 && (
        <p className="text-[12px] text-ink-soft mb-2">
          대표 역할을 최소 1개 선택해주세요.
        </p>
      )}
      {!canSubmit && form.roles.length > 0 && !oneLinerComplete && (
        <p className="text-[12px] text-ink-soft mb-2">
          한 줄 자기소개를 작성해주세요.
        </p>
      )}
      {!canSubmit &&
        form.roles.length > 0 &&
        oneLinerComplete &&
        !bioComplete && (
          <p className="text-[12px] text-ink-soft mb-2">
            상세 자기소개 5개 항목을 모두 작성해주세요.
          </p>
        )}
      {!canSubmit &&
        form.roles.length > 0 &&
        oneLinerComplete &&
        bioComplete &&
        !goalComplete && (
          <p className="text-[12px] text-ink-soft mb-2">
            참여 목표를 선택해주세요.
          </p>
        )}

      <PrimaryButton
        onClick={() => save.mutate(form)}
        loading={save.loading}
        disabled={!canSubmit}
        className="w-full"
      >
        {hackathonId ? "저장하고 추천받기" : "프로필 저장"}
      </PrimaryButton>
    </Page>
  )
}
