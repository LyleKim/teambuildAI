import type { BioQuestion } from "@/lib/profileCategoryContent"
import type {
  MemberProfile,
  MetaOptions,
  PortfolioLink,
  ProfileInput,
} from "@/types"

export interface ProfileFormProps {
  form: ProfileInput
  set: <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => void
  options: MetaOptions
  skillOptions: string[]
  bioQuestions: BioQuestion[]
  oneLinerPlaceholder: string
  bioOpen: boolean
  setBioOpen: (updater: boolean | ((prev: boolean) => boolean)) => void
  addLink: () => void
  removeLink: (index: number) => void
  updateLink: (index: number, patch: Partial<PortfolioLink>) => void
}

export interface ProfileViewProps {
  data: MemberProfile
  bioQuestions: BioQuestion[]
}
