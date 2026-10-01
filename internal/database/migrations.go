package database

import "log"

// RunMigrations executes all schema creation DDL statements and legacy schema updates.
func RunMigrations() {
	migrations := []string{
		`CREATE TABLE IF NOT EXISTS apps (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			url TEXT NOT NULL,
			icon TEXT NOT NULL,
			gradient TEXT NOT NULL,
			position INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS app_status (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			app_id INTEGER NOT NULL UNIQUE,
			is_online BOOLEAN DEFAULT 0,
			last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
		)`,
		`CREATE INDEX IF NOT EXISTS idx_apps_position ON apps(position)`,
		`CREATE INDEX IF NOT EXISTS idx_app_status_app_id ON app_status(app_id)`,
	}

	for _, stmt := range migrations {
		if _, err := DB.Exec(stmt); err != nil {
			log.Fatalf("Migration failed: %v", err)
		}
	}

	// Remove category column if it exists in legacy database schemas
	removeLegacyCategoryColumn()

	log.Println("Database migrations completed")
}

func removeLegacyCategoryColumn() {
	var count int
	const checkColumnQuery = "SELECT COUNT(*) FROM pragma_table_info('apps') WHERE name='category'"
	err := DB.QueryRow(checkColumnQuery).Scan(&count)
	if err != nil || count == 0 {
		return
	}

	tx, err := DB.Begin()
	if err != nil {
		log.Printf("Warning: could not begin transaction to remove category: %v", err)
		return
	}
	defer tx.Rollback()

	steps := []string{
		`CREATE TABLE apps_new (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			url TEXT NOT NULL,
			icon TEXT NOT NULL,
			gradient TEXT NOT NULL,
			position INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`INSERT INTO apps_new (id, name, url, icon, gradient, position, created_at, updated_at)
		 SELECT id, name, url, icon, gradient, position, created_at, updated_at FROM apps`,
		`DROP TABLE apps`,
		`ALTER TABLE apps_new RENAME TO apps`,
	}

	for _, step := range steps {
		if _, err := tx.Exec(step); err != nil {
			log.Printf("Warning: failed migration step during category removal: %v", err)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		log.Printf("Warning: could not commit removal of category column: %v", err)
		return
	}

	log.Println("Removed legacy category column from apps table")
}

