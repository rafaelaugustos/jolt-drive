// Keep the material's HDR gain fixed and vary its solid emission color.
// Scale in linear light, then encode sRGB for SceneKit's UIColor contents.
export function emissionRamp(hex: string): (amount: number) => string {
	const rgb = parseInt(hex.slice(1), 16);
	const linear = [16, 8, 0].map((shift) => {
		const channel = ((rgb >> shift) & 255) / 255;
		return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
	});
	return (amount) => {
		const level = Math.max(0, Math.min(1, amount));
		return (
			'#' +
			linear
				.map((channel) => {
					const light = channel * level;
					const srgb = light <= 0.0031308 ? light * 12.92 : 1.055 * light ** (1 / 2.4) - 0.055;
					return Math.round(srgb * 255)
						.toString(16)
						.padStart(2, '0');
				})
				.join('')
		);
	};
}

export const AIR_EMISSION_GAIN = 2.9;
