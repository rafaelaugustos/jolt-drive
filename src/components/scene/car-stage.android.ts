import type { CarStage } from './car-stage';

export function createCarStage(): CarStage {
	return {
		scene: null,
		camera: null,
		connect: () => {
			let paused = false;
			return {
				orbit: () => {},
				cabin: () => {},
				dispose: () => {},
				pause: () => {
					paused = true;
				},
				play: () => {
					paused = false;
				},
				get paused() {
					return paused;
				},
			};
		},
		project: () => ({ x: 0, y: 0 }),
		climate: () => {},
		doorYaw: () => 0,
	};
}
