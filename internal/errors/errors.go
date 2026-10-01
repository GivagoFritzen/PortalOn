package errors

import "fmt"

type AppError struct {
	Code    int
	Message string
	Err     error
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

func (e *AppError) Unwrap() error {
	return e.Err
}

func (e *AppError) Is(target error) bool {
	t, ok := target.(*AppError)
	if !ok {
		return false
	}
	return e.Code == t.Code && (t.Message == "" || e.Message == t.Message)
}

func NotFound(resource string, id int64) *AppError {
	return &AppError{
		Code:    404,
		Message: fmt.Sprintf("%s with id %d not found", resource, id),
	}
}

func ValidationError(field, reason string) *AppError {
	return &AppError{
		Code:    400,
		Message: fmt.Sprintf("validation error: %s %s", field, reason),
	}
}

func InternalError(msg string, err error) *AppError {
	return &AppError{
		Code:    500,
		Message: msg,
		Err:     err,
	}
}
