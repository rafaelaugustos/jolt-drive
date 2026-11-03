import type { OrbitCamera, OrbitFrame, Point3 } from './car-stage';

export const clamp = (value: number) => Math.min(1, Math.max(0, value));
export const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
export const mixPoint = (from: Point3, to: Point3, t: number): Point3 => ({
	x: lerp(from.x, to.x, t),
	y: lerp(from.y, to.y, t),
	z: lerp(from.z, to.z, t),
});
export const orbitFrame = ({ near, far }: OrbitCamera, progress: number): OrbitFrame => {
	const t = clamp(progress);
	return {
		radius: lerp(near.radius, far.radius, t),
		height: lerp(near.height, far.height, t),
		target: mixPoint(near.target, far.target, t),
	};
};

/** Coordinates relative to the camera rig's Y rotation, in degrees. */
export const localPoint = (point: Point3, yaw: number): Point3 => {
	const angle = (yaw * Math.PI) / 180;
	return {
		x: Math.cos(angle) * point.x - Math.sin(angle) * point.z,
		y: point.y,
		z: Math.sin(angle) * point.x + Math.cos(angle) * point.z,
	};
};

/** Same quadratic doorway path as the original camera, sampled once by Jolt. */
export const cabinPoint = (
	outside: Point3,
	doorway: Point3,
	eye: Point3,
	progress: number,
): Point3 => {
	const t = clamp(progress);
	return mixPoint(mixPoint(outside, doorway, t), mixPoint(doorway, eye, t), t);
};
