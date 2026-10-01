package locale

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadLocale_Success(t *testing.T) {
	locale, err := LoadLocale("src/locale/en-US.json")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if locale == nil {
		t.Fatal("expected locale, got nil")
	}

	if locale.App.Name == "" {
		t.Error("expected app name to be set")
	}
	if locale.EmptyState.Headline == "" {
		t.Error("expected empty state headline to be set")
	}
	if locale.Modal.Title.Add == "" {
		t.Error("expected modal title add to be set")
	}
}

func TestLoadLocale_FileNotFound(t *testing.T) {
	_, err := LoadLocale("nonexistent.json")
	if err == nil {
		t.Fatal("expected error for nonexistent file, got nil")
	}
}

func TestMustLoadLocale_Success(t *testing.T) {
	locale := MustLoadLocale("src/locale/en-US.json")
	if locale == nil {
		t.Fatal("expected locale, got nil")
	}
	if locale.App.Name == "" {
		t.Error("expected app name to be set")
	}
}

func TestMustLoadLocale_PanicsOnError(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Error("expected panic for nonexistent file")
		}
	}()
	MustLoadLocale("nonexistent.json")
}

func TestLoadLocale_WithRelativePaths(t *testing.T) {
	dir := t.TempDir()
	localeFile := filepath.Join(dir, "test.json")
	content := `{"app":{"name":"TestApp","pageTitle":"Test Title"},"emptyState":{"headline":"Test","description":"Desc","button":"Btn"},"modal":{"title":{"add":"Add","edit":"Edit"},"button":{"cancel":"Cancel","save":"Save","update":"Update","saving":"Saving","updating":"Updating"},"label":{"appName":"Name","url":"URL","icon":"Icon"},"placeholder":{"appName":"AppName","url":"URL","iconSearch":"Search"},"close":"Close"},"search":{"placeholder":"Search"},"icon":{"label":"Icon","searchPlaceholder":"Search","loading":"Loading","error":"Error","noResults":"None"},"toast":{"close":"Close","success":{"created":"Created","updated":"Updated","deleted":"Deleted","createdDesc":"CreatedDesc","updatedDesc":"UpdatedDesc","deletedDesc":"DeletedDesc"},"error":{"save":"Save","delete":"Delete","connection":"Connection","form":"Form","saveDesc":"SaveDesc","generic":"Generic"}},"confirm":{"title":"Confirm","deleteApp":"DeleteApp","button":{"cancel":"Cancel","delete":"Delete"}},"validation":{"nameRequired":"NameRequired","urlRequired":"URLRequired","urlInvalid":"URLInvalid"},"editMode":{"title":"EditMode"},"topAppBar":{"addApp":"AddApp","toggleTheme":"ToggleTheme","toggleEditMode":"ToggleEditMode"}}`
	if err := os.WriteFile(localeFile, []byte(content), 0644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	oldWd, _ := os.Getwd()
	defer os.Chdir(oldWd)
	if err := os.Chdir(dir); err != nil {
		t.Fatalf("failed to chdir: %v", err)
	}

	locale, err := LoadLocale("test.json")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if locale.App.Name != "TestApp" {
		t.Errorf("expected app name 'TestApp', got %q", locale.App.Name)
	}
	if locale.App.PageTitle != "Test Title" {
		t.Errorf("expected page title 'Test Title', got %q", locale.App.PageTitle)
	}
}

func TestLoadLocale_InvalidJSON(t *testing.T) {
	dir := t.TempDir()
	localeFile := filepath.Join(dir, "invalid.json")
	if err := os.WriteFile(localeFile, []byte("invalid json"), 0644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	oldWd, _ := os.Getwd()
	defer os.Chdir(oldWd)
	if err := os.Chdir(dir); err != nil {
		t.Fatalf("failed to chdir: %v", err)
	}

	_, err := LoadLocale("invalid.json")
	if err == nil {
		t.Fatal("expected error for invalid JSON, got nil")
	}
}

func TestLoadLocale_BufferSizeEdgeCase(t *testing.T) {
	dir := t.TempDir()
	localeFile := filepath.Join(dir, "edge.json")
	content := `{"app":{"name":"Edge","pageTitle":"Edge"},"emptyState":{"headline":"H","description":"D","button":"B"},"modal":{"title":{"add":"A","edit":"E"},"button":{"cancel":"C","save":"S","update":"U","saving":"Sv","updating":"Up"},"label":{"appName":"N","url":"U","icon":"I"},"placeholder":{"appName":"P","url":"U","iconSearch":"IS"},"close":"Cl"},"search":{"placeholder":"P"},"icon":{"label":"L","searchPlaceholder":"SP","loading":"Lo","error":"Er","noResults":"NR"},"toast":{"close":"Cl","success":{"created":"Cr","updated":"Up","deleted":"De","createdDesc":"CD","updatedDesc":"UD","deletedDesc":"DD"},"error":{"save":"Sa","delete":"De","connection":"Co","form":"Fo","saveDesc":"SD","generic":"Ge"}},"confirm":{"title":"Co","deleteApp":"DA","button":{"cancel":"Ca","delete":"De"}},"validation":{"nameRequired":"NR","urlRequired":"UR","urlInvalid":"UI"},"editMode":{"title":"EM"},"topAppBar":{"addApp":"AA","toggleTheme":"TT","toggleEditMode":"TE"}}`
	if err := os.WriteFile(localeFile, []byte(content), 0644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	oldWd, _ := os.Getwd()
	defer os.Chdir(oldWd)
	if err := os.Chdir(dir); err != nil {
		t.Fatalf("failed to chdir: %v", err)
	}

	locale, err := LoadLocale("edge.json")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if locale.App.Name != "Edge" {
		t.Errorf("expected app name 'Edge', got %q", locale.App.Name)
	}
}