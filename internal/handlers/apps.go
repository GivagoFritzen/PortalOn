package handlers

import (
	"encoding/json"
	"html/template"
	"net/http"

	"portalon/internal/locale"
	"portalon/internal/models"
	"portalon/internal/service"
)

const invalidID = "invalid id"

type AppHandler struct {
	service   service.AppService
	templates *template.Template
	locale    *locale.Locale
}

func NewAppHandler(svc service.AppService) *AppHandler {
	h := &AppHandler{service: svc}
	h.locale = locale.MustLoadLocale("src/locale/en-US.json")
	h.loadTemplates()
	return h
}

type IndexPageData struct {
	Apps   []models.App
	Locale *locale.Locale
}

func (h *AppHandler) IndexHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	apps, err := h.service.ListAll(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	data := IndexPageData{Apps: apps, Locale: h.locale}
	if err := h.templates.ExecuteTemplate(w, "index.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func (h *AppHandler) ListApps(w http.ResponseWriter, r *http.Request) {
	apps, err := h.service.ListAll(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}

	respondJSON(w, http.StatusOK, apps)
}

func (h *AppHandler) SearchAppsHandler(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")

	apps, err := h.service.Search(r.Context(), query)
	if err != nil {
		writeError(w, err)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	for _, app := range apps {
		if err := h.templates.ExecuteTemplate(w, "app_card", app); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
}

func (h *AppHandler) GetApp(w http.ResponseWriter, r *http.Request) {
	id, err := parsePathID(r)
	if err != nil {
		http.Error(w, invalidID, http.StatusBadRequest)
		return
	}

	app, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, err)
		return
	}

	respondJSON(w, http.StatusOK, app)
}

func (h *AppHandler) CreateApp(w http.ResponseWriter, r *http.Request) {
	var app models.App
	if err := json.NewDecoder(r.Body).Decode(&app); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.service.Create(r.Context(), &app); err != nil {
		writeError(w, err)
		return
	}

	respondJSON(w, http.StatusCreated, app)
}

func (h *AppHandler) UpdateApp(w http.ResponseWriter, r *http.Request) {
	id, err := parsePathID(r)
	if err != nil {
		http.Error(w, invalidID, http.StatusBadRequest)
		return
	}

	var app models.App
	if err := json.NewDecoder(r.Body).Decode(&app); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.service.Update(r.Context(), id, &app); err != nil {
		writeError(w, err)
		return
	}

	respondJSON(w, http.StatusOK, app)
}

func (h *AppHandler) DeleteApp(w http.ResponseWriter, r *http.Request) {
	id, err := parsePathID(r)
	if err != nil {
		http.Error(w, invalidID, http.StatusBadRequest)
		return
	}

	if err := h.service.Delete(r.Context(), id); err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *AppHandler) ReorderApps(w http.ResponseWriter, r *http.Request) {
	var req models.ReorderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := h.service.Reorder(r.Context(), req.IDs); err != nil {
		writeError(w, err)
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

