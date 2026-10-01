package models

import "time"

type App struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	URL       string    `json:"url"`
	Icon      string    `json:"icon"`
	Gradient  string    `json:"gradient"`
	Position  int       `json:"position"`
	IsOnline  bool      `json:"is_online"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}


