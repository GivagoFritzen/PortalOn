package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	apperrors "portalon/internal/errors"
)

func TestRespondJSON_Success(t *testing.T) {
	w := httptest.NewRecorder()
	data := map[string]string{"key": "value"}

	respondJSON(w, http.StatusOK, data)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	contentType := w.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", contentType)
	}

	var result map[string]string
	if err := json.NewDecoder(w.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if result["key"] != "value" {
		t.Errorf("expected key=value, got %v", result)
	}
}

func TestRespondJSON_NilData(t *testing.T) {
	w := httptest.NewRecorder()

	respondJSON(w, http.StatusNoContent, nil)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected status 204, got %d", w.Code)
	}

	if w.Body.Len() != 0 {
		t.Errorf("expected empty body for nil data, got %q", w.Body.String())
	}
}

func TestRespondJSON_DifferentStatusCodes(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
	}{
		{"Created", http.StatusCreated},
		{"BadRequest", http.StatusBadRequest},
		{"NotFound", http.StatusNotFound},
		{"InternalServerError", http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			respondJSON(w, tt.statusCode, map[string]string{"status": "ok"})

			if w.Code != tt.statusCode {
				t.Errorf("expected status %d, got %d", tt.statusCode, w.Code)
			}
		})
	}
}

func TestWriteError_AppError(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantStatus int
		wantMsg    string
	}{
		{
			name:       "NotFound error",
			err:        apperrors.NotFound("app", 123),
			wantStatus: http.StatusNotFound,
			wantMsg:    "app with id 123 not found",
		},
		{
			name:       "ValidationError",
			err:        apperrors.ValidationError("name", "is required"),
			wantStatus: http.StatusBadRequest,
			wantMsg:    "validation error: name is required",
		},
		{
			name:       "InternalError",
			err:        apperrors.InternalError("db connection failed", nil),
			wantStatus: http.StatusInternalServerError,
			wantMsg:    "db connection failed",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			writeError(w, tt.err)

			if w.Code != tt.wantStatus {
				t.Errorf("expected status %d, got %d", tt.wantStatus, w.Code)
			}

			body := w.Body.String()
			if body != tt.wantMsg+"\n" {
				t.Errorf("expected message %q, got %q", tt.wantMsg, body)
			}
		})
	}
}

func TestWriteError_GenericError(t *testing.T) {
	w := httptest.NewRecorder()
	genericErr := &genericError{msg: "something went wrong"}

	writeError(w, genericErr)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500 for generic error, got %d", w.Code)
	}

	body := w.Body.String()
	if body != "internal server error\n" {
		t.Errorf("expected generic error message, got %q", body)
	}
}

type genericError struct {
	msg string
}

func (e *genericError) Error() string {
	return e.msg
}

func TestParsePathID_Valid(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/apps/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, err := parsePathID(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.Write([]byte("ok:" + strconv.FormatInt(id, 10)))
	})

	req := httptest.NewRequest(http.MethodGet, "/api/apps/42", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
	if w.Body.String() != "ok:42" {
		t.Errorf("expected id 42, got %q", w.Body.String())
	}
}

func TestParsePathID_Invalid(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/apps/abc", nil)

	id, err := parsePathID(req)

	if err == nil {
		t.Fatal("expected error for invalid id")
	}
	if id != 0 {
		t.Errorf("expected id 0 on error, got %d", id)
	}
}

func TestParsePathID_Empty(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/apps/", nil)

	id, err := parsePathID(req)

	if err == nil {
		t.Fatal("expected error for empty id")
	}
	if id != 0 {
		t.Errorf("expected id 0 on error, got %d", id)
	}
}