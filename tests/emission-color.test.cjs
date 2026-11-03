const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./helpers/load-ts.cjs');
const { emissionRamp, AIR_EMISSION_GAIN } = loadTs('src/components/scene/emission-color.ts');

test('moving brightness into emission color preserves the off and full-light endpoints', () => {
	for (const color of ['#e6fbff', '#ff2340', '#7fe9ff']) {
		const ramp = emissionRamp(color);
		assert.equal(ramp(0), '#000000');
		assert.equal(ramp(1), color);
		assert.equal(ramp(-0.2), '#000000');
		assert.equal(ramp(1.2), color);
	}
	// All five fan speeds stay within the material's fixed HDR gain.
	for (let fan = 1; fan <= 5; fan++) assert.ok(1.4 + fan * 0.3 <= AIR_EMISSION_GAIN);
});

test('half-power emission uses linear light instead of halving sRGB bytes', () => {
	const ramp = emissionRamp('#ffffff');
	// Standard sRGB encodings of 25% and 50% linear light, rounded to 8 bits.
	assert.equal(ramp(0.25), '#898989');
	assert.equal(ramp(0.5), '#bcbcbc');
	assert.notEqual(ramp(0.5), '#808080');
});
