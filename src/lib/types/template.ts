export interface PhotoboothTemplate {
	id: string;
	name: string;
	description: string;
	maxPhotos: number;
	aspectRatio: string;
	layout: 'strip' | 'grid' | 'polaroid' | 'instant';
	previewImage?: string;
	styles: {
		container: string;
		photoContainer: string;
		photo: string;
		caption: string;
		dateStamp: string;
		placeholder: string;
	};
	defaultFontStyle?: string;
}
