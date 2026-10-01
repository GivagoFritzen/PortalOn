package handlers

import (
	"os"
	"path/filepath"
	"testing"
)

func TestResolveTemplateDir_Candidates(t *testing.T) {
	tests := []struct {
		name      string
		setup     func(t *testing.T) (string, func())
		expected  string
	}{
		{
			name: "templates directory exists",
			setup: func(t *testing.T) (string, func()) {
				tmpDir := t.TempDir()
				templatesDir := filepath.Join(tmpDir, "templates")
				if err := os.MkdirAll(templatesDir, 0755); err != nil {
					t.Fatal(err)
				}
				origDir, _ := os.Getwd()
				os.Chdir(tmpDir)
				return origDir, func() { os.Chdir(origDir) }
			},
			expected: "templates",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, cleanup := tt.setup(t)
			defer cleanup()

			result := resolveTemplateDir()
			if result != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, result)
			}
		})
	}
}

func TestResolveTemplateDir_Fallback(t *testing.T) {
	tmpDir := t.TempDir()
	origDir, _ := os.Getwd()
	os.Chdir(tmpDir)
	defer os.Chdir(origDir)

	result := resolveTemplateDir()
	if result != "templates" {
		t.Errorf("expected fallback to 'templates', got %q", result)
	}
}

func TestLoadComponentCSS_NoComponents(t *testing.T) {
	tmpDir := t.TempDir()
	result := loadComponentCSS(tmpDir)
	if result != "" {
		t.Errorf("expected empty string for no components, got %q", result)
	}
}

func TestLoadComponentCSS_WithComponents(t *testing.T) {
	tmpDir := t.TempDir()

	componentsDir := filepath.Join(tmpDir, "components", "button")
	if err := os.MkdirAll(componentsDir, 0755); err != nil {
		t.Fatal(err)
	}

	cssContent := ".btn { color: red; }"
	cssPath := filepath.Join(componentsDir, "button.css")
	if err := os.WriteFile(cssPath, []byte(cssContent), 0644); err != nil {
		t.Fatal(err)
	}

	result := loadComponentCSS(tmpDir)

	if result == "" {
		t.Fatal("expected non-empty CSS result")
	}

	if !containsStr(result, "/* button */") {
		t.Errorf("expected component comment, got: %s", result)
	}

	if !containsStr(result, cssContent) {
		t.Errorf("expected CSS content, got: %s", result)
	}
}

func TestLoadComponentCSS_MultipleComponents(t *testing.T) {
	tmpDir := t.TempDir()

	components := []struct {
		name string
		css  string
	}{
		{"button", ".btn {}"},
		{"card", ".card {}"},
		{"modal", ".modal {}"},
	}

	for _, comp := range components {
		dir := filepath.Join(tmpDir, "components", comp.name)
		if err := os.MkdirAll(dir, 0755); err != nil {
			t.Fatal(err)
		}
		path := filepath.Join(dir, comp.name+".css")
		if err := os.WriteFile(path, []byte(comp.css), 0644); err != nil {
			t.Fatal(err)
		}
	}

	result := loadComponentCSS(tmpDir)

	for _, comp := range components {
		if !containsStr(result, comp.css) {
			t.Errorf("expected CSS for component %s", comp.name)
		}
	}
}

func TestLoadComponentCSS_SkipsNonCSSFiles(t *testing.T) {
	tmpDir := t.TempDir()

	componentsDir := filepath.Join(tmpDir, "components", "button")
	if err := os.MkdirAll(componentsDir, 0755); err != nil {
		t.Fatal(err)
	}

	if err := os.WriteFile(filepath.Join(componentsDir, "button.css"), []byte(".btn {}"), 0644); err != nil {
		t.Fatal(err)
	}

	if err := os.WriteFile(filepath.Join(componentsDir, "button.js"), []byte("console.log()"), 0644); err != nil {
		t.Fatal(err)
	}

	if err := os.WriteFile(filepath.Join(componentsDir, "readme.txt"), []byte("readme"), 0644); err != nil {
		t.Fatal(err)
	}

	result := loadComponentCSS(tmpDir)

	if !containsStr(result, ".btn {}") {
		t.Error("expected CSS content to be included")
	}

	if containsStr(result, "console.log()") {
		t.Error("expected JS content to be excluded")
	}

	if containsStr(result, "readme") {
		t.Error("expected txt content to be excluded")
	}
}

func TestLoadComponentCSS_EmptyDirectory(t *testing.T) {
	tmpDir := t.TempDir()

	componentsDir := filepath.Join(tmpDir, "components", "empty")
	if err := os.MkdirAll(componentsDir, 0755); err != nil {
		t.Fatal(err)
	}

	result := loadComponentCSS(tmpDir)
	if result != "" {
		t.Errorf("expected empty string for empty component, got %q", result)
	}
}

func containsStr(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || findSubstring(s, substr))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
