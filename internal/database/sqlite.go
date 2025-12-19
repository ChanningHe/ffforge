package database

import (
	"database/sql"
	"encoding/json"
	"ffmpeg-web/internal/model"
	"fmt"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

// DB represents the database connection
type DB struct {
	conn *sql.DB
}

// New creates a new database connection and initializes tables
func New(dbPath string) (*DB, error) {
	conn, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db := &DB{conn: conn}
	if err := db.initialize(); err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}

	return db, nil
}

// Close closes the database connection
func (db *DB) Close() error {
	return db.conn.Close()
}

// Conn returns the underlying database connection
func (db *DB) Conn() *sql.DB {
	return db.conn
}

// initialize creates database tables if they don't exist
func (db *DB) initialize() error {
	schema := `
	CREATE TABLE IF NOT EXISTS tasks (
		id TEXT PRIMARY KEY,
		source_file TEXT NOT NULL,
		output_file TEXT NOT NULL,
		status TEXT NOT NULL,
		progress REAL DEFAULT 0,
		speed REAL DEFAULT 0,
		eta INTEGER DEFAULT 0,
		error TEXT,
		source_file_size INTEGER DEFAULT 0,
		output_file_size INTEGER DEFAULT 0,
		created_at DATETIME NOT NULL,
		started_at DATETIME,
		completed_at DATETIME,
		preset TEXT,
		config TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS presets (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL UNIQUE,
		description TEXT,
		config TEXT NOT NULL,
		is_builtin INTEGER DEFAULT 0,
		created_at DATETIME NOT NULL
	);

	CREATE TABLE IF NOT EXISTS settings (
		id INTEGER PRIMARY KEY DEFAULT 1,
		default_output_path TEXT NOT NULL DEFAULT '/output',
		enable_gpu INTEGER DEFAULT 1,
		max_concurrent_tasks INTEGER DEFAULT 3,
		ffmpeg_path TEXT NOT NULL DEFAULT 'ffmpeg',
		ffprobe_path TEXT NOT NULL DEFAULT 'ffprobe',
		file_permission_mode TEXT NOT NULL DEFAULT 'same_as_source',
		file_permission_uid INTEGER DEFAULT 0,
		file_permission_gid INTEGER DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
	CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
	`

	_, err := db.conn.Exec(schema)
	if err != nil {
		return err
	}

	// Run migrations for existing databases
	return db.migrate()
}

// migrate handles database migrations for schema changes
func (db *DB) migrate() error {
	// Check which columns exist in settings table
	rows, err := db.conn.Query("PRAGMA table_info(settings)")
	if err != nil {
		return err
	}
	defer rows.Close()

	hasFFmpegPath := false
	hasFFprobePath := false
	hasFilePermissionMode := false
	hasFilePermissionUID := false
	hasFilePermissionGID := false

	for rows.Next() {
		var cid int
		var name string
		var dataType string
		var notNull int
		var defaultValue sql.NullString
		var pk int

		if err := rows.Scan(&cid, &name, &dataType, &notNull, &defaultValue, &pk); err != nil {
			return err
		}

		switch name {
		case "ffmpeg_path":
			hasFFmpegPath = true
		case "ffprobe_path":
			hasFFprobePath = true
		case "file_permission_mode":
			hasFilePermissionMode = true
		case "file_permission_uid":
			hasFilePermissionUID = true
		case "file_permission_gid":
			hasFilePermissionGID = true
		}
	}

	rows.Close() // Close before next query

	// Add ffmpeg_path column if it doesn't exist
	if !hasFFmpegPath {
		_, err = db.conn.Exec(`ALTER TABLE settings ADD COLUMN ffmpeg_path TEXT NOT NULL DEFAULT 'ffmpeg'`)
		if err != nil {
			return fmt.Errorf("failed to add ffmpeg_path column: %w", err)
		}
	}

	// Add ffprobe_path column if it doesn't exist
	if !hasFFprobePath {
		_, err = db.conn.Exec(`ALTER TABLE settings ADD COLUMN ffprobe_path TEXT NOT NULL DEFAULT 'ffprobe'`)
		if err != nil {
			return fmt.Errorf("failed to add ffprobe_path column: %w", err)
		}
	}

	// Add file_permission_mode column if it doesn't exist
	if !hasFilePermissionMode {
		_, err = db.conn.Exec(`ALTER TABLE settings ADD COLUMN file_permission_mode TEXT NOT NULL DEFAULT 'same_as_source'`)
		if err != nil {
			return fmt.Errorf("failed to add file_permission_mode column: %w", err)
		}
	}

	// Add file_permission_uid column if it doesn't exist
	if !hasFilePermissionUID {
		_, err = db.conn.Exec(`ALTER TABLE settings ADD COLUMN file_permission_uid INTEGER DEFAULT 0`)
		if err != nil {
			return fmt.Errorf("failed to add file_permission_uid column: %w", err)
		}
	}

	// Add file_permission_gid column if it doesn't exist
	if !hasFilePermissionGID {
		_, err = db.conn.Exec(`ALTER TABLE settings ADD COLUMN file_permission_gid INTEGER DEFAULT 0`)
		if err != nil {
			return fmt.Errorf("failed to add file_permission_gid column: %w", err)
		}
	}

	// Check which columns exist in tasks table
	taskRows, err := db.conn.Query("PRAGMA table_info(tasks)")
	if err != nil {
		return err
	}
	defer taskRows.Close()

	hasSourceFileSize := false
	hasOutputFileSize := false

	for taskRows.Next() {
		var cid int
		var name string
		var dataType string
		var notNull int
		var defaultValue sql.NullString
		var pk int

		if err := taskRows.Scan(&cid, &name, &dataType, &notNull, &defaultValue, &pk); err != nil {
			return err
		}

		switch name {
		case "source_file_size":
			hasSourceFileSize = true
		case "output_file_size":
			hasOutputFileSize = true
		}
	}

	// Add source_file_size column if it doesn't exist
	if !hasSourceFileSize {
		_, err = db.conn.Exec(`ALTER TABLE tasks ADD COLUMN source_file_size INTEGER DEFAULT 0`)
		if err != nil {
			return fmt.Errorf("failed to add source_file_size column: %w", err)
		}
	}

	// Add output_file_size column if it doesn't exist
	if !hasOutputFileSize {
		_, err = db.conn.Exec(`ALTER TABLE tasks ADD COLUMN output_file_size INTEGER DEFAULT 0`)
		if err != nil {
			return fmt.Errorf("failed to add output_file_size column: %w", err)
		}
	}

	return nil
}

// Task operations

// CreateTask creates a new task in the database
func (db *DB) CreateTask(task *model.Task) error {
	configJSON, err := json.Marshal(task.Config)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	query := `
		INSERT INTO tasks (id, source_file, output_file, status, progress, speed, eta, 
			error, source_file_size, output_file_size, created_at, started_at, completed_at, preset, config)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err = db.conn.Exec(query,
		task.ID, task.SourceFile, task.OutputFile, task.Status,
		task.Progress, task.Speed, task.ETA, task.Error,
		task.SourceFileSize, task.OutputFileSize,
		task.CreatedAt, task.StartedAt, task.CompletedAt,
		task.Preset, string(configJSON),
	)

	return err
}

// GetTask retrieves a task by ID
func (db *DB) GetTask(id string) (*model.Task, error) {
	query := `
		SELECT id, source_file, output_file, status, progress, speed, eta,
			error, source_file_size, output_file_size, created_at, started_at, completed_at, preset, config
		FROM tasks WHERE id = ?
	`

	task := &model.Task{}
	var configJSON string
	var startedAt, completedAt sql.NullTime

	err := db.conn.QueryRow(query, id).Scan(
		&task.ID, &task.SourceFile, &task.OutputFile, &task.Status,
		&task.Progress, &task.Speed, &task.ETA, &task.Error,
		&task.SourceFileSize, &task.OutputFileSize,
		&task.CreatedAt, &startedAt, &completedAt,
		&task.Preset, &configJSON,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("task not found")
	}
	if err != nil {
		return nil, err
	}

	if startedAt.Valid {
		task.StartedAt = &startedAt.Time
	}
	if completedAt.Valid {
		task.CompletedAt = &completedAt.Time
	}

	if err := json.Unmarshal([]byte(configJSON), &task.Config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	return task, nil
}

// GetAllTasks retrieves all tasks
func (db *DB) GetAllTasks() ([]*model.Task, error) {
	query := `
		SELECT id, source_file, output_file, status, progress, speed, eta,
			error, source_file_size, output_file_size, created_at, started_at, completed_at, preset, config
		FROM tasks ORDER BY created_at DESC
	`

	rows, err := db.conn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tasks := []*model.Task{}
	for rows.Next() {
		task := &model.Task{}
		var configJSON string
		var startedAt, completedAt sql.NullTime

		err := rows.Scan(
			&task.ID, &task.SourceFile, &task.OutputFile, &task.Status,
			&task.Progress, &task.Speed, &task.ETA, &task.Error,
			&task.SourceFileSize, &task.OutputFileSize,
			&task.CreatedAt, &startedAt, &completedAt,
			&task.Preset, &configJSON,
		)
		if err != nil {
			return nil, err
		}

		if startedAt.Valid {
			task.StartedAt = &startedAt.Time
		}
		if completedAt.Valid {
			task.CompletedAt = &completedAt.Time
		}

		if err := json.Unmarshal([]byte(configJSON), &task.Config); err != nil {
			return nil, fmt.Errorf("failed to unmarshal config: %w", err)
		}

		tasks = append(tasks, task)
	}

	return tasks, rows.Err()
}

// UpdateTask updates an existing task
func (db *DB) UpdateTask(task *model.Task) error {
	configJSON, err := json.Marshal(task.Config)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	query := `
		UPDATE tasks SET
			source_file = ?, output_file = ?, status = ?, progress = ?,
			speed = ?, eta = ?, error = ?, source_file_size = ?, output_file_size = ?,
			started_at = ?, completed_at = ?, preset = ?, config = ?
		WHERE id = ?
	`

	_, err = db.conn.Exec(query,
		task.SourceFile, task.OutputFile, task.Status, task.Progress,
		task.Speed, task.ETA, task.Error, task.SourceFileSize, task.OutputFileSize,
		task.StartedAt, task.CompletedAt,
		task.Preset, string(configJSON), task.ID,
	)

	return err
}

// DeleteTask deletes a task by ID
func (db *DB) DeleteTask(id string) error {
	query := `DELETE FROM tasks WHERE id = ?`
	_, err := db.conn.Exec(query, id)
	return err
}

// Preset operations

// CreatePreset creates a new preset
func (db *DB) CreatePreset(preset *model.Preset) error {
	configJSON, err := json.Marshal(preset.Config)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	query := `
		INSERT INTO presets (id, name, description, config, is_builtin, created_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`

	_, err = db.conn.Exec(query,
		preset.ID, preset.Name, preset.Description,
		string(configJSON), preset.IsBuiltin, preset.CreatedAt,
	)

	return err
}

// GetPreset retrieves a preset by ID
func (db *DB) GetPreset(id string) (*model.Preset, error) {
	query := `
		SELECT id, name, description, config, is_builtin, created_at
		FROM presets WHERE id = ?
	`

	preset := &model.Preset{}
	var configJSON string
	var isBuiltin int

	err := db.conn.QueryRow(query, id).Scan(
		&preset.ID, &preset.Name, &preset.Description,
		&configJSON, &isBuiltin, &preset.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("preset not found")
	}
	if err != nil {
		return nil, err
	}

	preset.IsBuiltin = isBuiltin == 1

	if err := json.Unmarshal([]byte(configJSON), &preset.Config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	return preset, nil
}

// GetAllPresets retrieves all presets
func (db *DB) GetAllPresets() ([]*model.Preset, error) {
	query := `
		SELECT id, name, description, config, is_builtin, created_at
		FROM presets ORDER BY is_builtin DESC, name ASC
	`

	rows, err := db.conn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	presets := []*model.Preset{}
	for rows.Next() {
		preset := &model.Preset{}
		var configJSON string
		var isBuiltin int

		err := rows.Scan(
			&preset.ID, &preset.Name, &preset.Description,
			&configJSON, &isBuiltin, &preset.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		preset.IsBuiltin = isBuiltin == 1

		if err := json.Unmarshal([]byte(configJSON), &preset.Config); err != nil {
			return nil, fmt.Errorf("failed to unmarshal config: %w", err)
		}

		presets = append(presets, preset)
	}

	return presets, rows.Err()
}

// UpdatePreset updates an existing preset (only if not builtin)
func (db *DB) UpdatePreset(preset *model.Preset) error {
	configJSON, err := json.Marshal(preset.Config)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	query := `
		UPDATE presets 
		SET name = ?, description = ?, config = ?
		WHERE id = ? AND is_builtin = 0
	`
	result, err := db.conn.Exec(query, preset.Name, preset.Description, string(configJSON), preset.ID)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("preset not found or is builtin")
	}

	return nil
}

// DeletePreset deletes a preset by ID (only if not builtin)
func (db *DB) DeletePreset(id string) error {
	query := `DELETE FROM presets WHERE id = ? AND is_builtin = 0`
	result, err := db.conn.Exec(query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("preset not found or is builtin")
	}

	return nil
}

// InitializeBuiltinPresets creates builtin presets if they don't exist
func (db *DB) InitializeBuiltinPresets() error {
	builtinPresets := []model.Preset{
		{
			ID:          "builtin-h265-balanced",
			Name:        "H.265 Balanced Quality",
			Description: "Stable, high quality, strong compatibility / 稳定、高画质、兼容性强",
			IsBuiltin:   true,
			CreatedAt:   time.Now(),
			Config: model.TranscodeConfig{
				Encoder:       "h265",
				HardwareAccel: "cpu",
				Video: model.VideoConfig{
					CRF:        23,
					Preset:     "slow",
					Resolution: "original",
					FPS:        "original",
				},
				Audio: model.AudioConfig{
					Codec:    "copy",
					Bitrate:  "",
					Channels: 0,
				},
				Output: model.OutputConfig{
					Container: "mkv",
					Suffix:    "_h265_balanced",
					PathType:  "default",
				},
				ExtraParams: `-profile:v main10 -x265-params "high-tier=1:preset=slow:me=umh:subme=5:merange=48:weightb=1:bframes=5:ref=3:aq-mode=4" -fps_mode passthrough`,
			},
		},
		{
			ID:          "builtin-h265-standard",
			Name:        "H.265 Standard Quality",
			Description: "Fine-tuned quality/compression balance, higher ceiling / 画质/压缩率精调，上限更高",
			IsBuiltin:   true,
			CreatedAt:   time.Now(),
			Config: model.TranscodeConfig{
				Encoder:       "h265",
				HardwareAccel: "cpu",
				Video: model.VideoConfig{
					CRF:        23,
					Preset:     "slow",
					Resolution: "original",
					FPS:        "original",
				},
				Audio: model.AudioConfig{
					Codec:    "copy",
					Bitrate:  "",
					Channels: 0,
				},
				Output: model.OutputConfig{
					Container: "mkv",
					Suffix:    "_h265_standard",
					PathType:  "default",
				},
				ExtraParams: `-profile:v main10 -x265-params "high-tier=1:preset=slow:me=umh:subme=5:merange=48:weightb=1:ref=3:bframes=8:b-adapt=2:aq-mode=4:aq-strength=1:rd=3:rskip=1:rc-lookahead=60:psy-rd=1.6:deblock=0,-1" -fps_mode passthrough`,
			},
		},
		{
			ID:          "builtin-h265-editing",
			Name:        "H.265 Editing Archive",
			Description: "Optimized for editing software, lower decode pressure / 给剪辑软件用，降低解码压力",
			IsBuiltin:   true,
			CreatedAt:   time.Now(),
			Config: model.TranscodeConfig{
				Encoder:       "h265",
				HardwareAccel: "cpu",
				Video: model.VideoConfig{
					CRF:        17,
					Preset:     "slow",
					Resolution: "original",
					FPS:        "original",
				},
				Audio: model.AudioConfig{
					Codec:    "copy",
					Bitrate:  "",
					Channels: 0,
				},
				Output: model.OutputConfig{
					Container: "mkv",
					Suffix:    "_h265_edit",
					PathType:  "default",
				},
				ExtraParams: `-profile:v main10 -x265-params "high-tier=1:ctu=32:me=star:subme=5:merange=48:bframes=4:ref=3:crf=17:rd=3:rskip=1:rc-lookahead=120:tune=grain" -fps_mode passthrough`,
			},
		},
		{
			ID:          "builtin-av1-hq",
			Name:        "AV1 High Quality",
			Description: "High quality AV1 encoding for archival / AV1 高质量编码，适合存档",
			IsBuiltin:   true,
			CreatedAt:   time.Now(),
			Config: model.TranscodeConfig{
				Encoder:       "av1",
				HardwareAccel: "cpu",
				Video: model.VideoConfig{
					CRF:        28,
					Preset:     "4",
					Resolution: "original",
					FPS:        "original",
				},
				Audio: model.AudioConfig{
					Codec:    "copy",
					Bitrate:  "",
					Channels: 0,
				},
				Output: model.OutputConfig{
					Container: "mkv",
					Suffix:    "_av1_hq",
					PathType:  "default",
				},
				ExtraParams: `-svtav1-params "keyint=12s:scd=1:enable-tf=2:tf-strength=2:enable-qm=1:enable-variance-boost=1:variance-boost-curve=2:variance-boost-strength=2:variance-octile=2:enable-dlf=2:sharpness=6"`,
			},
		},
		{
			ID:          "builtin-av1-balanced",
			Name:        "AV1 Balanced",
			Description: "Balanced AV1 encoding for general use / AV1 平衡编码，适合日常使用",
			IsBuiltin:   true,
			CreatedAt:   time.Now(),
			Config: model.TranscodeConfig{
				Encoder:       "av1",
				HardwareAccel: "cpu",
				Video: model.VideoConfig{
					CRF:        32,
					Preset:     "6",
					Resolution: "original",
					FPS:        "original",
				},
				Audio: model.AudioConfig{
					Codec:    "copy",
					Bitrate:  "",
					Channels: 0,
				},
				Output: model.OutputConfig{
					Container: "mkv",
					Suffix:    "_av1",
					PathType:  "default",
				},
				ExtraParams: `-svtav1-params "keyint=12s:scd=1:enable-tf=2:tf-strength=2:enable-dlf=2:sharpness=4"`,
			},
		},
		{
			ID:          "builtin-av1-fast",
			Name:        "AV1 Fast",
			Description: "Fast AV1 encoding for quick conversion / AV1 快速编码，用于快速转换",
			IsBuiltin:   true,
			CreatedAt:   time.Now(),
			Config: model.TranscodeConfig{
				Encoder:       "av1",
				HardwareAccel: "cpu",
				Video: model.VideoConfig{
					CRF:        35,
					Preset:     "8",
					Resolution: "original",
					FPS:        "original",
				},
				Audio: model.AudioConfig{
					Codec:    "copy",
					Bitrate:  "",
					Channels: 0,
				},
				Output: model.OutputConfig{
					Container: "mkv",
					Suffix:    "_av1_fast",
					PathType:  "default",
				},
				ExtraParams: `-svtav1-params "keyint=10s:scd=1:scm=0:enable-tf=2:tf-strength=2:sharpness=4"`,
			},
		},
	}

	for _, preset := range builtinPresets {
		// Check if preset already exists
		existing, _ := db.GetPreset(preset.ID)
		if existing == nil {
			if err := db.CreatePreset(&preset); err != nil {
				return fmt.Errorf("failed to create builtin preset %s: %w", preset.Name, err)
			}
		}
	}

	return nil
}
