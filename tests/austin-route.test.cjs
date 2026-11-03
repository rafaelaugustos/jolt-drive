const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./helpers/load-ts.cjs');
const { driveFrame, toLocal, toCoordinate, ROUTE_METERS } = loadTs(
	'src/components/summon/austin-route.ts',
);

test('pickup follows Congress from 2nd Street to just before 5th Street', () => {
	const start = driveFrame(0),
		end = driveFrame(1);
	assert.ok(ROUTE_METERS > 300 && ROUTE_METERS < 340);
	assert.ok(Math.abs(start.latitude - 30.2643199) < 0.00004);
	assert.ok(Math.abs(end.latitude - 30.2670367) < 0.00004);
	assert.ok(end.longitude > start.longitude);
	assert.equal(start.mph, 0);
	assert.equal(end.mph, 0);
});
test('drive has no teleports, reversals or implausible speeds along the sampled track', () => {
	let before = driveFrame(0);
	for (let i = 1; i <= 1000; i++) {
		const current = driveFrame(i / 1000);
		assert.ok(current.distance >= before.distance);
		assert.ok(Math.hypot(current.x - before.x, current.z - before.z) < 0.6);
		assert.ok(current.mph >= 0 && current.mph < 30);
		assert.ok(Number.isFinite(current.heading));
		before = current;
	}
});
test('map and scene share coordinates and clamp overshoot at both endpoints', () => {
	for (const progress of [-1, 0, 0.5, 1, 2]) {
		const frame = driveFrame(progress);
		const position = toLocal(frame.latitude, frame.longitude);
		assert.ok(Math.hypot(position.x - frame.x, position.z - frame.z) < 0.000001);
		const coord = toCoordinate(position.x, position.z);
		assert.equal(coord.latitude, frame.latitude);
		assert.equal(coord.longitude, frame.longitude);
	}
	assert.equal(driveFrame(-1).distance, 0);
	assert.equal(driveFrame(2).distance, ROUTE_METERS);
});
