package repository

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	_ "modernc.org/sqlite"

	apperrors "portalon/internal/errors"
	"portalon/internal/models"
)

func setupTestDB(t *testing.T) *sql.DB {
	t.Helper()

	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}

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
	}

	for _, stmt := range migrations {
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("failed to run migration: %v", err)
		}
	}

	t.Cleanup(func() {
		db.Close()
	})

	return db
}

func insertTestApp(t *testing.T, db *sql.DB, name, url string) int64 {
	t.Helper()

	result, err := db.Exec(
		`INSERT INTO apps (name, url, icon, gradient, position) VALUES (?, ?, ?, ?, ?)`,
		name, url, "box", "gradient1", 0,
	)
	if err != nil {
		t.Fatalf("failed to insert test app: %v", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		t.Fatalf("failed to get inserted id: %v", err)
	}

	_, _ = db.Exec(`INSERT INTO app_status (app_id, is_online) VALUES (?, 0)`, id)

	return id
}

func TestAppRepository_Create(t *testing.T) {
	db := setupTestDB(t)
	repo := NewAppRepository(db)
	ctx := context.Background()

	app := &models.App{
		Name:     "Test App",
		URL:      "http://test.local",
		Icon:     "cloud",
		Gradient: "gradient1",
		Position: 0,
	}

	err := repo.Create(ctx, app)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if app.ID == 0 {
		t.Error("expected ID to be set after create")
	}

	fetched, err := repo.GetByID(ctx, app.ID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if fetched.Name != "Test App" {
		t.Errorf("expected name 'Test App', got %q", fetched.Name)
	}
	if fetched.URL != "http://test.local" {
		t.Errorf("expected URL 'http://test.local', got %q", fetched.URL)
	}
}

func TestAppRepository_GetByID_Success(t *testing.T) {
	db := setupTestDB(t)
	repo := NewAppRepository(db)
	ctx := context.Background()

	id := insertTestApp(t, db, "Fetch App", "http://fetch.local")

	app, err := repo.GetByID(ctx, id)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if app.ID != id {
		t.Errorf("expected ID %d, got %d", id, app.ID)
	}
	if app.Name != "Fetch App" {
		t.Errorf("expected name 'Fetch App', got %q", app.Name)
	}
	if app.URL != "http://fetch.local" {
		t.Errorf("expected URL 'http://fetch.local', got %q", app.URL)
	}
	if app.CreatedAt.IsZero() {
		t.Error("expected CreatedAt to be set")
	}
	if app.UpdatedAt.IsZero() {
		t.Error("expected UpdatedAt to be set")
	}
}

func TestAppRepository_GetByID_NotFound(t *testing.T) {
	db := setupTestDB(t)
	repo := NewAppRepository(db)
	ctx := context.Background()

	_, err := repo.GetByID(ctx, 999)
	if err == nil {
		t.Fatal("expected error, got nil")
	}

	var appErr *apperrors.AppError
	if !errors.As(err, &appErr) || appErr.Code != 404 {
		t.Errorf("expected 404 AppError, got %v", err)
	}
}

func TestAppRepository_GetAll_Empty(t *testing.T) {
	db := setupTestDB(t)
	repo := NewAppRepository(db)
	ctx := context.Background()

	apps, err := repo.GetAll(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(apps) != 0 {
		t.Errorf("expected 0 apps, got %d", len(apps))
	}
}

func TestAppRepository_GetAll_Multiple(t *testing.T) {
	db := setupTestDB(t)
	repo := NewAppRepository(db)
	ctx := context.Background()

	insertTestApp(t, db, "App 1", "http://app1.local")
	insertTestApp(t, db, "App 2", "http://app2.local")
	insertTestApp(t, db, "App 3", "http://app3.local")

	apps, err := repo.GetAll(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(apps) != 3 {
		t.Errorf("expected 3 apps, got %d", len(apps))
	}
}

func TestAppRepository_Search_NoResults(t *testing.T) {
	db := setupTestDB(t)
	repo := NewAppRepository(db)
	ctx := context.Background()

	insertTestApp(t, db, "App 1", "http://app1.local")

	apps, err := repo.Search(ctx, "nonexistent")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(apps) != 0 {
		t.Errorf("expected 0 apps, got %d", len(apps))
	}
}

func TestAppRepository_Search_WithResults(t *testing.T) {
	db := setupTestDB(t)
	repo := NewAppRepository(db)
	ctx := context.Background()

	insertTestApp(t, db, "MyApp", "http://myapp.local")
	insertTestApp(t, db, "OtherApp", "http://other.local")

	apps, err := repo.Search(ctx, "myapp")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(apps) != 1 {
		t.Errorf("expected 1 app, got %d", len(apps))
	}
	if apps[0].Name != "MyApp" {
		t.Errorf("expected name 'MyApp', got %q", apps[0].Name)
	}
}

func TestAppRepository_Update_Success(t *testing.T) {
	db := setupTestDB(t)
	repo := NewAppRepository(db)
	ctx := context.Background()

	id := insertTestApp(t, db, "Original", "http://original.local")

	app := &models.App{
		ID:       id,
		Name:     "Updated",
		URL:      "http://updated.local",
		Icon:     "cloud",
		Gradient: "gradient2",
	}

	err := repo.Update(ctx, app)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	fetched, _ := repo.GetByID(ctx, id)
	if fetched.Name != "Updated" {
		t.Errorf("expected name 'Updated', got %q", fetched.Name)
	}
	if fetched.URL != "http://updated.local" {
		t.Errorf("expected URL 'http://updated.local', got %q", fetched.URL)
	}
}

func TestAppRepository_Update_NotFound(t *testing.T) {
	db := setupTestDB(t)
	repo := NewAppRepository(db)
	ctx := context.Background()

	app := &models.App{
		ID:       999,
		Name:     "Not Found",
		URL:      "http://notfound.local",
		Icon:     "box",
		Gradient: "gradient1",
	}

	err := repo.Update(ctx, app)
	if err == nil {
		t.Fatal("expected error, got nil")
	}

	var appErr *apperrors.AppError
	if !errors.As(err, &appErr) || appErr.Code != 404 {
		t.Errorf("expected 404 AppError, got %v", err)
	}
}

func TestAppRepository_Delete_Success(t *testing.T) {
	db := setupTestDB(t)
	repo := NewAppRepository(db)
	ctx := context.Background()

	id := insertTestApp(t, db, "To Delete", "http://delete.local")

	err := repo.Delete(ctx, id)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, err = repo.GetByID(ctx, id)
	if err == nil {
		t.Fatal("expected error after delete, got nil")
	}
}

func TestAppRepository_Delete_NotFound(t *testing.T) {
	db := setupTestDB(t)
	repo := NewAppRepository(db)
	ctx := context.Background()

	err := repo.Delete(ctx, 999)
	if err == nil {
		t.Fatal("expected error, got nil")
	}

	var appErr *apperrors.AppError
	if !errors.As(err, &appErr) || appErr.Code != 404 {
		t.Errorf("expected 404 AppError, got %v", err)
	}
}

func TestAppRepository_Reorder(t *testing.T) {
	db := setupTestDB(t)
	repo := NewAppRepository(db)
	ctx := context.Background()

	id1 := insertTestApp(t, db, "App 1", "http://app1.local")
	id2 := insertTestApp(t, db, "App 2", "http://app2.local")
	id3 := insertTestApp(t, db, "App 3", "http://app3.local")

	ids := []int64{id3, id1, id2}
	err := repo.Reorder(ctx, ids)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	apps, _ := repo.GetAll(ctx)
	if len(apps) != 3 {
		t.Fatalf("expected 3 apps, got %d", len(apps))
	}

	if apps[0].ID != id3 {
		t.Errorf("expected first app ID %d, got %d", id3, apps[0].ID)
	}
	if apps[1].ID != id1 {
		t.Errorf("expected second app ID %d, got %d", id1, apps[1].ID)
	}
	if apps[2].ID != id2 {
		t.Errorf("expected third app ID %d, got %d", id2, apps[2].ID)
	}
}

func TestAppRepository_UpdateStatus(t *testing.T) {
	db := setupTestDB(t)
	repo := NewAppRepository(db)
	ctx := context.Background()

	id := insertTestApp(t, db, "Status App", "http://status.local")

	err := repo.UpdateStatus(ctx, id, true)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	app, _ := repo.GetByID(ctx, id)
	if !app.IsOnline {
		t.Error("expected app to be online")
	}

	err = repo.UpdateStatus(ctx, id, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	app, _ = repo.GetByID(ctx, id)
	if app.IsOnline {
		t.Error("expected app to be offline")
	}
}

func TestAppRepository_UpdateStatus_Upsert(t *testing.T) {
	db := setupTestDB(t)
	repo := NewAppRepository(db)
	ctx := context.Background()

	id := insertTestApp(t, db, "Upsert App", "http://upsert.local")

	err := repo.UpdateStatus(ctx, id, true)
	if err != nil {
		t.Fatalf("first update failed: %v", err)
	}

	err = repo.UpdateStatus(ctx, id, false)
	if err != nil {
		t.Fatalf("second update failed: %v", err)
	}

	err = repo.UpdateStatus(ctx, id, true)
	if err != nil {
		t.Fatalf("third update failed: %v", err)
	}

	app, _ := repo.GetByID(ctx, id)
	if !app.IsOnline {
		t.Error("expected app to be online after upsert")
	}
}

func TestParseTimestamp_SQLiteFormat(t *testing.T) {
	value := "2024-01-15 10:30:45"
	parsed, err := parseTimestamp(value)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if parsed.Year() != 2024 {
		t.Errorf("expected year 2024, got %d", parsed.Year())
	}
	if parsed.Month() != time.January {
		t.Errorf("expected January, got %v", parsed.Month())
	}
	if parsed.Day() != 15 {
		t.Errorf("expected day 15, got %d", parsed.Day())
	}
}

func TestParseTimestamp_RFC3339Format(t *testing.T) {
	value := "2024-01-15T10:30:45Z"
	parsed, err := parseTimestamp(value)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if parsed.Year() != 2024 {
		t.Errorf("expected year 2024, got %d", parsed.Year())
	}
}

func TestParseTimestamp_Invalid(t *testing.T) {
	value := "invalid timestamp"
	_, err := parseTimestamp(value)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestParseAppTimestamps_Success(t *testing.T) {
	app := &models.App{}
	err := parseAppTimestamps("2024-01-15 10:30:45", "2024-01-16 11:00:00", app)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if app.CreatedAt.IsZero() {
		t.Error("expected CreatedAt to be set")
	}
	if app.UpdatedAt.IsZero() {
		t.Error("expected UpdatedAt to be set")
	}
}

func TestParseAppTimestamps_InvalidCreated(t *testing.T) {
	app := &models.App{}
	err := parseAppTimestamps("invalid", "2024-01-16 11:00:00", app)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestParseAppTimestamps_InvalidUpdated(t *testing.T) {
	app := &models.App{}
	err := parseAppTimestamps("2024-01-15 10:30:45", "invalid", app)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}
