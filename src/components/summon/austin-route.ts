import { austin } from './austin-data';

const METERS_LAT = 111320;
const METERS_LON = METERS_LAT * Math.cos((austin.origin[0] * Math.PI) / 180);
export const DRIVE_SECONDS = 48;
export const toLocal = (latitude: number, longitude: number) => ({
	x: (longitude - austin.origin[1]) * METERS_LON,
	z: -(latitude - austin.origin[0]) * METERS_LAT,
});
export const toCoordinate = (x: number, z: number) => ({
	latitude: austin.origin[0] - z / METERS_LAT,
	longitude: austin.origin[1] + x / METERS_LON,
});
const points = austin.route.map(([lat, lon]) => toLocal(lat, lon));
const distances = [0];
for (let i = 1; i < points.length; i++) {
	distances.push(
		distances[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z),
	);
}
export const ROUTE_METERS = distances[distances.length - 1];

/** Pure mapping sampled by Jolt into native scene and MapKit tracks. */
export function driveFrame(value: number) {
	const t = Math.max(0, Math.min(1, value));
	const fraction = t * t * (3 - 2 * t);
	const distance = fraction * ROUTE_METERS;
	let index = 1;
	while (index < distances.length - 1 && distances[index] < distance) index++;
	const from = points[index - 1],
		to = points[index];
	const along = (distance - distances[index - 1]) / (distances[index] - distances[index - 1]);
	const heading = Math.atan2(to.x - from.x, from.z - to.z);
	// Northbound right lane. Ease into the curb at the pickup, before 5th Street.
	const park = Math.max(0, (t - 0.87) / 0.13);
	const lane = 4.6 + 2.2 * park * park * (3 - 2 * park);
	const x = from.x + (to.x - from.x) * along + Math.cos(heading) * lane;
	const z = from.z + (to.z - from.z) * along + Math.sin(heading) * lane;
	return {
		x,
		z,
		heading,
		fraction,
		distance,
		...toCoordinate(x, z),
		mph: (ROUTE_METERS / DRIVE_SECONDS) * 6 * t * (1 - t) * 2.23694,
	};
}
