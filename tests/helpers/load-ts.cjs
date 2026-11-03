const { readFileSync } = require('node:fs');
const { dirname, resolve } = require('node:path');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

// Run framework-independent TypeScript without loading the NativeScript runtime.
function loadTs(file, { mocks = {}, globals = {} } = {}) {
	const cache = new Map();
	function load(filename) {
		if (cache.has(filename)) return cache.get(filename);
		const source = readFileSync(filename, 'utf8');
		const { outputText } = ts.transpileModule(source, {
			compilerOptions: { module: ts.ModuleKind.CommonJS },
		});
		const exports = {};
		cache.set(filename, exports);
		runInNewContext(
			outputText,
			{
				...globals,
				exports,
				require(dependency) {
					if (Object.hasOwn(mocks, dependency)) return mocks[dependency];
					if (dependency.startsWith('.'))
						return load(resolve(dirname(filename), `${dependency}.ts`));
					throw new Error(`Unexpected runtime dependency: ${dependency}`);
				},
			},
			{ filename },
		);
		return exports;
	}
	return load(resolve(__dirname, '../../', file));
}

module.exports = { loadTs };
