package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	apperrors "portalon/internal/errors"
	"portalon/internal/models"
)

type AppRepository interface {
	GetAll(ctx context.Context) ([]models.App, error)
	Search(ctx context.Context, query string) ([]models.App, error)
	GetByID(ctx context.Context, id int64) (*models.App, error)
	Create(ctx context.Context, app *models.App) error
	Update(ctx context.Context, app *models.App) error
	Delete(ctx context.Context, id int64) error
	Reorder(ctx context.Context, ids []int64) error
	UpdateStatus(ctx context.Context, appID int64, isOnline bool) error
}

type appRepository struct {
	db *sql.DB
}

func NewAppRepository(db *sql.DB) AppRepository {
	return &appRepository{db: db}
}

func (r *appRepository) GetAll(ctx context.Context) ([]models.App, error) {
	rows, err := r.db.QueryContext(ctx, selectAllAppsQuery)
	if err != nil {
		return nil, apperrors.InternalError("query apps", err)
	}
	defer rows.Close()

	return scanAllApps(rows)
}

func (r *appRepository) Search(ctx context.Context, query string) ([]models.App, error) {
	rows, err := r.db.QueryContext(ctx, searchAppsQuery, "%"+query+"%")
	if err != nil {
		return nil, apperrors.InternalError("search apps", err)
	}
	defer rows.Close()

	return scanAllApps(rows)
}

func (r *appRepository) GetByID(ctx context.Context, id int64) (*models.App, error) {
	var app models.App
	var createdAt, updatedAt string

	err := r.db.QueryRowContext(ctx, selectAppByIDQuery, id).Scan(
		&app.ID,
		&app.Name,
		&app.URL,
		&app.Icon,
		&app.Gradient,
		&app.Position,
		&app.IsOnline,
		&createdAt,
		&updatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, apperrors.NotFound("app", id)
	}
	if err != nil {
		return nil, apperrors.InternalError("get app", err)
	}

	if err := parseAppTimestamps(createdAt, updatedAt, &app); err != nil {
		return nil, err
	}

	return &app, nil
}

func (r *appRepository) Create(ctx context.Context, app *models.App) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return apperrors.InternalError("begin transaction", err)
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(
		ctx,
		insertAppQuery,
		app.Name,
		app.URL,
		app.Icon,
		app.Gradient,
		app.Position,
	)
	if err != nil {
		return apperrors.InternalError("insert app", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return apperrors.InternalError("get inserted app id", err)
	}

	if _, err = tx.ExecContext(ctx, insertAppStatusQuery, id); err != nil {
		return apperrors.InternalError("insert app status", err)
	}

	if err := tx.Commit(); err != nil {
		return apperrors.InternalError("commit transaction", err)
	}

	app.ID = id
	return nil
}

func (r *appRepository) Update(ctx context.Context, app *models.App) error {
	result, err := r.db.ExecContext(
		ctx,
		updateAppQuery,
		app.Name,
		app.URL,
		app.Icon,
		app.Gradient,
		app.ID,
	)
	if err != nil {
		return apperrors.InternalError("update app", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return apperrors.InternalError("get affected rows", err)
	}
	if rowsAffected == 0 {
		return apperrors.NotFound("app", app.ID)
	}

	return nil
}

func (r *appRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.db.ExecContext(ctx, deleteAppQuery, id)
	if err != nil {
		return apperrors.InternalError("delete app", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return apperrors.InternalError("get affected rows", err)
	}
	if rowsAffected == 0 {
		return apperrors.NotFound("app", id)
	}

	return nil
}

// Reorder updates the position of each app in a single transaction.
// Uses a prepared statement to avoid recompiling the SQL for each update.
func (r *appRepository) Reorder(ctx context.Context, ids []int64) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return apperrors.InternalError("begin transaction", err)
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, updateAppPositionQuery)
	if err != nil {
		return apperrors.InternalError("prepare reorder statement", err)
	}
	defer stmt.Close()

	for position, id := range ids {
		if _, err := stmt.ExecContext(ctx, position, id); err != nil {
			return apperrors.InternalError(fmt.Sprintf("reorder app %d", id), err)
		}
	}

	if err := tx.Commit(); err != nil {
		return apperrors.InternalError("commit reorder transaction", err)
	}

	return nil
}

func (r *appRepository) UpdateStatus(ctx context.Context, appID int64, isOnline bool) error {
	_, err := r.db.ExecContext(ctx, updateAppStatusQuery, appID, isOnline)
	if err != nil {
		return apperrors.InternalError("update app status", err)
	}

	return nil
}

// Helpers for scanning rows and timestamps

func scanAllApps(rows *sql.Rows) ([]models.App, error) {
	var apps []models.App

	for rows.Next() {
		app, err := scanApp(rows)
		if err != nil {
			return nil, err
		}
		apps = append(apps, app)
	}

	if err := rows.Err(); err != nil {
		return nil, apperrors.InternalError("iterate apps", err)
	}

	return apps, nil
}

func scanApp(rows *sql.Rows) (models.App, error) {
	var app models.App
	var createdAt, updatedAt string

	err := rows.Scan(
		&app.ID,
		&app.Name,
		&app.URL,
		&app.Icon,
		&app.Gradient,
		&app.Position,
		&app.IsOnline,
		&createdAt,
		&updatedAt,
	)
	if err != nil {
		return app, apperrors.InternalError("scan app", err)
	}

	if err := parseAppTimestamps(createdAt, updatedAt, &app); err != nil {
		return app, err
	}

	return app, nil
}

// SQLite CURRENT_TIMESTAMP returns "2006-01-02 15:04:05".
// RFC3339 covers ISO 8601 formats from external sources.
var timestampFormats = []string{
	"2006-01-02 15:04:05",
	time.RFC3339,
}

func parseTimestamp(value string) (time.Time, error) {
	for _, format := range timestampFormats {
		if t, err := time.Parse(format, value); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("unable to parse timestamp: %q", value)
}

func parseAppTimestamps(createdAt, updatedAt string, app *models.App) error {
	created, err := parseTimestamp(createdAt)
	if err != nil {
		return apperrors.InternalError("parse created_at", err)
	}

	updated, err := parseTimestamp(updatedAt)
	if err != nil {
		return apperrors.InternalError("parse updated_at", err)
	}

	app.CreatedAt = created
	app.UpdatedAt = updated

	return nil
}

