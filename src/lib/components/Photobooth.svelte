<script lang="ts">
	import { loadPreferences, savePreferences } from '$lib/stores/preferences';
	import { templates, getTemplate } from '$lib/templates';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { getCameras, getVideoStream, type Camera } from '$lib/camera';
	import { fade, fly, slide } from 'svelte/transition';
	import {
		getFlashSupport,
		toggleFlash,
		enableScreenBrightness,
		disableScreenBrightness,
		type FlashSupport
	} from '$lib/camera-utils';

	import {
		Camera as CameraIcon,
		Settings,
		Download,
		ImagePlus,
		X,
		Check,
		FlipHorizontal,
		Sparkles,
		Sun,
		Loader2,
		RefreshCw,
		Info
	} from 'lucide-svelte';

	const preferences = loadPreferences();

	let htmlToImage: any;
	let videoElement: HTMLVideoElement;
	let canvasElement: HTMLCanvasElement;
	let cameras: Camera[] = [];
	let currentCamera: Camera | null = null;
	let stream: MediaStream | null = null;
	let capturedPhotos: string[] = [];
	let maxPhotos = preferences.lastPhotoCount;
	let isCameraFlipped = preferences.cameraFlipped;
	let photoOptions = [2, 3, 4, 6];
	let caption = '';
	let cameraLoading = true;
	let showCameraSelector = false;
	let showSettings = false;
	let downloadInProgress = false;
	let cameraError: string | null = null;
	let mainFocusRef: HTMLButtonElement;

	let keyboardShortcutsEnabled = true;
	let showKeyboardShortcuts = false;

	let aspectRatio = '16:9';

	let isCountingDown = false;
	let countdownValue = 3;
	let countdownInterval: number;

	const keyboardShortcuts = [
		{ key: 'Space', action: 'Take photo' },
		{ key: 'C', action: 'Switch camera' },
		{ key: 'F', action: 'Toggle flash' },
		{ key: 'R', action: 'Flip camera' },
		{ key: 'S', action: 'Open settings' },
		{ key: 'Esc', action: 'Close panels' },
		{ key: 'D', action: 'Download (when ready)' }
	];

	function handleKeydown(event: KeyboardEvent) {
		if (!keyboardShortcutsEnabled || event.ctrlKey || event.metaKey || event.altKey) return;

		if (browser && document.activeElement instanceof HTMLInputElement) return;

		switch (event.key.toLowerCase()) {
			case ' ':
				event.preventDefault();
				if (!isCountingDown && capturedPhotos.length < maxPhotos && stream) {
					startCountdown();
				}
				break;
			case 'c':
				if (cameras.length > 1) {
					showCameraSelector = !showCameraSelector;
					if (showSettings) showSettings = false;
				}
				break;
			case 'f':
				handleFlash();
				break;
			case 'r':
				toggleCameraFlip();
				break;
			case 's':
				showSettings = !showSettings;
				if (showCameraSelector) showCameraSelector = false;
				break;
			case 'escape':
				if (showCameraSelector) showCameraSelector = false;
				if (showSettings) showSettings = false;
				if (showKeyboardShortcuts) showKeyboardShortcuts = false;
				break;
			case 'd':
				if (capturedPhotos.length >= maxPhotos && !downloadInProgress) {
					downloadPolaroid();
				}
				break;
			case '?':
				showKeyboardShortcuts = !showKeyboardShortcuts;
				break;
		}
	}

	onMount(async () => {
		if (browser) {
			document.addEventListener('keydown', handleKeydown);
			cameras = await getCameras();
			if (cameras.length > 0) {
				const frontCamera = cameras.find((c) => c.facing === 'front');
				currentCamera = frontCamera || cameras[0];
				await startCamera();
			} else {
				cameraError =
					'No cameras found. Please ensure your browser has permission to access your camera.';
			}

			const { toPng } = await import('html-to-image');
			htmlToImage = { toPng };

			document.fonts.ready.then(() => {
				console.log('All fonts are loaded and ready!');
			});

			if (mainFocusRef) {
				setTimeout(() => mainFocusRef.focus(), 500);
			}
		}
	});

	onDestroy(() => {
		if (browser) {
			document.removeEventListener('keydown', handleKeydown);
			stopCamera();
			if (countdownInterval) clearInterval(countdownInterval);
		}
	});

	function parseAspectRatio(ratio: string): number {
		const [width, height] = ratio.split(':').map(Number);
		return width / height;
	}

	function stopCamera() {
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			stream = null;
		}

		if (videoElement) {
			videoElement.srcObject = null;
		}
	}

	async function refreshCameras() {
		cameraLoading = true;
		cameraError = null;

		try {
			cameras = await getCameras();
			if (cameras.length > 0) {
				const frontCamera = cameras.find((c) => c.facing === 'front');
				currentCamera = frontCamera || cameras[0];
				await startCamera();
			} else {
				cameraError =
					'No cameras found. Please ensure your browser has permission to access your camera.';
			}
		} catch (error) {
			console.error('Error refreshing cameras:', error);
			cameraError = 'Failed to access cameras. Please check your permissions and try again.';
		} finally {
			cameraLoading = false;
		}
	}

	async function startCountdown() {
		if (isCountingDown || capturedPhotos.length >= maxPhotos) return;

		isCountingDown = true;
		countdownValue = 3;

		announceToScreenReader('Countdown starting. 3...');

		countdownInterval = setInterval(() => {
			countdownValue--;

			if (countdownValue > 0) {
				announceToScreenReader(countdownValue.toString());
			}

			if (countdownValue <= 0) {
				clearInterval(countdownInterval);
				announceToScreenReader('Taking photo now');
				handlePhotoCapture();
				isCountingDown = false;
			}
		}, 1000);
	}

	function announceToScreenReader(message: string) {
		if (browser) {
			const announcement = document.getElementById('a11y-announcement');
			if (announcement) {
				announcement.textContent = message;
			}
		}
	}

	async function handlePhotoCapture() {
		if (flashSupport.hasFlash && flashSupport.flashMode === 'flash') {
			await toggleFlash(stream, 'flash');
			await new Promise((resolve) => setTimeout(resolve, 800));
			await capturePhoto();
			await toggleFlash(stream, 'off');
		} else if (!flashSupport.hasFlash && flashSupport.brightnessCompensation) {
			brightnessOverlay = await enableScreenBrightness();
			await new Promise((resolve) => setTimeout(resolve, 800));

			if (videoElement) {
				videoElement.classList.add('flash-active');
			}

			await capturePhoto();

			await new Promise((resolve) => setTimeout(resolve, 200));

			if (videoElement) {
				videoElement.classList.remove('flash-active');
			}

			if (brightnessOverlay) {
				await disableScreenBrightness(brightnessOverlay);
				brightnessOverlay = null;
			}
		} else {
			await capturePhoto();
		}

		announceToScreenReader(`Photo ${capturedPhotos.length} of ${maxPhotos} captured`);

		if (browser && capturedPhotos.length >= maxPhotos) {
			const downloadButton = document.getElementById('download-button');
			if (downloadButton) {
				setTimeout(() => downloadButton.focus(), 500);
			}
		}
	}

	let flashSupport: FlashSupport = {
		hasFlash: false,
		flashMode: 'off',
		brightnessCompensation: preferences.brightnessCompensation
	};
	let brightnessOverlay: HTMLElement | null = null;

	async function startCamera() {
		cameraLoading = true;
		cameraError = null;

		try {
			if (stream) {
				stopCamera();
			}

			if (currentCamera) {
				const aspectRatioValues = parseAspectRatio(aspectRatio);

				stream = await getVideoStream(currentCamera.deviceId, aspectRatioValues);
				if (stream && videoElement) {
					videoElement.srcObject = stream;
					await videoElement.play().catch((err) => {
						console.error('Error playing video:', err);
						cameraError = 'Failed to access camera. Please check your permissions.';
					});

					const support = await getFlashSupport(stream);
					flashSupport = {
						...support,
						flashMode: preferences.flashEnabled ? 'flash' : 'off',
						brightnessCompensation: support.hasFlash ? false : preferences.brightnessCompensation
					};

					announceToScreenReader('Camera ready');
				}
			} else {
				cameraError = 'No camera selected. Please select a camera.';
			}
		} catch (error) {
			console.error('Camera error:', error);
			cameraError = 'Failed to start camera. Please check your permissions and try again.';
		} finally {
			cameraLoading = false;
		}
	}

	async function handleFlash() {
		if (flashSupport.hasFlash) {
			const nextMode = flashSupport.flashMode === 'off' ? 'flash' : 'off';
			flashSupport = { ...flashSupport, flashMode: nextMode };

			savePreferences({ flashEnabled: nextMode === 'flash' });

			announceToScreenReader(`Flash ${nextMode === 'flash' ? 'enabled' : 'disabled'}`);
		} else {
			const newState = !flashSupport.brightnessCompensation;
			flashSupport = {
				...flashSupport,
				brightnessCompensation: newState
			};

			savePreferences({ brightnessCompensation: newState });

			announceToScreenReader(`Screen brightness compensation ${newState ? 'enabled' : 'disabled'}`);
		}
	}

	async function capturePhoto() {
		if (!videoElement || !canvasElement || capturedPhotos.length >= maxPhotos) return;

		const context = canvasElement.getContext('2d');
		if (!context) return;

		const [targetWidth, targetHeight] = selectedTemplate.aspectRatio.split(':').map(Number);
		const aspectRatio = targetWidth / targetHeight;

		const videoWidth = videoElement.videoWidth;
		const videoHeight = videoElement.videoHeight;
		const videoAspectRatio = videoWidth / videoHeight;

		let sourceX = 0;
		let sourceY = 0;
		let sourceWidth = videoWidth;
		let sourceHeight = videoHeight;

		if (videoAspectRatio > aspectRatio) {
			sourceWidth = videoHeight * aspectRatio;
			sourceX = (videoWidth - sourceWidth) / 2;
		} else if (videoAspectRatio < aspectRatio) {
			sourceHeight = videoWidth / aspectRatio;
			sourceY = (videoHeight - sourceHeight) / 2;
		}

		const outputWidth = Math.round(sourceWidth);
		const outputHeight = Math.round(sourceHeight);
		canvasElement.width = outputWidth;
		canvasElement.height = outputHeight;

		if (isCameraFlipped) {
			context.save();
			context.translate(canvasElement.width, 0);
			context.scale(-1, 1);
			context.drawImage(
				videoElement,
				sourceX,
				sourceY,
				sourceWidth,
				sourceHeight,
				0,
				0,
				outputWidth,
				outputHeight
			);
			context.restore();
		} else {
			context.drawImage(
				videoElement,
				sourceX,
				sourceY,
				sourceWidth,
				sourceHeight,
				0,
				0,
				outputWidth,
				outputHeight
			);
		}

		const photoDataUrl = canvasElement.toDataURL('image/jpeg');
		capturedPhotos = [...capturedPhotos, photoDataUrl];
	}

	function resetPhotos() {
		capturedPhotos = [];
		caption = '';
		announceToScreenReader('Photos cleared. Ready to take new photos.');
	}

	function setPhotoCount(count: number) {
		if (capturedPhotos.length > count) {
			capturedPhotos = capturedPhotos.slice(0, count);
		}
		maxPhotos = count;

		savePreferences({ lastPhotoCount: count });

		showSettings = false;
		announceToScreenReader(`Photo count set to ${count}`);
	}

	function toggleCameraFlip() {
		isCameraFlipped = !isCameraFlipped;
		savePreferences({ cameraFlipped: isCameraFlipped });
		announceToScreenReader(`Camera ${isCameraFlipped ? 'flipped' : 'unflipped'}`);
	}

	async function downloadPolaroid() {
		if (!htmlToImage || !browser) return;

		downloadInProgress = true;
		announceToScreenReader('Preparing download. Please wait...');

		const node = document.getElementById('photostrip-output');
		if (!node) {
			downloadInProgress = false;
			return;
		}

		try {
			const cloneContainer = document.createElement('div');
			cloneContainer.style.position = 'absolute';
			cloneContainer.style.left = '-9999px';
			cloneContainer.style.top = '-9999px';
			cloneContainer.style.width = `${node.offsetWidth}px`;
			cloneContainer.style.backgroundColor = 'white';
			cloneContainer.style.padding = '0';
			cloneContainer.style.margin = '0';

			const clone = node.cloneNode(true) as HTMLElement;

			clone.style.transform = 'none';
			clone.style.transition = 'none';
			clone.style.boxShadow = 'none';

			cloneContainer.appendChild(clone);
			document.body.appendChild(cloneContainer);

			await document.fonts.ready;

			const dataUrl = await htmlToImage.toPng(clone, {
				quality: 1.0,
				pixelRatio: 2,
				backgroundColor: 'white',
				skipAutoScale: true,
				width: node.offsetWidth,
				height: node.offsetHeight,
				style: {
					margin: 0,
					padding: 0,
					transform: 'none'
				},
				fetchRequestInit: {
					cache: 'force-cache'
				}
			});

			document.body.removeChild(cloneContainer);

			const filename = caption
				? `memento-${caption.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`
				: `memento-${new Date().toISOString().slice(0, 10)}.png`;

			const link = document.createElement('a');
			link.download = filename;
			link.href = dataUrl;
			link.click();

			announceToScreenReader('Download complete');
		} catch (error) {
			console.error('Error generating image:', error);
			alert('Could not generate image. Please try using a screenshot instead.');
			announceToScreenReader('Download failed. Please try using a screenshot instead.');
		} finally {
			downloadInProgress = false;
		}
	}

	$: aspectRatioClass =
		selectedTemplate.aspectRatio === '4:3'
			? 'aspect-[4/3]'
			: selectedTemplate.aspectRatio === '16:9'
				? 'aspect-[16/9]'
				: 'aspect-square';

	let fontStyle = 'handwriting';

	let selectedTemplate = getTemplate(preferences.lastTemplate);

	function selectTemplate(templateId: string) {
		selectedTemplate = getTemplate(templateId);

		maxPhotos = selectedTemplate.maxPhotos;
		aspectRatio = selectedTemplate.aspectRatio;
		fontStyle = selectedTemplate.defaultFontStyle || 'handwriting';

		if (capturedPhotos.length > selectedTemplate.maxPhotos) {
			capturedPhotos = capturedPhotos.slice(0, selectedTemplate.maxPhotos);
		}

		savePreferences({
			lastTemplate: templateId,
			lastPhotoCount: maxPhotos
		});

		startCamera();
		showSettings = false;
		announceToScreenReader(`Template changed to ${selectedTemplate.name}`);
	}

	function removePhoto(index: number) {
		capturedPhotos = capturedPhotos.filter((_, i) => i !== index);
		announceToScreenReader(
			`Photo ${index + 1} removed. ${capturedPhotos.length} of ${maxPhotos} photos remaining.`
		);
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="sr-only" role="status" aria-live="polite" id="a11y-announcement"></div>

<div class="container mx-auto max-w-6xl px-4">
	<div class="mb-8 text-center">
		<h1 class="flex items-center justify-center">
			<span class="text-4xl font-medium tracking-tight text-zinc-800 italic">Memento</span>
		</h1>
		<p class="mt-2 text-sm font-light text-zinc-500">Preserving moments, one frame at a time</p>

		{#if browser}
			<button
				aria-label="Show keyboard shortcuts"
				title="Show keyboard shortcuts"
				on:click={() => (showKeyboardShortcuts = !showKeyboardShortcuts)}
				class="absolute top-5 right-5 hidden h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none sm:flex"
			>
				<span class="text-sm font-medium">?</span>
			</button>
		{/if}
	</div>

	{#if showKeyboardShortcuts && browser}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
			transition:fade={{ duration: 200 }}
		>
			<div
				class="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="shortcuts-title"
			>
				<div class="mb-4 flex items-center justify-between">
					<h2 id="shortcuts-title" class="text-xl font-medium text-zinc-800">
						<span class="flex items-center gap-2">
							<span class="inline-block rounded bg-zinc-100 p-1">?</span>
							Keyboard Shortcuts
						</span>
					</h2>
					<button
						on:click={() => (showKeyboardShortcuts = false)}
						class="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
						aria-label="Close keyboard shortcuts"
					>
						<X class="h-5 w-5" />
					</button>
				</div>

				<p class="mb-4 text-sm text-zinc-500">
					Use these keyboard shortcuts to quickly control the app.
				</p>

				<div class="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200">
					<div class="bg-zinc-50 px-4 py-2">
						<h3 class="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
							Camera Controls
						</h3>
					</div>
					<div class="px-2 py-1">
						{#each keyboardShortcuts.filter( (s) => ['Take photo', 'Switch camera', 'Flip camera', 'Toggle flash'].includes(s.action) ) as shortcut}
							<div
								class="flex items-center justify-between rounded-md p-2 transition-colors hover:bg-zinc-50"
							>
								<span class="flex items-center gap-2 text-zinc-700">
									{#if shortcut.action === 'Take photo'}
										<CameraIcon class="h-4 w-4 text-zinc-500" />
									{:else if shortcut.action === 'Switch camera'}
										<RefreshCw class="h-4 w-4 text-zinc-500" />
									{:else if shortcut.action === 'Toggle flash'}
										<Sparkles class="h-4 w-4 text-zinc-500" />
									{:else if shortcut.action === 'Flip camera'}
										<FlipHorizontal class="h-4 w-4 text-zinc-500" />
									{/if}
									{shortcut.action}
								</span>
								<kbd
									class="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 shadow-sm"
								>
									{shortcut.key}
								</kbd>
							</div>
						{/each}
					</div>

					<div class="bg-zinc-50 px-4 py-2">
						<h3 class="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
							App Controls
						</h3>
					</div>
					<div class="px-2 py-1">
						{#each keyboardShortcuts.filter( (s) => ['Open settings', 'Close panels', 'Download (when ready)'].includes(s.action) ) as shortcut}
							<div
								class="flex items-center justify-between rounded-md p-2 transition-colors hover:bg-zinc-50"
							>
								<span class="flex items-center gap-2 text-zinc-700">
									{#if shortcut.action === 'Open settings'}
										<Settings class="h-4 w-4 text-zinc-500" />
									{:else if shortcut.action === 'Close panels'}
										<X class="h-4 w-4 text-zinc-500" />
									{:else if shortcut.action === 'Download (when ready)'}
										<Download class="h-4 w-4 text-zinc-500" />
									{/if}
									{shortcut.action}
								</span>
								<kbd
									class="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 shadow-sm"
								>
									{shortcut.key}
								</kbd>
							</div>
						{/each}
					</div>
				</div>

				<div class="mt-6 flex items-center justify-between">
					<span class="text-xs text-zinc-500">
						Press <kbd
							class="rounded border border-zinc-300 bg-zinc-100 px-1 py-0.5 text-xs font-medium"
							>?</kbd
						> anytime to show/hide shortcuts
					</span>
					<button
						on:click={() => {
							keyboardShortcutsEnabled = !keyboardShortcutsEnabled;
							announceToScreenReader(
								`Keyboard shortcuts ${keyboardShortcutsEnabled ? 'enabled' : 'disabled'}`
							);
						}}
						class="text-sm font-medium text-slate-500 focus-visible:underline focus-visible:outline-none"
					>
						<span class="flex items-center gap-1">
							<span class="relative flex items-center">
								<div
									class={`h-4 w-8 rounded-full transition ${keyboardShortcutsEnabled ? 'bg-blue-500' : 'bg-zinc-300'}`}
								></div>
								<div
									class={`absolute h-3 w-3 transform rounded-full bg-white transition-transform ${keyboardShortcutsEnabled ? 'translate-x-4' : 'translate-x-1'}`}
								></div>
							</span>
							{keyboardShortcutsEnabled ? 'Enabled' : 'Disabled'}
						</span>
					</button>
				</div>
			</div>
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<div class="h-full">
			<div class="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-zinc-200">
				<div class="relative bg-zinc-900 {aspectRatioClass}" id="camera-container">
					{#if cameraError}
						<div class="absolute inset-0 flex flex-col items-center justify-center p-4 text-white">
							<div class="mb-4 rounded-full bg-red-500/20 p-4">
								<Info class="h-6 w-6 text-red-300" />
							</div>
							<p class="mb-3 text-center text-lg text-white/90">{cameraError}</p>
							<button
								on:click={refreshCameras}
								class="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm backdrop-blur-sm hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
								aria-label="Try again"
							>
								<RefreshCw class="h-4 w-4" />
								Try again
							</button>
						</div>
					{/if}

					{#if cameraLoading}
						<div class="absolute inset-0 flex items-center justify-center text-white/70">
							<div role="status" aria-live="polite">
								<Loader2 class="h-10 w-10 animate-spin" />
								<span class="sr-only">Loading camera...</span>
							</div>
						</div>
					{/if}

					<video
						bind:this={videoElement}
						autoplay
						playsinline
						class="h-full w-full object-cover {isCameraFlipped ? 'scale-x-[-1]' : ''}"
						aria-label="Camera preview"
					>
						<track kind="captions" src="" label="Camera preview" default />
					</video>

					<canvas bind:this={canvasElement} class="hidden h-full w-full object-cover"></canvas>

					{#if isCountingDown}
						<div
							class="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm"
							transition:fade={{ duration: 200 }}
							role="status"
							aria-live="assertive"
						>
							<span
								class="text-7xl font-light text-white drop-shadow-lg"
								transition:fly={{ y: 20, duration: 300 }}
							>
								{countdownValue}
							</span>
						</div>
					{/if}

					<div class="absolute right-0 bottom-4 left-0 flex justify-center">
						<div class="flex gap-1.5 rounded-full bg-black/30 px-3 py-2 backdrop-blur-sm">
							{#each Array(maxPhotos) as _, i}
								<div
									class="h-2 w-2 rounded-full {i < capturedPhotos.length
										? 'bg-white'
										: 'bg-white/30'}"
									aria-label={i < capturedPhotos.length ? 'Photo taken' : 'Photo slot empty'}
								></div>
							{/each}
						</div>
					</div>
				</div>

				<div class="relative border-t border-zinc-100 px-5 py-4">
					<div class="flex flex-col gap-5">
						<div class="relative flex items-center justify-center">
							<div class="absolute left-0 z-10">
								<span
									class="text-sm font-medium text-zinc-700 {capturedPhotos.length >= maxPhotos
										? 'text-green-600'
										: ''}"
									aria-live="polite"
								>
									{capturedPhotos.length}/{maxPhotos}
								</span>
							</div>

							<div class="flex justify-center">
								<button
									bind:this={mainFocusRef}
									on:click={startCountdown}
									class="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-md transition-transform hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
									disabled={isCountingDown ||
										!stream ||
										capturedPhotos.length >= maxPhotos ||
										!!cameraError}
									aria-label="Take photo"
								>
									<CameraIcon class="h-6 w-6" />
									<span class="sr-only">
										Take photo {capturedPhotos.length + 1} of {maxPhotos}
									</span>
								</button>
							</div>

							<div class="absolute right-0 w-[42px]"></div>
						</div>

						<div class="flex justify-center gap-3">
							<button
								on:click={() => (showCameraSelector = !showCameraSelector)}
								class="relative flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2.5 text-sm text-zinc-700 transition-all hover:bg-zinc-200 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none {cameras.length <=
								1
									? 'cursor-not-allowed opacity-50'
									: ''}"
								disabled={cameras.length <= 1}
								title="Switch camera"
								aria-label="Switch camera"
								aria-expanded={showCameraSelector}
								aria-controls="camera-selector"
							>
								<CameraIcon class="h-5 w-5" />
								{#if showCameraSelector}
									<span class="absolute right-0.5 bottom-0.5 h-2 w-2 rounded-full bg-blue-500"
									></span>
								{/if}
								<span class="sr-only">Switch camera (press C)</span>
							</button>

							<button
								on:click={() => (showSettings = !showSettings)}
								class="relative flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2.5 text-sm text-zinc-700 transition-all hover:bg-zinc-200 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
								title="Settings"
								aria-label="Settings"
								aria-expanded={showSettings}
								aria-controls="settings-panel"
							>
								<Settings class="h-5 w-5" />
								{#if showSettings}
									<span class="absolute right-0.5 bottom-0.5 h-2 w-2 rounded-full bg-blue-500"
									></span>
								{/if}
								<span class="sr-only">Settings (press S)</span>
							</button>

							<button
								on:click={handleFlash}
								class="relative flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2.5 text-sm text-zinc-700 transition-all hover:bg-zinc-200 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none {(flashSupport.hasFlash &&
									flashSupport.flashMode === 'flash') ||
								(!flashSupport.hasFlash && flashSupport.brightnessCompensation)
									? 'bg-blue-50 text-blue-600'
									: ''}"
								title={flashSupport.hasFlash ? 'Flash' : 'Screen brightness'}
								aria-label={flashSupport.hasFlash ? 'Toggle flash' : 'Toggle screen brightness'}
								aria-pressed={(flashSupport.hasFlash && flashSupport.flashMode === 'flash') ||
									(!flashSupport.hasFlash && flashSupport.brightnessCompensation)}
							>
								{#if flashSupport.hasFlash}
									<Sparkles class="h-5 w-5" />
								{:else}
									<Sun class="h-5 w-5" />
								{/if}
								<span class="text-xs">
									{#if flashSupport.hasFlash}
										{flashSupport.flashMode === 'flash' ? 'On' : 'Off'}
									{:else}
										{flashSupport.brightnessCompensation ? 'On' : 'Off'}
									{/if}
								</span>
								<span class="sr-only">(press F)</span>
							</button>

							<button
								on:click={toggleCameraFlip}
								class="relative flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2.5 text-sm text-zinc-700 transition-all hover:bg-zinc-200 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none {isCameraFlipped
									? 'bg-blue-50 text-blue-600'
									: ''}"
								title="Flip camera"
								aria-label="Flip camera horizontally"
								aria-pressed={isCameraFlipped}
							>
								<FlipHorizontal class="h-5 w-5" />
								<span class="text-xs">Flip</span>
								<span class="sr-only">(press R)</span>
							</button>
						</div>
					</div>
				</div>

				{#if showCameraSelector}
					<div
						id="camera-selector"
						class="border-t border-zinc-100 p-4"
						transition:slide={{ duration: 200 }}
					>
						<p class="mb-3 text-sm text-zinc-500" id="camera-selector-heading">Available cameras</p>
						<div
							class="flex flex-col gap-2"
							role="listbox"
							aria-labelledby="camera-selector-heading"
						>
							{#each cameras as camera, i}
								<button
									on:click={() => {
										currentCamera = camera;
										showCameraSelector = false;
										startCamera();
									}}
									class="flex items-center rounded-lg p-2 text-left transition-colors hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none {currentCamera?.deviceId ===
									camera.deviceId
										? 'bg-zinc-100'
										: ''}"
									role="option"
									aria-selected={currentCamera?.deviceId === camera.deviceId}
								>
									<span
										class="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100"
									>
										<CameraIcon class="h-4 w-4 text-zinc-600" />
									</span>
									<span class="flex-1 text-sm">
										{camera.label || 'Camera'}
										{#if camera.facing !== 'unknown'}
											<span class="ml-1 text-xs text-zinc-400">({camera.facing})</span>
										{/if}
									</span>
									{#if currentCamera?.deviceId === camera.deviceId}
										<span class="text-blue-500" aria-hidden="true">
											<Check class="h-5 w-5" />
										</span>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				{#if showSettings}
					<div
						id="settings-panel"
						class="border-t border-zinc-100 p-4"
						transition:slide={{ duration: 200 }}
					>
						<div class="mb-6">
							<p class="mb-3 text-sm text-zinc-500" id="template-style-heading">Template Style</p>
							<div
								class="grid grid-cols-2 gap-2"
								role="radiogroup"
								aria-labelledby="template-style-heading"
							>
								{#each templates as template}
									<button
										on:click={() => selectTemplate(template.id)}
										class="flex flex-col items-center rounded-lg border p-3 text-left transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none
										{selectedTemplate.id === template.id
											? 'border-blue-500 bg-blue-50'
											: 'border-zinc-200 hover:bg-zinc-50'}"
										role="radio"
										aria-checked={selectedTemplate.id === template.id}
									>
										<span class="text-sm font-medium">{template.name}</span>
										<span class="mt-1 text-xs text-zinc-500">{template.description}</span>
									</button>
								{/each}
							</div>
						</div>

						{#if selectedTemplate.maxPhotos > 1}
							<div class="mb-6">
								<p class="mb-3 text-sm text-zinc-500" id="photo-count-heading">Number of photos</p>
								<div
									id="photo-count"
									role="radiogroup"
									aria-labelledby="photo-count-heading"
									class="mt-2 flex gap-2"
								>
									{#each photoOptions.filter((n) => n <= selectedTemplate.maxPhotos) as option}
										<button
											on:click={() => setPhotoCount(option)}
											class="flex h-10 w-10 items-center justify-center rounded-lg border focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none
											{maxPhotos === option
												? 'border-blue-500 bg-blue-50 text-blue-600'
												: 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'}"
											role="radio"
											aria-checked={maxPhotos === option}
											aria-label="{option} photos"
										>
											{option}
										</button>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			{#if capturedPhotos.length > 0}
				<div class="mt-4 overflow-hidden rounded-xl bg-white p-4 shadow-sm">
					<div class="mb-2 flex items-center justify-between">
						<h3 class="text-sm font-medium text-zinc-700" id="captured-photos-heading">
							Captured Photos
						</h3>
						<button
							on:click={resetPhotos}
							class="text-xs text-zinc-500 hover:text-zinc-700 focus-visible:rounded focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
							title="Clear all photos"
							aria-label="Clear all photos"
						>
							Clear all
						</button>
					</div>

					<div class="grid grid-cols-4 gap-2" role="list" aria-labelledby="captured-photos-heading">
						{#each capturedPhotos as photo, i}
							<div class="relative aspect-square" role="listitem">
								<img
									src={photo}
									alt="Captured photo {i + 1}"
									class="h-full w-full rounded object-cover"
								/>
								<button
									on:click={() => removePhoto(i)}
									class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-xs text-white hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:outline-none"
									aria-label="Remove photo {i + 1}"
								>
									<X class="h-3 w-3" aria-hidden="true" />
								</button>
							</div>
						{/each}

						{#each Array(Math.max(0, maxPhotos - capturedPhotos.length)) as _, i}
							<div
								class="flex aspect-square items-center justify-center rounded bg-zinc-100 text-zinc-300"
								role="presentation"
								aria-hidden="true"
							>
								<ImagePlus class="h-6 w-6" />
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<div class="h-full">
			<div class="rounded-2xl bg-white p-6 shadow-sm">
				<h2 class="mb-6 text-center text-lg font-light text-zinc-700">
					{#if capturedPhotos.length < maxPhotos}
						Take {maxPhotos - capturedPhotos.length} more {maxPhotos - capturedPhotos.length === 1
							? 'photo'
							: 'photos'} <br />to complete your photo strip
					{:else}
						Your Photo Strip is Ready
					{/if}
				</h2>

				<div
					id="photostrip-output"
					class="photostrip-container mx-auto max-w-md"
					role="img"
					aria-label="Photo strip preview"
				>
					<div class={selectedTemplate.styles.container}>
						<div class={selectedTemplate.styles.photoContainer}>
							{#if capturedPhotos.length > 0}
								{#each capturedPhotos as photo, i}
									<div
										class={selectedTemplate.styles.photo}
										data-frame={selectedTemplate.id === 'film-strip' ? `${i + 1}` : ''}
									>
										<img src={photo} alt="Photo {i + 1}" class="h-full w-full object-cover" />
									</div>
								{/each}

								{#each Array(Math.max(0, maxPhotos - capturedPhotos.length)) as _, i}
									<div class={selectedTemplate.styles.placeholder} aria-hidden="true">
										<div class="flex h-full items-center justify-center text-zinc-300">
											<ImagePlus class="h-8 w-8" />
										</div>
									</div>
								{/each}
							{:else}
								{#each Array(maxPhotos) as _, i}
									<div class={selectedTemplate.styles.placeholder} aria-hidden="true">
										<div class="flex h-full items-center justify-center text-zinc-300">
											<ImagePlus class="h-8 w-8" />
										</div>
									</div>
								{/each}
							{/if}

							<div class="mt-6 border-t border-zinc-100 pt-5">
								<p class={selectedTemplate.styles.caption}>
									{caption || 'Your story here...'}
								</p>
								<p class={selectedTemplate.styles.dateStamp}>
									{new Date().toLocaleDateString('en-US', {
										month: 'short',
										day: 'numeric',
										year: 'numeric'
									})}
								</p>
							</div>
						</div>
					</div>
				</div>

				<div class="mt-8">
					{#if capturedPhotos.length > 0}
						<div class="mb-6">
							<label for="caption" class="block text-sm font-medium text-zinc-500">Caption</label>
							<input
								type="text"
								id="caption"
								bind:value={caption}
								placeholder="What's the story behind these moments?"
								class="mt-1.5 w-full rounded-lg border border-zinc-200 px-4 py-3.5 font-sans text-base shadow-sm transition-all focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none"
								maxlength="60"
								aria-describedby="caption-counter"
							/>
							<p class="mt-1 text-right text-xs text-zinc-400" id="caption-counter">
								{caption.length}/60 characters
							</p>
						</div>
					{:else}
						<div class="mb-6 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4">
							<p class="text-center text-sm text-zinc-500">
								Take at least one photo to add a caption to your memento
							</p>
						</div>
					{/if}

					<button
						id="download-button"
						on:click={downloadPolaroid}
						class="flex w-full items-center justify-center gap-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3.5 text-base font-medium text-white shadow-sm transition-all hover:from-blue-600 hover:to-blue-700 hover:shadow focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
						disabled={capturedPhotos.length < maxPhotos || downloadInProgress}
						aria-busy={downloadInProgress}
						aria-live="polite"
					>
						{#if downloadInProgress}
							<Loader2 class="h-5 w-5 animate-spin" aria-hidden="true" />
							Processing...
							<span class="sr-only">Creating your image, please wait</span>
						{:else}
							<Download class="h-5 w-5" aria-hidden="true" />
							Download Your Memento
							<span class="sr-only">(press D)</span>
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
</div>

<style lang="postcss">
	:global(.download-mode) {
		background: white !important;
		color: black !important;
	}

	:global(.download-mode *) {
		background-image: none !important;
	}

	:global(.rendering) {
		transform-origin: top left;
		filter: none !important;
	}

	:global(.rendering *) {
		transition: none !important;
		animation: none !important;
	}

	:global(.font-caveat) {
		font-family: 'Caveat', cursive;
		font-size: 1.35em;
		line-height: 1.2;
		letter-spacing: 0.01em;
	}

	:global(.font-kalam) {
		font-family: 'Kalam', cursive;
		font-size: 1.15em;
		line-height: 1.3;
	}

	:global(.font-outfit) {
		font-family: 'Outfit', sans-serif;
		line-height: 1.5;
	}

	:global(.font-playfair) {
		font-family: 'Playfair Display', serif;
		line-height: 1.4;
		letter-spacing: 0.01em;
	}

	:global(.photostrip-container) {
		display: flex;
		justify-content: center;
		width: 100%;
		box-sizing: border-box;
		min-height: 200px;
	}

	:global(#photostrip-output) {
		width: 100%;
		height: 100%;
	}

	:global(#photostrip-output img),
	:global(#photostrip-output .placeholder) {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	:global(#photostrip-output *) {
		position: relative;
	}

	:global(.sepia) {
		filter: sepia(0.3);
	}

	:global(.vintage) {
		position: relative;
	}

	:global(.vintage::before) {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: radial-gradient(circle at center, transparent 65%, rgba(0, 0, 0, 0.2) 100%);
		pointer-events: none;
	}

	:global(.instant-photo) {
		transform: rotate(-2deg);
		transition: transform 0.3s ease;
	}

	:global(.instant-photo:hover) {
		transform: rotate(0deg);
	}

	:global(.handwritten) {
		font-family: 'Caveat', cursive;
	}

	:global(.film-holes) {
		background-image: repeating-linear-gradient(transparent, transparent 4px, white 4px, white 8px);
	}

	:global(.font-dancing) {
		font-family: 'Dancing Script', cursive;
		font-size: 1.4em;
		line-height: 1.3;
	}

	:global(.cute-shadow) {
		box-shadow: 0 4px 14px -2px rgba(252, 231, 243, 0.7);
	}

	:global(.sparkle) {
		position: relative;
	}

	:global(.sparkle::before),
	:global(.sparkle::after) {
		content: '✨';
		position: absolute;
		color: #f9a8d4;
		opacity: 0.8;
	}

	:global(.hearts) {
		position: relative;
	}

	:global(.hearts::before),
	:global(.hearts::after) {
		content: '♡';
		position: absolute;
		color: #f9a8d4;
		opacity: 0.8;
	}

	:global(#brightness-overlay) {
		background: radial-gradient(
			circle at center,
			white 0%,
			rgba(255, 255, 255, 0.98) 50%,
			rgba(255, 255, 255, 0.95) 100%
		);
		backdrop-filter: brightness(2) contrast(1.2) saturate(1.2);
		-webkit-backdrop-filter: brightness(2) contrast(1.2) saturate(1.2);
	}

	:global(.flash-active) {
		animation: flash 0.8s ease-out;
	}

	@keyframes flash {
		0% {
			filter: brightness(1) contrast(1);
		}
		25% {
			filter: brightness(2) contrast(0.8);
		}
		50% {
			filter: brightness(2.5) contrast(0.7);
		}
		75% {
			filter: brightness(2) contrast(0.8);
		}
		100% {
			filter: brightness(1) contrast(1);
		}
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	:global(:focus-visible) {
		outline: 2px solid rgb(59, 130, 246);
		outline-offset: 2px;
	}
</style>
