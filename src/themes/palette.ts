export const palette = {
	ink: '#05070A',
	surface: '#0C1117',
	raised: '#121A23',
	line: 'rgba(234, 242, 248, 0.08)',
	text: '#EAF2F8',
	muted: '#7D8A99',
	faint: '#4A5563',
	volt: '#38F5C8',
	sky: '#7FE9FF',
	blue: '#1A9BFF',
	alert: '#FF4D6A',
	amber: '#FFB547',
	acid: '#D5FF62',
	lilac: '#C8B6FF',
};

export const atmospheres = [
	{
		name: 'Electric',
		color: palette.acid,
		secondary: '#38F5C8',
		caption: 'A little more electric.',
	},
	{ name: 'Glacier', color: palette.sky, secondary: '#5689FF', caption: 'Find your cool.' },
	{
		name: 'Afterglow',
		color: palette.lilac,
		secondary: '#FF8AAE',
		caption: 'Stay a little longer.',
	},
] as const;

export const withAlpha = (hex: string, alpha: number) => {
	const value = parseInt(hex.slice(1), 16);
	return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
};
