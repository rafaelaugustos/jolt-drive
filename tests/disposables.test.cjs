const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./helpers/load-ts.cjs');
const { createDisposables } = loadTs('src/utils/disposables.ts');

test('native owners release in reverse order and only once', () => {
	const events = [];
	const resources = createDisposables();
	resources.add({ dispose: () => events.push('owner') });
	resources.add({ dispose: () => events.push('binding') });
	resources.dispose();
	resources.dispose();
	assert.deepEqual(events, ['binding', 'owner']);
});

test('a failed native release does not leak the remaining owners', () => {
	let released = false;
	const resources = createDisposables();
	resources.add({
		dispose: () => {
			released = true;
		},
	});
	const failure = new Error('Native release failed');
	resources.add({
		dispose: () => {
			throw failure;
		},
	});
	assert.throws(
		() => resources.dispose(),
		(error) => {
			assert.equal(error.name, 'AggregateError');
			assert.equal(error.errors[0], failure);
			return true;
		},
	);
	assert.equal(released, true);
	assert.doesNotThrow(() => resources.dispose());
});
