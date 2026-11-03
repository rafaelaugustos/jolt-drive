import type { DerivedValue } from '@rafaelaugusto/jolt';

export interface Point3 {
	x: number;
	y: number;
	z: number;
}

export interface OrbitFrame {
	radius: number;
	height: number;
	target: Point3;
}

export interface OrbitCamera {
	near: OrbitFrame;
	far: OrbitFrame;
	fov: number;
}

export interface CabinPose {
	eye: Point3;
	look: Point3;
	fov: number;
}

export interface StageValues {
	/** Degrees around the car; gesture DIPs are converted by the caller. */
	yaw: DerivedValue;
	framing: DerivedValue;
	inside: DerivedValue;
	travel: DerivedValue;
	lift: DerivedValue;
	lamp: DerivedValue;
	charge: DerivedValue;
	airGlow: DerivedValue;
	airOpacity: DerivedValue;
}

export interface StageMotion {
	orbit(): void;
	cabin(): void;
	pause(): void;
	play(): void;
	readonly paused: boolean;
	dispose(): void;
}

export interface CarStage {
	scene: SCNScene | null;
	camera: SCNNode | null;
	connect(values: StageValues, camera: OrbitCamera): StageMotion;
	project(point: Point3, view: SCNView): { x: number; y: number };
	climate(on: boolean, fan: number): void;
	doorYaw(): number;
}

export declare function createCarStage(model: { name: string; extension: string }): CarStage;
