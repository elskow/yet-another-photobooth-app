declare global {
	interface MediaTrackCapabilities {
		torch?: boolean;
	}

	interface MediaTrackSettings {
		torch?: boolean;
	}

	interface MediaTrackConstraintSet {
		torch?: boolean;
	}
}

export interface FlashSupport {
	hasFlash: boolean;
	flashMode: 'auto' | 'off' | 'flash';
	brightnessCompensation: boolean;
}

export async function getFlashSupport(stream: MediaStream | null): Promise<FlashSupport> {
	const defaultSupport: FlashSupport = {
		hasFlash: false,
		flashMode: 'off',
		brightnessCompensation: false
	};

	if (!stream) return defaultSupport;

	const track = stream.getVideoTracks()[0];
	if (!track) return defaultSupport;

	try {
		const capabilities = track.getCapabilities();
		const settings = track.getSettings();

		if (capabilities.torch) {
			return {
				hasFlash: true,
				flashMode: settings.torch ? 'flash' : 'off',
				brightnessCompensation: false
			};
		}
	} catch (error) {
		console.warn('Error checking flash capabilities:', error);
	}

	return defaultSupport;
}

export async function toggleFlash(
	stream: MediaStream | null,
	mode: 'auto' | 'off' | 'flash'
): Promise<boolean> {
	if (!stream) return false;

	const track = stream.getVideoTracks()[0];
	if (!track) return false;

	try {
		const capabilities = track.getCapabilities();
		if (!capabilities.torch) return false;

		await track.applyConstraints({
			advanced: [{ torch: mode === 'flash' }]
		});
		return true;
	} catch (error) {
		console.error('Error toggling flash:', error);
		return false;
	}
}

export async function maximizeDeviceBrightness() {
	try {
		if ('brightness' in screen) {
			const screenAny = screen as any;
			await screenAny.brightness.lock();
			screenAny.brightness.value = 1;
		}

		if ('wakeLock' in navigator) {
			await (navigator as any).wakeLock.request('screen');
		}

		return true;
	} catch (error) {
		console.warn('Could not maximize device brightness:', error);
		return false;
	}
}

export async function resetDeviceBrightness() {
	try {
		if ('brightness' in screen) {
			const screenAny = screen as any;
			screenAny.brightness.unlock();
		}
	} catch (error) {
		console.warn('Could not reset device brightness:', error);
	}
}

export async function enableScreenBrightness() {
	await maximizeDeviceBrightness();

	const overlay = document.createElement('div');
	overlay.id = 'brightness-overlay';
	overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: white;
    opacity: 0;
    pointer-events: none;
    z-index: 9999;
    transition: opacity 0.2s ease;
    box-shadow: 0 0 150px 150px white;
    backdrop-filter: brightness(2) contrast(1.2);
    -webkit-backdrop-filter: brightness(2) contrast(1.2);
  `;
	document.body.appendChild(overlay);

	requestAnimationFrame(() => {
		overlay.style.opacity = '0.95';
	});

	return overlay;
}

export async function disableScreenBrightness(overlay: HTMLElement) {
	overlay.style.opacity = '0';
	setTimeout(() => {
		overlay.remove();
	}, 200);

	await resetDeviceBrightness();
}
