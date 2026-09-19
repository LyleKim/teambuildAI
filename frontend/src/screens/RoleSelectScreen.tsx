import { useMemo, useState } from "react"
import { profileApi } from "@/api"
import { Page } from "@/components/NavBar"
import { ChipGroup, InlineError, PrimaryButton } from "@/components/ui"
import { useMetaOptions } from "@/hooks/useMetaOptions"
import { useMutation } from "@/hooks/useMutation"
import { routes, useNavigate } from "@/lib/router"

type RoleCategory = "dev" | "design" | "planning"

const CATEGORY_ORDER: RoleCategory[] = ["dev", "design", "planning"]
const CATEGORY_LABELS: Record<RoleCategory, string> = {
  dev: "개발",
  design: "디자인",
  planning: "기획",
}

/**
 * 카카오 로그인 직후, 프로필을 한 번도 작성한 적 없는 사용자에게 보여주는 온보딩 화면.
 * 여기서 고른 roles는 그대로 Profile.roles에 저장되고, 이후 프로필 작성 화면
 * (ProfileSetupScreen)이 이 값으로 기술스택/자기소개 문항을 역할에 맞게 갈라 보여준다.
 */
export function RoleSelectScreen() {
  const navigate = useNavigate()
  const { options } = useMetaOptions()
  const [category, setCategory] = useState<RoleCategory | null>(null)
  const [roles, setRoles] = useState<string[]>([])

  const rolesInCategory = useMemo(
    () =>
      options.roles.filter(
        (role) => options.role_categories[role] === category,
      ),
    [options, category],
  )

  const save = useMutation(
    async (selected: string[]) => {
      await profileApi.setRole(selected)
    },
    { onSuccess: () => navigate(routes.profile, { replace: true }) },
  )

  const selectedCategoryLabel = category ? [CATEGORY_LABELS[category]] : []

  return (
    <Page>
      <h1 className="text-[22px] text-ink font-[family-name:var(--font-display)]">
        어떤 역할로 참여하시나요?
      </h1>
      <p className="text-[13px] text-ink-soft mt-1 mb-8">
        선택한 역할에 맞춰 다음 프로필 작성 화면의 질문이 달라져요
      </p>

      <ChipGroup
        label="분야"
        options={CATEGORY_ORDER.map((c) => CATEGORY_LABELS[c])}
        selected={selectedCategoryLabel}
        onChange={(v) => {
          const picked =
            CATEGORY_ORDER.find((c) => CATEGORY_LABELS[c] === v[0]) ?? null
          setCategory(picked)
          setRoles([])
        }}
        multi={false}
      />

      {category && (
        <ChipGroup
          label="세부 역할"
          options={rolesInCategory}
          selected={roles}
          onChange={setRoles}
        />
      )}

      <InlineError message={save.error?.message} />
      <PrimaryButton
        onClick={() => save.mutate(roles)}
        loading={save.loading}
        disabled={roles.length === 0}
        className="w-full mt-4"
      >
        다음
      </PrimaryButton>
    </Page>
  )
}
