const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computed, reactive, ref } = require('@vue/reactivity');
const { loadTs } = require('./helpers/load-ts.cjs');

function garage(t) {
	t.mock.timers.enable({ apis: ['setInterval'] });
	const cleanups = [];
	const charging = [];
	const { useVehicle } = loadTs('src/pages/Home/useVehicle.ts', {
		mocks: {
			'nativescript-vue': { computed, reactive, ref, onUnmounted: (fn) => cleanups.push(fn) },
		},
		globals: { setInterval, clearInterval },
	});
	const vehicle = useVehicle({ notify() {}, charging: (active) => charging.push(active) });
	return { vehicle, charging, dispose: () => cleanups.forEach((fn) => fn()) };
}

test('charging stops at the selected limit and rejects another start', (t) => {
	const { vehicle, charging } = garage(t);
	vehicle.savePlan(80);
	vehicle.charge(true);
	t.mock.timers.tick(2400);
	assert.equal(vehicle.level.value, 80);
	assert.equal(vehicle.range.value, 320);
	assert.equal(vehicle.state.charging, false);
	vehicle.charge(true);
	t.mock.timers.tick(6000);
	assert.equal(vehicle.level.value, 80);
	assert.deepEqual(charging, [true, false]);
});

test('lowering the charge limit stops an active session without lowering battery level', (t) => {
	const { vehicle, charging } = garage(t);
	vehicle.charge(true);
	t.mock.timers.tick(3600);
	vehicle.savePlan(80);
	assert.equal(vehicle.level.value, 81);
	assert.equal(vehicle.state.charging, false);
	assert.deepEqual(charging, [true, false]);
});

test('climate follows the selected temperature and restarts after reaching it', (t) => {
	const { vehicle } = garage(t);
	vehicle.state.climate = true;
	vehicle.retarget(24);
	t.mock.timers.tick(3600);
	assert.equal(vehicle.inside.value, 24);
	vehicle.retarget(100);
	assert.equal(vehicle.target.value, 28);
	t.mock.timers.tick(4500);
	assert.equal(vehicle.inside.value, 28);
	vehicle.retarget(-100);
	assert.equal(vehicle.target.value, 16);
});

test('leaving the garage stops simulation timers', (t) => {
	const { vehicle, dispose } = garage(t);
	vehicle.charge(true);
	vehicle.regulate(true);
	dispose();
	t.mock.timers.tick(10000);
	assert.equal(vehicle.level.value, 78);
	assert.equal(vehicle.inside.value, 27);
});
