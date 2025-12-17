export interface GPUCapabilities {
  hasIntelVA: boolean
  intelVA?: VAInfo
  hasNVIDIA: boolean
  hasAMD: boolean
}

export interface VAInfo {
  profileCount: number
  entrypointCount: number
  decodeProfiles: string[]
  encodeProfiles: string[]
}

