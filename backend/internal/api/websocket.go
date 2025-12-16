package api

import (
	"ffmpeg-web/internal/worker"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in development
	},
}

// WebSocketHandler handles WebSocket connections for progress updates
type WebSocketHandler struct {
	clients     map[*websocket.Conn]bool
	broadcast   chan *worker.ProgressUpdate
	register    chan *websocket.Conn
	unregister  chan *websocket.Conn
	mu          sync.RWMutex
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler() *WebSocketHandler {
	handler := &WebSocketHandler{
		clients:    make(map[*websocket.Conn]bool),
		broadcast:  make(chan *worker.ProgressUpdate, 100),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
	}

	go handler.run()
	return handler
}

// run manages client connections and broadcasts
func (h *WebSocketHandler) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("WebSocket client connected. Total: %d", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.Close()
			}
			h.mu.Unlock()
			log.Printf("WebSocket client disconnected. Total: %d", len(h.clients))

		case update := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				// Send update to client
				if err := client.WriteJSON(update); err != nil {
					log.Printf("WebSocket write error: %v", err)
					h.mu.RUnlock()
					h.unregister <- client
					h.mu.RLock()
				}
			}
			h.mu.RUnlock()
		}
	}
}

// HandleWebSocket handles WebSocket connection requests
func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}

	h.register <- conn

	// Keep connection alive with ping/pong
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					h.unregister <- conn
					return
				}
			}
		}
	}()

	// Read messages from client (for keepalive)
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			h.unregister <- conn
			break
		}
	}
}

// BroadcastProgress broadcasts a progress update to all connected clients
func (h *WebSocketHandler) BroadcastProgress(update *worker.ProgressUpdate) {
	select {
	case h.broadcast <- update:
	default:
		log.Println("Broadcast channel full, dropping message")
	}
}

// GetBroadcastChannel returns the broadcast channel for worker pool
func (h *WebSocketHandler) GetBroadcastChannel() chan<- *worker.ProgressUpdate {
	return h.broadcast
}

