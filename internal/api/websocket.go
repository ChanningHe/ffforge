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

// safeConn wraps a WebSocket connection with a write mutex to prevent concurrent writes
type safeConn struct {
	conn    *websocket.Conn
	writeMu sync.Mutex
}

// WriteJSON safely writes JSON to the WebSocket connection
func (sc *safeConn) WriteJSON(v interface{}) error {
	sc.writeMu.Lock()
	defer sc.writeMu.Unlock()
	return sc.conn.WriteJSON(v)
}

// WriteMessage safely writes a message to the WebSocket connection
func (sc *safeConn) WriteMessage(messageType int, data []byte) error {
	sc.writeMu.Lock()
	defer sc.writeMu.Unlock()
	return sc.conn.WriteMessage(messageType, data)
}

// Close closes the underlying connection
func (sc *safeConn) Close() error {
	return sc.conn.Close()
}

// WebSocketHandler handles WebSocket connections for progress updates
type WebSocketHandler struct {
	clients    map[*safeConn]bool
	broadcast  chan *worker.ProgressUpdate
	register   chan *safeConn
	unregister chan *safeConn
	mu         sync.RWMutex
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler() *WebSocketHandler {
	handler := &WebSocketHandler{
		clients:    make(map[*safeConn]bool),
		broadcast:  make(chan *worker.ProgressUpdate, 100),
		register:   make(chan *safeConn),
		unregister: make(chan *safeConn),
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
			clients := make([]*safeConn, 0, len(h.clients))
			for client := range h.clients {
				clients = append(clients, client)
			}
			h.mu.RUnlock()

			// Write to clients outside the lock to avoid deadlocks
			for _, client := range clients {
				if err := client.WriteJSON(update); err != nil {
					log.Printf("WebSocket write error: %v", err)
					h.unregister <- client
				}
			}
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

	sc := &safeConn{conn: conn}
	h.register <- sc

	// Keep connection alive with ping/pong
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			if err := sc.WriteMessage(websocket.PingMessage, nil); err != nil {
				h.unregister <- sc
				return
			}
		}
	}()

	// Read messages from client (for keepalive)
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			h.unregister <- sc
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
