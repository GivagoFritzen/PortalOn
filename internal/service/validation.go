package service

import (
	"net/url"
	"strings"

	apperrors "portalon/internal/errors"
	"portalon/internal/models"
)

func validateApp(app *models.App) error {
	if app == nil {
		return apperrors.ValidationError("app", "cannot be nil")
	}

	name := strings.TrimSpace(app.Name)
	if name == "" {
		return apperrors.ValidationError("name", "is required")
	}

	rawURL := strings.TrimSpace(app.URL)
	if rawURL == "" {
		return apperrors.ValidationError("url", "is required")
	}

	if !isValidWebURL(rawURL) {
		return apperrors.ValidationError("url", "must be a valid http or https URL")
	}

	app.Name = name
	app.URL = rawURL
	return nil
}

func isValidWebURL(rawURL string) bool {
	parsed, err := url.ParseRequestURI(rawURL)
	if err != nil {
		return false
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return false
	}
	return parsed.Host != ""
}

func setDefaultIconIfEmpty(app *models.App) {
	if strings.TrimSpace(app.Icon) == "" {
		app.Icon = defaultAppIcon
	}
}

func setDefaultIconsForAll(apps []models.App) {
	for i := range apps {
		setDefaultIconIfEmpty(&apps[i])
	}
}
