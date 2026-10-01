# Guidelines and Best Practices for AI Agents - PortalOn

Welcome to the **PortalOn** project. Please follow these guidelines, architecture rules, and coding standards when working on this codebase.

---

## 1. Project Overview & Tech Stack

PortalOn is a self-hosted application portal with an iOS/macOS Launchpad-style grid layout.

- **Backend:** Go (version 1.22+) using the native `net/http` package. No third-party router is used.
- **Frontend:** HTML templates with Tailwind CSS, HTMX, Sortable.js, and TypeScript (built with `esbuild`).
- **Database:** SQLite using `modernc.org/sqlite` (pure Go implementation, CGO is **disabled/avoided**).
- **Environment:** Containerized using Docker and Docker Compose.

---

## 2. Directory Structure

Maintain the clean division of responsibilities:

```
PortalOn/
├── main.go                    # Entry point (initializes DB, defines routes)
├── internal/
│   ├── database/              # SQLite connection initialization and migrations
│   ├── handlers/              # HTTP API and page handlers (interface with repository)
│   ├── models/                # Data models (structs mapping to DB)
│   └── repository/            # SQLite queries and data access logic
├── templates/
│   ├── components/            # Componentized UI blocks (HTML + CSS colocated)
│   │   ├── app_card/
│   │   │   ├── app_card.html
│   │   │   └── app_card.css
│   │   ├── search_bar/
│   │   │   ├── search_bar.html
│   │   │   └── search_bar.css
│   │   ├── top_app_bar/
│   │   │   ├── top_app_bar.html
│   │   │   └── top_app_bar.css
│   │   ├── modal/
│   │   │   └── modal.html
│   │   ├── icon_button/
│   │   │   ├── icon_button.html
│   │   │   └── icon_button.css
│   │   ├── form_field/
│   │   │   └── form_field.css
│   │   ├── status_dot/
│   │   │   └── status_dot.css
│   │   └── empty_state/
│   │       └── empty_state.html
│   └── index.html             # Main page template
├── static/
│   └── css/
│       ├── colors.css         # CSS variables (light + dark themes)
│       ├── base.css           # Body, text utilities, glassmorphism base
│       ├── utilities.css      # Layout, fonts, bg-primary
│       └── dark-mode.css      # Dark mode overrides (higher specificity)
├── src/                       # TypeScript source code (builds to static/js/app.js)
├── Dockerfile                 # Container blueprint
└── docker-compose.yml         # Dev/Prod container orchestration
```

---

## 3. Backend Guidelines (Go)

### 3.1 Routing
- Use Go 1.22+ enhanced `net/http` multiplexer pattern:
  - Formats: `METHOD /path` or `METHOD /path/{param}` (e.g., `GET /api/apps/{id}`).
  - Handle query/path parameters cleanly using `r.PathValue("id")`.

### 3.2 Database Access
- All DB operations must go through the `repository` package. Do not run direct database queries inside the `handlers` package.
- Always use prepared statements or parameter binding (`$1`, `?` or named arguments) to prevent SQL injection.
- Ensure connections and rows are properly closed with `defer rows.Close()` to prevent memory/connection leaks.
- Avoid introducing any dependency that requires CGO. Keep `modernc.org/sqlite` as the driver.

### 3.3 Error Handling
- Do not ignore errors. Always check them and return appropriate HTTP status codes (e.g., `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`) with helpful JSON or HTML messages.
- Log errors on the server side using the standard `log` package (or structured logging if introduced) before responding to the client.

---

## 4. Frontend Guidelines

### 4.1 HTML & HTMX
- HTML templates reside in the `templates/components/` directory.
- **Componentization:** Each UI component has its own subfolder containing both the HTML template and its CSS file (colocated). Components are organized as:
  ```
  templates/components/{component_name}/
  ├── {component_name}.html   # Go template ({{define "name"}}...{{end}})
  └── {component_name}.css    # Component-scoped styles
  ```
- Reference components using Go templates: `{{template "component_name" .}}`.
- Use HTMX (`hx-*` attributes) to perform AJAX requests and handle partial DOM updates gracefully.
- Return clean HTML snippets from the server when requested via HTMX, or JSON when building strict APIs.

### 4.2 CSS Architecture
- **Colocated CSS:** Each component's CSS lives alongside its HTML in `templates/components/{name}/{name}.css`.
- **Global CSS:** Shared styles live in `static/css/`:
  - `colors.css` — CSS variables for light/dark themes (`:root` and `.dark` scopes).
  - `base.css` — Body styles, text color utilities, glassmorphism base.
  - `utilities.css` — Layout, fonts, bg-primary, hover utilities.
  - `dark-mode.css` — Dark mode overrides with higher specificity (`.dark .class` selectors).
- **CSS Injection:** The Go handler (`handlers/apps.go`) scans `templates/components/*/*.css` at startup and injects them as a `<style>` block in the `<head>` via the `{{componentCSS}}` template function.
- **Dark Mode:** Use CSS variables (`var(--color-*)`) everywhere. Dark mode is achieved by toggling the `.dark` class on `<html>`, which redefines the variables. Do NOT use `!important`. Use `.dark .class` selectors for higher specificity when needed.
- **No Tailwind for component styles:** Write component CSS in plain CSS. Reserve Tailwind utility classes for layout and spacing in HTML templates.
- Respect the Glassmorphic design language: soft color gradients, squircle icons, backdrop-blur, and clean status indicators.

### 4.3 Adding a New Component
1. Create `templates/components/{name}/` directory.
2. Create `{name}.html` with `{{define "name"}}...{{end}}`.
3. Create `{name}.css` with component-scoped styles.
4. The handler automatically picks up the new CSS file on next startup.
5. Reference the component in other templates with `{{template "name" .}}`.

### 4.4 TypeScript & Bundling
- Write frontend logic in TypeScript within the `src/` directory.
- **Type Modularization:** Do not group unrelated types into a single `types.ts` file. Instead, organize types into dedicated files within the `src/types/` folder (e.g., `src/types/app.ts`, `src/types/sortable.ts`) and import them relatively.
- To compile TypeScript, run the build/watch scripts defined in `package.json`:
  - Build: `npm run build` (calls `esbuild` to bundle `src/app.ts` into `static/js/app.js`).
  - Watch: `npm run watch`.
- Do not edit `static/js/app.js` directly; always edit `src/*.ts` files and compile them.

---

## 5. Development & Verification Flow

Before completing tasks, perform these verification steps:

1. **Format Code:** Run `go fmt ./...` to ensure standard formatting.
2. **Build and Run:** Run `go run main.go` or `docker compose up --build` to verify changes compile and run properly.
3. **Verify API / UI:** Test both API endpoints and the front-end user experience (including drag-and-drop or modal interactions).
