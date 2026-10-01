package handlers

import (
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
)

type IconHandler struct {
	iconsOnce  sync.Once
	icons      []string
	iconsErr   error
	iconsDir   string
}

func NewIconHandler() *IconHandler {
	return &IconHandler{
		iconsDir: resolveIconsDir(),
	}
}

func resolveIconsDir() string {
	candidates := []string{
		"static/icons",
		"../static/icons",
		"../../static/icons",
	}
	for _, dir := range candidates {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			return dir
		}
	}
	return "static/icons"
}

func (h *IconHandler) getIcons() ([]string, error) {
	h.iconsOnce.Do(func() {
		entries, err := os.ReadDir(h.iconsDir)
		if err != nil {
			h.iconsErr = err
			return
		}

		var icons []string
		for _, e := range entries {
			if !e.IsDir() && strings.HasSuffix(e.Name(), ".svg") {
				icons = append(icons, strings.TrimSuffix(e.Name(), ".svg"))
			}
		}
		sort.Strings(icons)
		h.icons = icons
	})

	if h.iconsErr != nil {
		return nil, h.iconsErr
	}
	return h.icons, nil
}

func (h *IconHandler) ListIcons(w http.ResponseWriter, r *http.Request) {
	allIcons, err := h.getIcons()
	if err != nil {
		log.Printf("Failed to read icons directory: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	searchQuery := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("search")))
	filteredIcons := filterIcons(allIcons, searchQuery)

	start, end := parsePaginationRange(r, len(filteredIcons))
	result := map[string]interface{}{
		"icons": filteredIcons[start:end],
		"total": len(filteredIcons),
	}

	respondJSON(w, http.StatusOK, result)
}

func filterIcons(icons []string, query string) []string {
	if query == "" {
		return icons
	}

	var filtered []string
	for _, icon := range icons {
		if strings.Contains(strings.ToLower(icon), query) {
			filtered = append(filtered, icon)
		}
	}
	return filtered
}

func parsePaginationRange(r *http.Request, total int) (start int, end int) {
	limit := 10
	offset := 0

	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	if offset > total {
		offset = total
	}

	endRange := offset + limit
	if endRange > total {
		endRange = total
	}

	return offset, endRange
}

