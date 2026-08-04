/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API 기본 경로. 기본값 '/api/v1' (Vite dev 프록시가 Django:8000으로 전달) */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
