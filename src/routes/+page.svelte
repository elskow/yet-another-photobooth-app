<script lang="ts">
	import Photobooth from '$lib/components/Photobooth.svelte';
</script>

<svelte:head>
	<title>Memento | Create Beautiful Photo Memories</title>
	<meta
		name="description"
		content="Capture and create beautiful photo memories with Memento's elegant digital photo booth. Take multiple photos, apply stylish templates, and download your memories instantly."
	/>

	<!-- SEO Meta Tags -->
	<meta
		name="keywords"
		content="photo booth, digital memories, photo strip, polaroid, photo collage, camera app"
	/>
	<meta name="author" content="Memento" />

	<!-- Canonical URL -->
	<link rel="canonical" href="https://memento-booth.app" />

	<!-- Social Media Meta Tags Without Images -->
	<meta property="og:title" content="Memento | Digital Photo Booth 📸" />
	<meta
		property="og:description"
		content="Capture beautiful photo memories with filters, templates and instant downloads. No account needed!"
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://memento-booth.app" />

	<!-- Twitter Card data -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="Memento | Digital Photo Booth 📸" />
	<meta
		name="twitter:description"
		content="Create beautiful photo memories instantly with your device's camera. Multiple templates available!"
	/>

	<!-- App capable meta -->
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta name="apple-mobile-web-app-title" content="Memento 📸" />

	<!-- Theme color for browsers that support it -->
	<meta name="theme-color" content="#f8fafc" />
</svelte:head>

<div
	class="min-h-screen bg-zinc-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] px-4 py-8"
>
	<Photobooth />

	<footer class="mt-16 mb-6 text-center">
		<div class="mx-auto max-w-md rounded-full bg-white px-6 py-3 shadow-sm ring-1 ring-zinc-100">
			<p class="flex items-center justify-center gap-1">
				<span class="font-medium italic">Memento</span>
				<span class="mx-2 text-zinc-300">·</span>
				<span class="text-zinc-500">Moments that last</span>
			</p>
		</div>
		<p class="mt-4 text-xs text-zinc-400">
			Create beautiful photo memories using your device's cameras
		</p>
	</footer>
</div>
