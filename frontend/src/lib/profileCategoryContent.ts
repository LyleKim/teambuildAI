import type { ProfileInput } from "@/types"

export type RoleCategory = "dev" | "design" | "planning"
export const DEFAULT_CATEGORY: RoleCategory = "dev"

// "다시 추천받기" 카테고리 선택 칩에 쓰는 한글 라벨.
export const CATEGORY_LABELS: Record<RoleCategory, string> = {
  dev: "개발자",
  design: "디자이너",
  planning: "기획자",
}

export type BioQuestion = {
  key: keyof Pick<ProfileInput, "bio_style" | "bio_strength" | "bio_experience" | "bio_goal" | "bio_contribution">
  label: string
  placeholder: string
}

// 역할 카테고리별 자기소개 문항. ProfileSetupScreen(작성)과 MemberProfileScreen(공개)
// 양쪽에서 같은 라벨을 쓰기 위해 화면 파일이 아니라 여기 공용 모듈에 둔다.
export const BIO_QUESTIONS_BY_CATEGORY: Record<RoleCategory, BioQuestion[]> = {
  dev: [
    {
      key: "bio_style",
      label: "저는 이런 사람이에요",
      placeholder: "차분하게 문제를 뜯어보는 편이고, 마감은 꼭 지켜요",
    },
    {
      key: "bio_strength",
      label: "이런 걸 잘해요",
      placeholder: "REST API 설계와 DB 최적화에 자신 있어요",
    },
    {
      key: "bio_experience",
      label: "이런 경험이 있어요",
      placeholder: "교내 해커톤 2회 참가, 사이드 프로젝트로 예약 서비스 개발",
    },
    {
      key: "bio_goal",
      label: "이번 해커톤에서 이걸 하고 싶어요",
      placeholder: "결제 기능을 처음부터 끝까지 구현해보고 싶어요",
    },
    {
      key: "bio_contribution",
      label: "팀에 이렇게 기여할 수 있어요",
      placeholder: "백엔드 전반을 책임지고, 배포까지 맡을 수 있어요",
    },
  ],
  design: [
    {
      key: "bio_style",
      label: "저는 이런 사람이에요",
      placeholder:
        "섬세하게 디테일을 챙기는 편이고, 사용자 입장에서 먼저 생각해요",
    },
    {
      key: "bio_strength",
      label: "이런 걸 잘해요",
      placeholder: "UI/UX 리서치와 프로토타이핑에 자신 있어요",
    },
    {
      key: "bio_experience",
      label: "이런 경험이 있어요",
      placeholder: "교내 공모전 2회 참가, 사이드 프로젝트 앱 UI 리디자인",
    },
    {
      key: "bio_goal",
      label: "이번 해커톤에서 이걸 하고 싶어요",
      placeholder: "처음부터 끝까지 디자인 시스템을 구축해보고 싶어요",
    },
    {
      key: "bio_contribution",
      label: "팀에 이렇게 기여할 수 있어요",
      placeholder: "전체 화면 디자인과 프로토타입 제작을 책임질 수 있어요",
    },
  ],
  planning: [
    // 기획자는 목표/기여를 먼저 어필하도록 순서를 바꾼다 (다른 카테고리는 style→strength→experience→goal→contribution 순).
    {
      key: "bio_goal",
      label: "이번 해커톤에서 이걸 하고 싶어요",
      placeholder:
        "아이디어를 실제 서비스로 만들어보는 전 과정을 이끌어보고 싶어요",
    },
    {
      key: "bio_contribution",
      label: "팀에 이렇게 기여할 수 있어요",
      placeholder:
        "기획서 작성부터 일정 관리, 팀 커뮤니케이션 전반을 맡을 수 있어요",
    },
    {
      key: "bio_style",
      label: "저는 이런 사람이에요",
      placeholder:
        "일정과 우선순위를 꼼꼼히 챙기는 편이고, 소통을 중요하게 생각해요",
    },
    {
      key: "bio_strength",
      label: "이런 걸 잘해요",
      placeholder: "요구사항 정리와 일정 관리, 팀 커뮤니케이션에 자신 있어요",
    },
    {
      key: "bio_experience",
      label: "이런 경험이 있어요",
      placeholder: "교내 해커톤 2회 기획 참여, 서비스 기획서 작성 경험",
    },
  ],
}

export const ONE_LINER_PLACEHOLDER_BY_CATEGORY: Record<RoleCategory, string> = {
  dev: "예: 백엔드로 빠르게 만들고 검증하는 걸 좋아합니다",
  design: "예: 사용자가 느끼는 디테일까지 고민하는 걸 좋아합니다",
  planning: "예: 아이디어를 구조화하고 팀을 이끄는 걸 좋아합니다",
}
