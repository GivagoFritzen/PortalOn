package locale

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type Locale struct {
	App struct {
		Name      string `json:"name"`
		PageTitle string `json:"pageTitle"`
	} `json:"app"`

	EmptyState struct {
		Headline     string `json:"headline"`
		Description  string `json:"description"`
		Button       string `json:"button"`
	} `json:"emptyState"`

	Modal struct {
		Title struct {
			Add  string `json:"add"`
			Edit string `json:"edit"`
		} `json:"title"`
		Button struct {
			Cancel   string `json:"cancel"`
			Save     string `json:"save"`
			Update   string `json:"update"`
			Saving   string `json:"saving"`
			Updating string `json:"updating"`
		} `json:"button"`
		Label struct {
			AppName string `json:"appName"`
			URL     string `json:"url"`
			Icon    string `json:"icon"`
		} `json:"label"`
		Placeholder struct {
			AppName     string `json:"appName"`
			URL         string `json:"url"`
			IconSearch  string `json:"iconSearch"`
		} `json:"placeholder"`
		Close string `json:"close"`
	} `json:"modal"`

	Search struct {
		Placeholder string `json:"placeholder"`
	} `json:"search"`

	Icon struct {
		Label           string `json:"label"`
		SearchPlaceholder string `json:"searchPlaceholder"`
		Loading         string `json:"loading"`
		Error           string `json:"error"`
		NoResults       string `json:"noResults"`
	} `json:"icon"`

	Toast struct {
		Close string `json:"close"`
		Success struct {
			Created    string `json:"created"`
			Updated    string `json:"updated"`
			Deleted    string `json:"deleted"`
			CreatedDesc string `json:"createdDesc"`
			UpdatedDesc string `json:"updatedDesc"`
			DeletedDesc string `json:"deletedDesc"`
		} `json:"success"`
		Error struct {
			Save       string `json:"save"`
			Delete     string `json:"delete"`
			Connection string `json:"connection"`
			Form       string `json:"form"`
			SaveDesc   string `json:"saveDesc"`
			Generic    string `json:"generic"`
		} `json:"error"`
	} `json:"toast"`

	Confirm struct {
		Title  string `json:"title"`
		DeleteApp string `json:"deleteApp"`
		Button struct {
			Cancel string `json:"cancel"`
			Delete string `json:"delete"`
		} `json:"button"`
	} `json:"confirm"`

	Validation struct {
		NameRequired string `json:"nameRequired"`
		URLRequired  string `json:"urlRequired"`
		URLInvalid   string `json:"urlInvalid"`
	} `json:"validation"`

	EditMode struct {
		Title string `json:"title"`
	} `json:"editMode"`

	TopAppBar struct {
		AddApp        string `json:"addApp"`
		ToggleTheme   string `json:"toggleTheme"`
		ToggleEditMode string `json:"toggleEditMode"`
	} `json:"topAppBar"`
}

func LoadLocale(localePath string) (*Locale, error) {
	candidates := []string{
		localePath,
		filepath.Join("..", localePath),
		filepath.Join("..", "..", localePath),
	}

	var data []byte
	var err error
	for _, path := range candidates {
		data, err = os.ReadFile(path)
		if err == nil {
			break
		}
	}
	if err != nil {
		return nil, err
	}

	var locale Locale
	if err := json.Unmarshal(data, &locale); err != nil {
		return nil, err
	}

	return &locale, nil
}

func MustLoadLocale(localePath string) *Locale {
	locale, err := LoadLocale(localePath)
	if err != nil {
		panic(err)
	}
	return locale
}