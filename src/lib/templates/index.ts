import type { PhotoboothTemplate } from '../types/template';

export const templates: PhotoboothTemplate[] = [
	{
		id: 'classic-polaroid',
		name: 'Classic Polaroid',
		description: 'Traditional polaroid style with white borders',
		maxPhotos: 3,
		aspectRatio: '16:9',
		layout: 'polaroid',
		styles: {
			container: 'bg-white p-6 shadow-lg',
			photoContainer: 'flex flex-col gap-4',
			photo: 'aspect-[16/9] rounded-sm shadow-sm ring-1 ring-zinc-100',
			placeholder: 'aspect-[16/9] rounded-sm bg-zinc-50 ring-1 ring-zinc-200',
			caption: 'font-caveat text-center text-lg text-zinc-600 mt-4',
			dateStamp: 'mt-2 text-xs font-light text-zinc-400 italic text-center'
		},
		defaultFontStyle: 'handwriting'
	},
	{
		id: 'modern-strip',
		name: 'Modern Strip',
		description: 'Vertical photo strip with minimal borders',
		maxPhotos: 4,
		aspectRatio: '16:9',
		layout: 'strip',
		styles: {
			container: 'bg-black p-3',
			photoContainer: 'flex flex-col gap-2 relative',
			photo: 'aspect-[16/9] rounded-none',
			placeholder: 'aspect-[16/9] bg-zinc-800/50',
			caption: 'font-outfit text-center text-base text-white/90 tracking-wide mt-4 px-2',
			dateStamp:
				'absolute top-2 right-2 text-[10px] font-light text-white/50 tracking-wider rotate-90 origin-right'
		},
		defaultFontStyle: 'minimal'
	},
	{
		id: 'vintage-instant',
		name: 'Vintage Instant',
		description: 'Retro instant photo look with aged effects',
		maxPhotos: 1,
		aspectRatio: '16:9',
		layout: 'instant',
		styles: {
			container: 'bg-[#f4ede4] p-8 shadow-lg',
			photoContainer: 'relative',
			photo: 'aspect-[16/9] rounded-sm shadow-md sepia brightness-95',
			placeholder: 'aspect-[16/9] rounded-sm bg-[#e8e0d5] ring-1 ring-[#d8cfc4]',
			caption: 'font-playfair text-center text-lg text-zinc-800 italic mt-6',
			dateStamp: 'mt-2 text-xs font-serif text-zinc-600/70 text-center'
		},
		defaultFontStyle: 'elegant'
	},
	{
		id: 'grid-collage',
		name: 'Grid Collage',
		description: 'Modern grid layout for multiple photos',
		maxPhotos: 4,
		aspectRatio: '16:9',
		layout: 'grid',
		styles: {
			container: 'bg-white p-4 relative',
			photoContainer: 'grid grid-cols-2 gap-2',
			photo: 'aspect-[16/9] rounded-lg shadow-sm transition-shadow',
			placeholder: 'aspect-[16/9] rounded-lg bg-zinc-50 ring-1 ring-zinc-100',
			caption: 'font-kalam text-xl text-zinc-700 mt-6 mb-2 px-1',
			dateStamp: 'text-sm font-light text-zinc-400 tracking-widest uppercase px-1'
		},
		defaultFontStyle: 'casual'
	},
	{
		id: 'film-strip',
		name: 'Film Strip',
		description: 'Classic film strip with frame numbers',
		maxPhotos: 3,
		aspectRatio: '16:9',
		layout: 'strip',
		styles: {
			container: 'bg-black p-6 relative',
			photoContainer: `
        flex flex-col gap-3 relative
        before:content-[""] before:absolute before:left-[-1px] before:top-0 before:bottom-0 before:w-[8px]
        before:bg-[linear-gradient(to_bottom,transparent_4px,white_4px,white_8px,transparent_8px)] before:bg-repeat-y
        after:content-[""] after:absolute after:right-[-1px] after:top-0 after:bottom-0 after:w-[8px]
        after:bg-[linear-gradient(to_bottom,transparent_4px,white_4px,white_8px,transparent_8px)] after:bg-repeat-y
      `,
			photo: `
        aspect-[16/9] grayscale transition-all duration-300
        relative before:content-[attr(data-frame)] before:absolute before:left-[-20px] before:top-1/2 before:-translate-y-1/2
        before:text-[10px] before:font-mono before:text-white/70
      `,
			placeholder: 'aspect-[16/9] bg-zinc-800/50',
			caption: 'font-mono text-center text-sm text-white/90 tracking-wider mt-6 uppercase',
			dateStamp: 'mt-2 font-mono text-[10px] text-white/50 text-center tracking-wider'
		},
		defaultFontStyle: 'minimal'
	},

	{
		id: 'pastel-dreams',
		name: 'Pastel Dreams',
		description: 'Cute and dreamy style with soft pink tones',
		maxPhotos: 3,
		aspectRatio: '16:9',
		layout: 'polaroid',
		styles: {
			container: `
      bg-gradient-to-br from-pink-50 to-rose-100 p-6 shadow-lg
      border-8 border-white rounded-lg
      before:content-["✨"] before:absolute before:top-2 before:left-2 before:text-pink-300
      after:content-["✨"] after:absolute after:bottom-2 after:right-2 after:text-pink-300
    `,
			photoContainer: 'flex flex-col gap-4 relative',
			photo: `
      aspect-[16/9] rounded-lg shadow-sm ring-1 ring-pink-200
      relative
      before:content-[""] before:absolute before:inset-0
      before:border-2 before:border-pink-100/50 before:rounded-lg
      hover:shadow-lg hover:shadow-pink-100 transition-all
    `,
			placeholder: `
      aspect-[16/9] rounded-lg bg-pink-50/80
      ring-1 ring-pink-200
      relative
      before:content-[""] before:absolute before:inset-0
      before:border-2 before:border-pink-100/50 before:rounded-lg
    `,
			caption: `
      font-dancing text-center text-lg text-pink-700 mt-4
      relative
      before:content-["❀"] before:absolute before:-left-6 before:text-pink-300
      after:content-["❀"] after:absolute after:-right-6 after:text-pink-300
    `,
			dateStamp: `
      mt-2 text-xs font-light text-pink-400 text-center
      tracking-wider uppercase
    `
		},
		defaultFontStyle: 'dancing'
	}
];

export function getTemplate(id: string): PhotoboothTemplate {
	return templates.find((t) => t.id === id) || templates[0];
}
