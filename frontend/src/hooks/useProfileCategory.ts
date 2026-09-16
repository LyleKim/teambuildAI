import { useMemo } from "react"
import {
  BIO_QUESTIONS_BY_CATEGORY,
  DEFAULT_CATEGORY,
  ONE_LINER_PLACEHOLDER_BY_CATEGORY,
} from "@/lib/profileCategoryContent"
import type { BioQuestion, RoleCategory } from "@/lib/profileCategoryContent"
import type { MetaOptions } from "@/types"

export interface ProfileCategoryResult {
  primaryCategory: RoleCategory
  skillOptions: string[]
  bioQuestions: BioQuestion[]
  oneLinerPlaceholder: string
}

/**
 * roles로부터 대표 카테고리를 판정하고, 그 카테고리에 맞는 기술스택 선택지·
 * 자기소개 문항·한줄소개 placeholder를 계산한다. ProfileSetupScreen(작성)과
 * MemberProfileScreen(공개) 양쪽에서 같은 로직을 쓰기 위해 훅으로 뽑았다.
 *
 * 기술 스택은 역할 카테고리로 제한하지 않고 항상 전체 옵션(options.skills)을 노출한다 —
 * 다른 역할군의 스킬을 쓰는 사람도 있어 카테고리 버킷으로 제한하면 원하는 스킬을 못 고를 수 있다.
 */
export function useProfileCategory(
  roles: string[],
  options: MetaOptions,
  existingSkills: string[] = [],
): ProfileCategoryResult {
  const activeCategories = useMemo(() => {
    const cats = roles
      .map((role) => options.role_categories[role] as RoleCategory | undefined)
      .filter((c): c is RoleCategory => c != null)
    return cats.length > 0 ? Array.from(new Set(cats)) : [DEFAULT_CATEGORY]
  }, [roles, options.role_categories])

  const primaryCategory = activeCategories[0]

  const skillOptions = useMemo(
    () => Array.from(new Set([...options.skills, ...existingSkills])),
    [options, existingSkills],
  )

  return {
    primaryCategory,
    skillOptions,
    bioQuestions: BIO_QUESTIONS_BY_CATEGORY[primaryCategory],
    oneLinerPlaceholder: ONE_LINER_PLACEHOLDER_BY_CATEGORY[primaryCategory],
  }
}
