import type { DerivedValue } from '@rafaelaugusto/jolt';
export declare function createDriveStage(source: DerivedValue): {
	scene: SCNScene | null;
	camera: SCNNode | null;
	dispose(): void;
};
