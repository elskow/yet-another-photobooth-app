interface UserPreferences {
	lastTemplate: string;
	lastPhotoCount: number;
	flashEnabled: boolean;
	brightnessCompensation: boolean;
	cameraFlipped: boolean;
}

const STORAGE_KEY = 'memento_preferences';

const defaultPreferences: UserPreferences = {
	lastTemplate: 'classic-polaroid',
	lastPhotoCount: 3,
	flashEnabled: false,
	brightnessCompensation: true,
	cameraFlipped: true
};

function isBrowser(): boolean {
	return typeof window !== 'undefined';
}

function loadPreferences(): UserPreferences {
	if (!isBrowser()) {
		return defaultPreferences;
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored);
		}
	} catch (error) {
		console.warn('Error loading preferences:', error);
	}

	return defaultPreferences;
}

function savePreferences(prefs: Partial<UserPreferences>) {
	if (!isBrowser()) {
		return;
	}

	try {
		const current = loadPreferences();
		const updated = { ...current, ...prefs };
		localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
	} catch (error) {
		console.warn('Error saving preferences:', error);
	}
}

export { loadPreferences, savePreferences, type UserPreferences };
