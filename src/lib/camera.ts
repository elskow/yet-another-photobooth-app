export interface Camera {
	deviceId: string;
	label: string;
	facing: 'front' | 'back' | 'unknown';
}

export async function getCameras(): Promise<Camera[]> {
	try {
		// Check if mediaDevices is available (browser support)
		if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
			console.warn('MediaDevices API not supported in this browser');
			return [];
		}

		// Request permission first
		await navigator.mediaDevices.getUserMedia({ video: true });

		const devices = await navigator.mediaDevices.enumerateDevices();
		const cameras = devices
			.filter((device) => device.kind === 'videoinput')
			.map((device) => {
				// Try to determine camera facing mode from label
				const label = device.label || '';
				let facing: 'front' | 'back' | 'unknown' = 'unknown';

				if (label.toLowerCase().includes('front')) {
					facing = 'front';
				} else if (
					label.toLowerCase().includes('back') ||
					label.toLowerCase().includes('rear') ||
					label.toLowerCase().includes('environment')
				) {
					facing = 'back';
				}

				return {
					deviceId: device.deviceId,
					label: label || `Camera (${facing !== 'unknown' ? facing : 'unknown'})`,
					facing
				};
			});

		return cameras;
	} catch (error) {
		console.error('Error getting cameras:', error);
		return [];
	}
}

export async function getVideoStream(
	deviceId?: string,
	aspectRatio?: number
): Promise<MediaStream | null> {
	try {
		// Build video constraints
		let videoConstraints: MediaTrackConstraints = {};

		// Add device ID if provided
		if (deviceId) {
			videoConstraints.deviceId = { exact: deviceId };
		} else {
			videoConstraints.facingMode = { ideal: 'user' }; // Prefer front camera by default
		}

		// Add aspect ratio if provided
		if (aspectRatio) {
			videoConstraints.aspectRatio = { ideal: aspectRatio };
		}

		const constraints: MediaStreamConstraints = {
			video: videoConstraints
		};

		return await navigator.mediaDevices.getUserMedia(constraints);
	} catch (error) {
		console.error('Error getting video stream:', error);
		return null;
	}
}
