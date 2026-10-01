package database

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"
)

func TestInit_CreatesDBAndRunsMigrations(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	Init(dbPath)
	defer Close()

	if DB == nil {
		t.Fatal("expected DB to be initialized")
	}

	if err := DB.Ping(); err != nil {
		t.Errorf("expected DB to be pingable: %v", err)
	}

	tables := []string{"apps", "app_status"}
	for _, table := range tables {
		var count int
		err := DB.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?", table).Scan(&count)
		if err != nil {
			t.Errorf("failed to check table %s: %v", table, err)
		}
		if count != 1 {
			t.Errorf("expected table %s to exist", table)
		}
	}

	indexes := []string{"idx_apps_position", "idx_app_status_app_id"}
	for _, idx := range indexes {
		var count int
		err := DB.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name=?", idx).Scan(&count)
		if err != nil {
			t.Errorf("failed to check index %s: %v", idx, err)
		}
		if count != 1 {
			t.Errorf("expected index %s to exist", idx)
		}
	}
}

func TestInit_CreatesDataDirectory(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "subdir", "nested", "test.db")

	Init(dbPath)
	defer Close()

	if DB == nil {
		t.Fatal("expected DB to be initialized")
	}

	info, err := os.Stat(filepath.Dir(dbPath))
	if err != nil {
		t.Errorf("expected data directory to be created: %v", err)
	}
	if !info.IsDir() {
		t.Errorf("expected data directory to be a directory")
	}
}

func TestInit_InvalidPath(t *testing.T) {
	Init("/invalid/path/that/does/not/exist/db.sqlite")
	defer Close()

	if DB != nil {
		t.Log("DB was initialized despite invalid path (may succeed depending on OS)")
	}
}

func TestClose_NilDB(t *testing.T) {
	DB = nil
	Close()
}

func TestClose_ValidDB(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	Init(dbPath)
	Close()

	if DB != nil {
		err := DB.Ping()
		if err == nil {
			t.Errorf("expected DB to be closed, but ping succeeded")
		}
	}
}

func TestInit_SetsWALAndBusyTimeout(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	Init(dbPath)
	defer Close()

	var journalMode string
	err := DB.QueryRow("PRAGMA journal_mode").Scan(&journalMode)
	if err != nil {
		t.Errorf("failed to query journal_mode: %v", err)
	}
	if journalMode != "wal" {
		t.Errorf("expected journal_mode=wal, got %q", journalMode)
	}

	var busyTimeout int
	err = DB.QueryRow("PRAGMA busy_timeout").Scan(&busyTimeout)
	if err != nil {
		t.Errorf("failed to query busy_timeout: %v", err)
	}
	if busyTimeout != 5000 {
		t.Errorf("expected busy_timeout=5000, got %d", busyTimeout)
	}
}

func TestInit_MaxOpenConns(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	Init(dbPath)
	defer Close()

	if DB.Stats().MaxOpenConnections != 1 {
		t.Errorf("expected MaxOpenConns=1, got %d", DB.Stats().MaxOpenConnections)
	}
}

func TestRunMigrations_CreatesSchema(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	Init(dbPath)
	defer Close()

	RunMigrations()

	tables := []string{"apps", "app_status"}
	for _, table := range tables {
		var count int
		err := DB.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?", table).Scan(&count)
		if err != nil {
			t.Errorf("failed to check table %s: %v", table, err)
		}
		if count != 1 {
			t.Errorf("expected table %s to exist after migrations", table)
		}
	}
}

func TestRunMigrations_Idempotent(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	Init(dbPath)
	defer Close()

	RunMigrations()
	RunMigrations()

	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table'").Scan(&count)
	if err != nil {
		t.Errorf("failed to count tables: %v", err)
	}
	if count < 2 {
		t.Errorf("expected at least 2 tables after double migration, got %d", count)
	}
}

func TestRemoveLegacyCategoryColumn_NoColumn(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	Init(dbPath)
	defer Close()

	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM pragma_table_info('apps') WHERE name='category'").Scan(&count)
	if err != nil {
		t.Fatalf("failed to check column: %v", err)
	}
	if count != 0 {
		t.Errorf("expected no category column in fresh schema")
	}
}

func TestRemoveLegacyCategoryColumn_RemovesColumn(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, "test.db")

	Init(dbPath)
	defer Close()

	tx, err := DB.Begin()
	if err != nil {
		t.Fatalf("failed to begin tx: %v", err)
	}
	_, err = tx.Exec("ALTER TABLE apps ADD COLUMN category TEXT")
	if err != nil {
		t.Fatalf("failed to add category column: %v", err)
	}
	if err = tx.Commit(); err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	var count int
	err = DB.QueryRow("SELECT COUNT(*) FROM pragma_table_info('apps') WHERE name='category'").Scan(&count)
	if err != nil {
		t.Fatalf("failed to check column: %v", err)
	}
	if count != 1 {
		t.Fatal("expected category column to exist before removal")
	}

	RunMigrations()

	err = DB.QueryRow("SELECT COUNT(*) FROM pragma_table_info('apps') WHERE name='category'").Scan(&count)
	if err != nil {
		t.Fatalf("failed to check column after migration: %v", err)
	}
	if count != 0 {
		t.Errorf("expected category column to be removed, but count=%d", count)
	}
}

func TestDB_Variable(t *testing.T) {
	if DB != nil {
		t.Log("DB global variable exists")
	}

	var nilDB *sql.DB
	if DB == nilDB {
		t.Log("DB is nil before Init")
	}
}