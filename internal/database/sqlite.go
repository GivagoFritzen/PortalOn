package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

const sqlitePragmas = "?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)"

var DB *sql.DB

// Init initializes the SQLite database connection and runs pending schema migrations.
func Init(dbPath string) {
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		log.Fatalf("Failed to create data directory: %v", err)
	}

	dsn := fmt.Sprintf("%s%s", dbPath, sqlitePragmas)
	var err error
	DB, err = sql.Open("sqlite", dsn)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	DB.SetMaxOpenConns(1)

	RunMigrations()
	log.Println("Database initialized successfully")
}

// Close gracefully closes the global database connection.
func Close() {
	if DB != nil {
		_ = DB.Close()
	}
}

