package errors

import (
	"errors"
	"fmt"
	"testing"
)

func TestAppError_Error(t *testing.T) {
	errWithoutWrap := &AppError{Code: 404, Message: "not found"}
	if errWithoutWrap.Error() != "not found" {
		t.Errorf("expected 'not found', got %q", errWithoutWrap.Error())
	}

	wrapped := fmt.Errorf("underlying sql error")
	errWithWrap := &AppError{Code: 500, Message: "db error", Err: wrapped}
	if errWithWrap.Error() != "db error: underlying sql error" {
		t.Errorf("expected 'db error: underlying sql error', got %q", errWithWrap.Error())
	}
}

func TestAppError_UnwrapAndErrorsAs(t *testing.T) {
	underlying := errors.New("connection refused")
	appErr := InternalError("failed to connect", underlying)

	// Test Unwrap
	if !errors.Is(appErr, underlying) {
		t.Errorf("expected errors.Is to find underlying error")
	}

	// Test errors.As through wrapping
	wrappedErr := fmt.Errorf("handler failed: %w", appErr)
	var extracted *AppError
	if !errors.As(wrappedErr, &extracted) {
		t.Fatalf("expected errors.As to extract AppError")
	}
	if extracted.Code != 500 {
		t.Errorf("expected code 500, got %d", extracted.Code)
	}
	if extracted.Message != "failed to connect" {
		t.Errorf("expected message 'failed to connect', got %q", extracted.Message)
	}
}

func TestAppError_Is(t *testing.T) {
	err1 := &AppError{Code: 404, Message: "not found"}
	err2 := &AppError{Code: 404, Message: "not found"}
	err3 := &AppError{Code: 404, Message: "different message"}
	err4 := &AppError{Code: 400, Message: "not found"}

	if !errors.Is(err1, err2) {
		t.Errorf("expected err1 and err2 to match with errors.Is")
	}
	if errors.Is(err1, err3) {
		t.Errorf("expected err1 and err3 not to match")
	}
	if errors.Is(err1, err4) {
		t.Errorf("expected err1 and err4 not to match")
	}
}

func TestConstructors(t *testing.T) {
	nf := NotFound("app", 42)
	if nf.Code != 404 || nf.Message != "app with id 42 not found" {
		t.Errorf("unexpected NotFound error: %+v", nf)
	}

	ve := ValidationError("url", "is invalid")
	if ve.Code != 400 || ve.Message != "validation error: url is invalid" {
		t.Errorf("unexpected ValidationError error: %+v", ve)
	}

	baseErr := errors.New("disk full")
	ie := InternalError("write error", baseErr)
	if ie.Code != 500 || ie.Message != "write error" || ie.Err != baseErr {
		t.Errorf("unexpected InternalError error: %+v", ie)
	}
}
