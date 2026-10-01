package service

import (
	"testing"

	"portalon/internal/models"
)

func TestValidateApp_Nil(t *testing.T) {
	err := validateApp(nil)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if err.Error() != "validation error: app cannot be nil" {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestValidateApp_EmptyName(t *testing.T) {
	app := &models.App{Name: "", URL: "http://valid.local"}
	err := validateApp(app)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if err.Error() != "validation error: name is required" {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestValidateApp_WhitespaceName(t *testing.T) {
	app := &models.App{Name: "   ", URL: "http://valid.local"}
	err := validateApp(app)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if err.Error() != "validation error: name is required" {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestValidateApp_EmptyURL(t *testing.T) {
	app := &models.App{Name: "Valid Name", URL: ""}
	err := validateApp(app)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if err.Error() != "validation error: url is required" {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestValidateApp_WhitespaceURL(t *testing.T) {
	app := &models.App{Name: "Valid Name", URL: "   "}
	err := validateApp(app)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if err.Error() != "validation error: url is required" {
		t.Errorf("unexpected error message: %v", err)
	}
}

func TestValidateApp_InvalidURLScheme(t *testing.T) {
	tests := []struct {
		name string
		url  string
	}{
		{"javascript", "javascript:alert(1)"},
		{"ftp", "ftp://example.com/file"},
		{"file", "file:///etc/passwd"},
		{"data", "data:text/html,<script>alert(1)</script>"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := &models.App{Name: "Test", URL: tt.url}
			err := validateApp(app)
			if err == nil {
				t.Fatal("expected error, got nil")
			}
		})
	}
}

func TestValidateApp_InvalidURLFormat(t *testing.T) {
	tests := []struct {
		name string
		url  string
	}{
		{"no scheme", "example.com"},
		{"no host", "http://"},
		{"random text", "not-a-valid-url"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := &models.App{Name: "Test", URL: tt.url}
			err := validateApp(app)
			if err == nil {
				t.Fatal("expected error, got nil")
			}
		})
	}
}

func TestValidateApp_Success(t *testing.T) {
	tests := []struct {
		name     string
		app      *models.App
		wantName string
		wantURL  string
	}{
		{
			name:     "http url",
			app:      &models.App{Name: "Test App", URL: "http://localhost:8080"},
			wantName: "Test App",
			wantURL:  "http://localhost:8080",
		},
		{
			name:     "https url",
			app:      &models.App{Name: "Test App", URL: "https://example.com/dashboard"},
			wantName: "Test App",
			wantURL:  "https://example.com/dashboard",
		},
		{
			name:     "trims whitespace",
			app:      &models.App{Name: "  Test App  ", URL: "  http://example.com  "},
			wantName: "Test App",
			wantURL:  "http://example.com",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateApp(tt.app)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tt.app.Name != tt.wantName {
				t.Errorf("expected name %q, got %q", tt.wantName, tt.app.Name)
			}
			if tt.app.URL != tt.wantURL {
				t.Errorf("expected URL %q, got %q", tt.wantURL, tt.app.URL)
			}
		})
	}
}

func TestIsValidWebURL(t *testing.T) {
	tests := []struct {
		name   string
		url    string
		valid  bool
	}{
		{"valid http", "http://example.com", true},
		{"valid https", "https://example.com", true},
		{"valid with path", "https://example.com/path/to/page", true},
		{"valid with port", "http://localhost:8080", true},
		{"valid with query", "https://example.com?q=search", true},
		{"invalid ftp", "ftp://example.com", false},
		{"invalid file", "file:///etc/passwd", false},
		{"invalid javascript", "javascript:alert(1)", false},
		{"invalid no scheme", "example.com", false},
		{"invalid no host", "http://", false},
		{"empty", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isValidWebURL(tt.url)
			if result != tt.valid {
				t.Errorf("isValidWebURL(%q) = %v, want %v", tt.url, result, tt.valid)
			}
		})
	}
}

func TestSetDefaultIconIfEmpty_Empty(t *testing.T) {
	app := &models.App{Icon: ""}
	setDefaultIconIfEmpty(app)
	if app.Icon != "box" {
		t.Errorf("expected default icon 'box', got %q", app.Icon)
	}
}

func TestSetDefaultIconIfEmpty_Whitespace(t *testing.T) {
	app := &models.App{Icon: "   "}
	setDefaultIconIfEmpty(app)
	if app.Icon != "box" {
		t.Errorf("expected default icon 'box', got %q", app.Icon)
	}
}

func TestSetDefaultIconIfEmpty_Existing(t *testing.T) {
	app := &models.App{Icon: "cloud"}
	setDefaultIconIfEmpty(app)
	if app.Icon != "cloud" {
		t.Errorf("expected icon 'cloud', got %q", app.Icon)
	}
}

func TestSetDefaultIconsForAll_Empty(t *testing.T) {
	apps := []models.App{
		{Icon: ""},
		{Icon: "cloud"},
		{Icon: "   "},
	}
	setDefaultIconsForAll(apps)

	if apps[0].Icon != "box" {
		t.Errorf("expected first app icon 'box', got %q", apps[0].Icon)
	}
	if apps[1].Icon != "cloud" {
		t.Errorf("expected second app icon 'cloud', got %q", apps[1].Icon)
	}
	if apps[2].Icon != "box" {
		t.Errorf("expected third app icon 'box', got %q", apps[2].Icon)
	}
}

func TestSetDefaultIconsForAll_EmptyList(t *testing.T) {
	apps := []models.App{}
	setDefaultIconsForAll(apps)
	if len(apps) != 0 {
		t.Errorf("expected empty list, got %d items", len(apps))
	}
}
