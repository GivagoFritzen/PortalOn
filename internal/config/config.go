package config

import "os"

const (
	defaultPort   = "8888"
	defaultDBPath = "data/portalon.db"
)

type Config struct {
	Port   string
	DBPath string
}

// Load reads application configuration from environment variables or applies sensible defaults.
func Load() *Config {
	port := os.Getenv("PORTALON_PORT")
	if port == "" {
		port = defaultPort
	}

	dbPath := os.Getenv("PORTALON_DB_PATH")
	if dbPath == "" {
		dbPath = defaultDBPath
	}

	return &Config{
		Port:   port,
		DBPath: dbPath,
	}
}

