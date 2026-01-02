import { useEffect, useRef, useCallback } from 'react'
import type { ProgressUpdate } from '@/types'
import { getServerURL } from '@/lib/config'

interface UseWebSocketOptions {
  onMessage: (data: ProgressUpdate) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Event) => void
}

export function useWebSocket({ onMessage, onOpen, onClose, onError }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  // ! PERF: 使用 useRef 存储回调，避免依赖变化导致 WebSocket 重连
  // 外部回调变化时只更新 ref，不触发 connect 重建
  const callbacksRef = useRef({ onMessage, onOpen, onClose, onError })

  // 同步更新 ref 中的回调（无副作用）
  callbacksRef.current = { onMessage, onOpen, onClose, onError }

  const connect = useCallback(() => {
    // Determine WebSocket URL (supports both web and desktop modes)
    const serverURL = getServerURL()
    const wsUrl = serverURL.replace('http://', 'ws://').replace('https://', 'wss://') + '/api/ws/progress'

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket connected')
        reconnectAttempts.current = 0
        callbacksRef.current.onOpen?.()
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ProgressUpdate
          callbacksRef.current.onMessage(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        callbacksRef.current.onClose?.()

        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`)

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        } else {
          console.error('Max reconnect attempts reached')
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        callbacksRef.current.onError?.(error)
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
    }
  }, []) // ! 依赖列表为空，connect 永远不会因外部变化而重建

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return { disconnect, reconnect: connect }
}

