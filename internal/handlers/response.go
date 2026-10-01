package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	apperrors "portalon/internal/errors"
)

// parsePathID extracts and validates the "id" route parameter as an int64.
func parsePathID(r *http.Request) (int64, error) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return 0, apperrors.ValidationError("id", "must be a valid integer")
	}
	return id, nil
}

// respondJSON serializes data as JSON and writes it to the response with the given status code.
func respondJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if data != nil {
		if err := json.NewEncoder(w).Encode(data); err != nil {
			log.Printf("Error encoding JSON response: %v", err)
		}
	}
}

// writeError handles error responses by unwrapping AppError or returning a 500 status code.
func writeError(w http.ResponseWriter, err error) {
	var appErr *apperrors.AppError
	if errors.As(err, &appErr) {
		http.Error(w, appErr.Message, appErr.Code)
		return
	}
	log.Printf("Internal server error: %v", err)
	http.Error(w, "internal server error", http.StatusInternalServerError)
}
