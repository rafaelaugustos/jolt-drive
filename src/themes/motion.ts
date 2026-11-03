import type { CubicBezier, Spring } from '@rafaelaugusto/jolt';

export const curves = {
	glide: [0.16, 1, 0.3, 1] as CubicBezier,
	launch: [0.7, 0, 0.84, 0] as CubicBezier,
	breathe: [0.45, 0, 0.55, 1] as CubicBezier,
};

export const springs = {
	settle: { type: 'spring', stiffness: 170, damping: 14, mass: 1 } as Spring,
	snap: { type: 'spring', stiffness: 420, damping: 30, mass: 1 } as Spring,
	soft: { type: 'spring', stiffness: 90, damping: 16, mass: 1 } as Spring,
};
