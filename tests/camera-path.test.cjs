const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./helpers/load-ts.cjs');
const { orbitFrame, localPoint, cabinPoint, mixPoint } = loadTs(
	'src/components/scene/camera-path.ts',
);

const framing = {
	near: { radius: 7.6, height: 1.9, target: { x: 0, y: 0.35, z: 0 } },
	far: { radius: 12.8, height: 3.6, target: { x: 0, y: 0.35, z: 0 } },
	fov: 38,
};
const doorway = { x: -0.9, y: 0.8, z: 1.1 };
const eye = { x: -0.35, y: 1.2, z: 0.3 };
const look = { x: -0.2, y: 1.1, z: -1.3 };
const headings = [-540, -90, -35, 0, 30, 80, 180, 450, 3600];
const closePoint = (actual, expected) => {
	for (const axis of ['x', 'y', 'z'])
		assert.ok(
			Math.abs(actual[axis] - expected[axis]) < 1e-9,
			`${axis}: ${actual[axis]} != ${expected[axis]}`,
		);
};
const worldPoint = (p, yaw) => {
	const a = (yaw * Math.PI) / 180;
	return {
		x: Math.cos(a) * p.x + Math.sin(a) * p.z,
		y: p.y,
		z: -Math.sin(a) * p.x + Math.cos(a) * p.z,
	};
};

test('native orbit rig and cabin rail preserve the previous world-space trajectory', () => {
	for (const yaw of headings)
		for (const f of [-0.2, 0, 0.35, 1, 1.2])
			for (const t of [0, 0.1, 0.5, 0.9, 1]) {
				const frame = orbitFrame(framing, f);
				const rail = cabinPoint(
					{ x: 0, y: frame.height, z: frame.radius },
					localPoint(doorway, yaw),
					localPoint(eye, yaw),
					t,
				);
				const angle = (yaw * Math.PI) / 180;
				const radius = 7.6 + (12.8 - 7.6) * Math.min(1, Math.max(0, f));
				const height = 1.9 + (3.6 - 1.9) * Math.min(1, Math.max(0, f));
				const a = (1 - t) ** 2,
					b = 2 * (1 - t) * t,
					c = t * t;
				closePoint(worldPoint(rail, yaw), {
					x: a * Math.sin(angle) * radius + b * doorway.x + c * eye.x,
					y: a * height + b * doorway.y + c * eye.y,
					z: a * Math.cos(angle) * radius + b * doorway.z + c * eye.z,
				});
			}
});

test('changing sheet framing inside the cabin preserves the handoff into the return path', () => {
	for (const yaw of headings)
		for (const f of [0, 0.5, 1]) {
			const frame = orbitFrame(framing, f);
			const rail = cabinPoint(
				{ x: 0, y: frame.height, z: frame.radius },
				localPoint(doorway, yaw),
				localPoint(eye, yaw),
				1,
			);
			closePoint(worldPoint(rail, yaw), eye);
			closePoint(mixPoint(frame.target, look, 1), look);
		}
});

test('rubberband overshoot holds the near and far camera framing', () => {
	for (const [input, expected] of [
		[-1, framing.near],
		[2, framing.far],
	]) {
		const frame = orbitFrame(framing, input);
		assert.equal(frame.radius, expected.radius);
		assert.equal(frame.height, expected.height);
		closePoint(frame.target, expected.target);
	}
});
