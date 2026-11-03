import type { DerivedValue } from '@rafaelaugusto/jolt';
export function createDriveStage(_source: DerivedValue) {
	return { scene: null, camera: null, dispose() {} };
}
