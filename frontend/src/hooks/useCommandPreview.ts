import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/lib/api'
import type { TranscodeConfig } from '@/types'

interface UseCommandPreviewOptions {
    debounceMs?: number
    sourceFile?: string
}

interface UseCommandPreviewResult {
    command: string
    isLoading: boolean
    error: string | null
    refresh: () => void
}

/**
 * Hook to fetch command preview from backend with debouncing
 */
export function useCommandPreview(
    config: TranscodeConfig | null,
    options: UseCommandPreviewOptions = {}
): UseCommandPreviewResult {
    const { debounceMs = 300, sourceFile } = options
    const [command, setCommand] = useState<string>('')
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)

    const fetchPreview = useCallback(async (currentConfig: TranscodeConfig) => {
        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()

        try {
            setIsLoading(true)
            setError(null)
            const result = await api.previewCommand(currentConfig, sourceFile)
            setCommand(result)
        } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
                setError(err.message)
                console.error('Failed to fetch command preview:', err)
            }
        } finally {
            setIsLoading(false)
        }
    }, [sourceFile])

    const refresh = useCallback(() => {
        if (config) {
            fetchPreview(config)
        }
    }, [config, fetchPreview])

    useEffect(() => {
        if (!config) {
            setCommand('')
            return
        }

        // Clear existing timer
        if (timerRef.current) {
            clearTimeout(timerRef.current)
        }

        // Debounce the API call
        timerRef.current = setTimeout(() => {
            fetchPreview(config)
        }, debounceMs)

        // Cleanup on unmount or config change
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
            }
        }
    }, [config, debounceMs, fetchPreview])

    // Cleanup abort controller on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [])

    return { command, isLoading, error, refresh }
}
