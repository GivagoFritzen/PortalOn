package handlers

import (
	"html/template"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

func resolveTemplateDir() string {
	candidates := []string{
		"templates",
		"../../templates",
		"../templates",
	}
	for _, dir := range candidates {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			return dir
		}
	}
	return "templates"
}

func (h *AppHandler) loadTemplates() {
	baseDir := resolveTemplateDir()
	componentCSS := loadComponentCSS(baseDir)

	funcMap := template.FuncMap{
		"dict": func(values ...interface{}) map[string]interface{} {
			d := make(map[string]interface{})
			for i := 0; i < len(values)-1; i += 2 {
				if key, ok := values[i].(string); ok {
					d[key] = values[i+1]
				}
			}
			return d
		},
		"componentCSS": func() template.HTML {
			return template.HTML("<style>\n" + componentCSS + "\n</style>")
		},
		"iconPath": func(icon string) string {
			if icon == "" {
				return "/static/icons/box.svg"
			}
			iconPath := filepath.Join(baseDir, "..", "static", "icons", icon+".svg")
			if _, err := os.Stat(iconPath); err == nil {
				return "/static/icons/" + icon + ".svg"
			}
			return "/static/icons/box.svg"
		},
	}

	componentsPattern := filepath.Join(baseDir, "components", "*", "*.html")
	templatesPattern := filepath.Join(baseDir, "*.html")

	t, err := template.New("").Funcs(funcMap).ParseGlob(componentsPattern)
	if err != nil {
		log.Printf("Warning: failed to parse components (%s): %v", componentsPattern, err)
		h.templates = template.New("").Funcs(funcMap)
		return
	}

	t, err = t.ParseGlob(templatesPattern)
	if err != nil {
		log.Printf("Warning: failed to parse templates (%s): %v", templatesPattern, err)
	}
	h.templates = t
}

func loadComponentCSS(baseDir string) string {
	matches, err := filepath.Glob(filepath.Join(baseDir, "components", "*", "*.css"))
	if err != nil {
		log.Printf("Warning: failed to glob component CSS: %v", err)
		return ""
	}

	sort.Strings(matches)

	var sb strings.Builder
	for _, path := range matches {
		data, err := os.ReadFile(path)
		if err != nil {
			log.Printf("Warning: failed to read %s: %v", path, err)
			continue
		}
		componentName := filepath.Base(filepath.Dir(path))
		sb.WriteString("/* ")
		sb.WriteString(componentName)
		sb.WriteString(" */\n")
		sb.Write(data)
		sb.WriteString("\n")
	}

	return sb.String()
}
