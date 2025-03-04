/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				caveat: ['Caveat', 'cursive'],
				kalam: ['Kalam', 'cursive'],
				outfit: ['Outfit', 'sans-serif'],
				playfair: ['Playfair Display', 'serif'],
				sans: ['Inter', 'system-ui', 'sans-serif']
			},
			typography: {
				DEFAULT: {
					css: {
						maxWidth: '100%'
					}
				}
			}
		}
	},
	plugins: [require('@tailwindcss/typography')]
};
