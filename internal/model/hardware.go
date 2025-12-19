package model

// GPUCapabilities represents GPU encoding and decoding capabilities
type GPUCapabilities struct {
	HasIntelVA bool     `json:"hasIntelVA"`
	IntelVA    *VAInfo  `json:"intelVA,omitempty"`
	HasNVIDIA  bool     `json:"hasNVIDIA"`
	HasAMD     bool     `json:"hasAMD"`
}

// VAInfo represents Intel VA-API capabilities
type VAInfo struct {
	ProfileCount    int      `json:"profileCount"`
	EntrypointCount int      `json:"entrypointCount"`
	DecodeProfiles  []string `json:"decodeProfiles"`
	EncodeProfiles  []string `json:"encodeProfiles"`
}

