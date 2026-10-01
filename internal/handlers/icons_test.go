package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func setupTestIcons(t *testing.T) (string, func()) {
	t.Helper()

	tmpDir := t.TempDir()

	iconsDir := filepath.Join(tmpDir, "static", "icons")
	if err := os.MkdirAll(iconsDir, 0755); err != nil {
		t.Fatalf("failed to create icons dir: %v", err)
	}

	icons := []string{"box", "cloud", "database", "server", "wifi"}
	for _, icon := range icons {
		path := filepath.Join(iconsDir, icon+".svg")
		if err := os.WriteFile(path, []byte("<svg></svg>"), 0644); err != nil {
			t.Fatalf("failed to create icon file: %v", err)
		}
	}

	origDir, _ := os.Getwd()
	os.Chdir(tmpDir)

	cleanup := func() {
		os.Chdir(origDir)
	}

	return tmpDir, cleanup
}

func TestIconHandler_ListIcons(t *testing.T) {
	_, cleanup := setupTestIcons(t)
	defer cleanup()

	h := NewIconHandler()

	req := httptest.NewRequest(http.MethodGet, "/api/icons", nil)
	w := httptest.NewRecorder()

	h.ListIcons(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	total, ok := resp["total"].(float64)
	if !ok {
		t.Fatalf("expected total to be a number")
	}
	if int(total) != 5 {
		t.Errorf("expected 5 icons, got %d", int(total))
	}

	iconList, ok := resp["icons"].([]interface{})
	if !ok {
		t.Fatalf("expected icons to be an array")
	}
	if len(iconList) != 5 {
		t.Errorf("expected 5 icons in array, got %d", len(iconList))
	}
}

func TestIconHandler_ListIcons_Search(t *testing.T) {
	_, cleanup := setupTestIcons(t)
	defer cleanup()

	h := NewIconHandler()

	req := httptest.NewRequest(http.MethodGet, "/api/icons?search=cloud", nil)
	w := httptest.NewRecorder()

	h.ListIcons(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	total := int(resp["total"].(float64))
	if total != 1 {
		t.Errorf("expected 1 icon matching 'cloud', got %d", total)
	}
}

func TestIconHandler_ListIcons_SearchNoResults(t *testing.T) {
	_, cleanup := setupTestIcons(t)
	defer cleanup()

	h := NewIconHandler()

	req := httptest.NewRequest(http.MethodGet, "/api/icons?search=nonexistent", nil)
	w := httptest.NewRecorder()

	h.ListIcons(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	total := int(resp["total"].(float64))
	if total != 0 {
		t.Errorf("expected 0 icons for nonexistent search, got %d", total)
	}
}

func TestIconHandler_ListIcons_Pagination(t *testing.T) {
	_, cleanup := setupTestIcons(t)
	defer cleanup()

	h := NewIconHandler()

	req := httptest.NewRequest(http.MethodGet, "/api/icons?limit=2&offset=0", nil)
	w := httptest.NewRecorder()

	h.ListIcons(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	iconList := resp["icons"].([]interface{})
	if len(iconList) != 2 {
		t.Errorf("expected 2 icons with limit=2, got %d", len(iconList))
	}

	total := int(resp["total"].(float64))
	if total != 5 {
		t.Errorf("expected total 5, got %d", total)
	}
}

func TestIconHandler_ListIcons_PaginationOffset(t *testing.T) {
	_, cleanup := setupTestIcons(t)
	defer cleanup()

	h := NewIconHandler()

	req := httptest.NewRequest(http.MethodGet, "/api/icons?limit=2&offset=3", nil)
	w := httptest.NewRecorder()

	h.ListIcons(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	iconList := resp["icons"].([]interface{})
	if len(iconList) != 2 {
		t.Errorf("expected 2 icons with offset=3, got %d", len(iconList))
	}
}

func TestIconHandler_ListIcons_PaginationOffsetExceedsTotal(t *testing.T) {
	_, cleanup := setupTestIcons(t)
	defer cleanup()

	h := NewIconHandler()

	req := httptest.NewRequest(http.MethodGet, "/api/icons?offset=10", nil)
	w := httptest.NewRecorder()

	h.ListIcons(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	iconList := resp["icons"].([]interface{})
	if len(iconList) != 0 {
		t.Errorf("expected 0 icons when offset exceeds total, got %d", len(iconList))
	}
}

func TestIconHandler_ListIcons_InvalidPaginationParams(t *testing.T) {
	_, cleanup := setupTestIcons(t)
	defer cleanup()

	h := NewIconHandler()

	req := httptest.NewRequest(http.MethodGet, "/api/icons?limit=-1&offset=abc", nil)
	w := httptest.NewRecorder()

	h.ListIcons(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	iconList := resp["icons"].([]interface{})
	if len(iconList) != 5 {
		t.Errorf("expected 5 icons with invalid params (defaults), got %d", len(iconList))
	}
}

func TestIconHandler_ListIcons_DirectoryError(t *testing.T) {
	origDir, _ := os.Getwd()
	tmpDir := t.TempDir()
	os.Chdir(tmpDir)
	defer os.Chdir(origDir)

	h := NewIconHandler()

	req := httptest.NewRequest(http.MethodGet, "/api/icons", nil)
	w := httptest.NewRecorder()

	h.ListIcons(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500, got %d", w.Code)
	}
}

func TestFilterIcons(t *testing.T) {
	icons := []string{"box", "cloud", "database", "server", "wifi"}

	tests := []struct {
		name     string
		query    string
		expected int
	}{
		{"empty query", "", 5},
		{"partial match", "cloud", 1},
		{"case insensitive", "cloud", 1},
		{"no match", "xyz", 0},
		{"multiple matches", "er", 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := filterIcons(icons, tt.query)
			if len(result) != tt.expected {
				t.Errorf("expected %d icons, got %d", tt.expected, len(result))
			}
		})
	}
}

func TestParsePaginationRange(t *testing.T) {
	tests := []struct {
		name          string
		query         string
		total         int
		expectedStart int
		expectedEnd   int
	}{
		{"no params", "", 10, 0, 10},
		{"limit only", "?limit=3", 10, 0, 3},
		{"offset only", "?offset=5", 10, 5, 10},
		{"both params", "?limit=2&offset=3", 10, 3, 5},
		{"offset exceeds total", "?offset=20", 10, 10, 10},
		{"limit exceeds total", "?limit=20", 10, 0, 10},
		{"invalid limit", "?limit=abc", 10, 0, 10},
		{"invalid offset", "?offset=abc", 10, 0, 10},
		{"zero limit", "?limit=0", 10, 0, 10},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/"+tt.query, nil)
			start, end := parsePaginationRange(req, tt.total)
			if start != tt.expectedStart {
				t.Errorf("expected start %d, got %d", tt.expectedStart, start)
			}
			if end != tt.expectedEnd {
				t.Errorf("expected end %d, got %d", tt.expectedEnd, end)
			}
		})
	}
}
