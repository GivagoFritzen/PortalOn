package repository

const (
	selectAllAppsQuery = `
		SELECT
			a.id,
			a.name,
			a.url,
			a.icon,
			a.gradient,
			a.position,
			COALESCE(s.is_online, 0),
			a.created_at,
			a.updated_at
		FROM apps a
		LEFT JOIN app_status s ON a.id = s.app_id
		ORDER BY
			a.position ASC,
			a.name ASC
	`

	searchAppsQuery = `
		SELECT
			a.id,
			a.name,
			a.url,
			a.icon,
			a.gradient,
			a.position,
			COALESCE(s.is_online, 0),
			a.created_at,
			a.updated_at
		FROM apps a
		LEFT JOIN app_status s ON a.id = s.app_id
		WHERE a.name LIKE ?
		ORDER BY
			a.position ASC,
			a.name ASC
	`

	selectAppByIDQuery = `
		SELECT
			a.id,
			a.name,
			a.url,
			a.icon,
			a.gradient,
			a.position,
			COALESCE(s.is_online, 0),
			a.created_at,
			a.updated_at
		FROM apps a
		LEFT JOIN app_status s ON a.id = s.app_id
		WHERE a.id = ?
	`

	insertAppQuery = `
		INSERT INTO apps (
			name,
			url,
			icon,
			gradient,
			position
		) VALUES (?, ?, ?, ?, ?)
	`

	insertAppStatusQuery = `
		INSERT INTO app_status (
			app_id,
			is_online
		) VALUES (?, 0)
	`

	updateAppQuery = `
		UPDATE apps
		SET
			name = ?,
			url = ?,
			icon = ?,
			gradient = ?,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`

	deleteAppQuery = `
		DELETE FROM apps
		WHERE id = ?
	`

	updateAppPositionQuery = `
		UPDATE apps
		SET
			position = ?,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`

	updateAppStatusQuery = `
		INSERT INTO app_status (
			app_id,
			is_online,
			last_checked
		)
		VALUES (?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(app_id) DO UPDATE SET
			is_online = excluded.is_online,
			last_checked = CURRENT_TIMESTAMP
	`
)
