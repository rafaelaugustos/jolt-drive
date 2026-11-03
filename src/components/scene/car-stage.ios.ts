import { motionScope, type DerivedValue } from '@rafaelaugusto/jolt';
import {
	sceneKitPose,
	sceneKitLightIntensity,
	sceneKitMaterialTransparency,
	sceneKitMaterialEmission,
	sceneKitFieldOfView,
	sceneKitEnvironmentIntensity,
	sceneKitUniform,
	type NativeProperty,
	type ScenePose,
} from '@rafaelaugusto/jolt/native';
import type { CarStage, OrbitCamera, Point3, StageMotion, StageValues } from './car-stage';
import { cabinPoint, clamp, lerp, localPoint, mixPoint, orbitFrame } from './camera-path';
import { AIR_EMISSION_GAIN, emissionRamp } from './emission-color';
import { createDisposables } from '@/utils/disposables';

import { color, extent, vector } from './scene-kit.ios';
import { loadModel, measureCabin, refinish, rigWheels, trimCabin } from './car-model.ios';
import { airflow, chargePort, furnish, headlightBeam, studio } from './car-effects.ios';

const poseAt = (point: Point3): ScenePose => ({
	position: [point.x, point.y, point.z],
	orientation: [0, 0, 0, 1],
});

export function createCarStage(model: { name: string; extension: string }): CarStage {
	const scene = SCNScene.scene();
	scene.background.contents = UIColor.clearColor;
	scene.fogColor = color('#05070A');
	scene.fogStartDistance = 9;
	scene.fogEndDistance = 22;
	scene.fogDensityExponent = 1.4;
	const key = studio(scene);

	const car = SCNNode.node();
	const body = SCNNode.node();
	const shell = loadModel(model.name, model.extension);
	body.addChildNode(shell);
	car.addChildNode(body);
	scene.rootNode.addChildNode(car);

	const glows = refinish(shell);
	const cabin = measureCabin(shell);
	const cabinMaterials = trimCabin(shell, cabin);
	const wheels = rigWheels(car);
	const size = extent(shell, car);
	const vent = airflow(body, cabin);
	const interior = furnish(body, cabin);
	const beam = headlightBeam(body, shell, cabin.forward);
	const port = chargePort(body, size, cabin.forward, cabin.outward);

	const camera = SCNCamera.camera();
	camera.projectionDirection = SCNCameraProjectionDirection.Horizontal;
	camera.fieldOfView = 34;
	camera.zNear = 0.02;
	camera.zFar = 60;
	camera.wantsHDR = true;
	camera.bloomIntensity = 1.1;
	camera.bloomThreshold = 1.4;
	camera.bloomBlurRadius = 10;
	camera.wantsExposureAdaptation = false;
	camera.exposureOffset = 0.2;
	const cameraNode = SCNNode.node();
	cameraNode.name = 'jolt.camera';
	cameraNode.camera = camera;
	// Independent native bindings compose through SceneKit's node hierarchy.
	const cameraOrbit = SCNNode.node();
	cameraOrbit.name = 'jolt.camera.orbit';
	const cameraRail = SCNNode.node();
	cameraRail.name = 'jolt.camera.rail';
	scene.rootNode.addChildNode(cameraOrbit);
	cameraOrbit.addChildNode(cameraRail);
	cameraRail.addChildNode(cameraNode);

	const focus = SCNNode.node();
	scene.rootNode.addChildNode(focus);
	const aim = SCNLookAtConstraint.lookAtConstraintWithTarget(focus);
	aim.gimbalLockEnabled = true;
	cameraNode.constraints = NSArray.arrayWithObject(aim);

	const connect = (values: StageValues, framing: OrbitCamera): StageMotion => {
		const resources = createDisposables();
		const movement = motionScope();
		const cameraBindings = motionScope();
		const effects = motionScope();
		let paused = false;
		let disposed = false;
		const bindPose = (node: SCNNode, source: DerivedValue, map: (value: number) => ScenePose) => {
			const property = resources.add(sceneKitPose(node));
			movement.use(() => property.bind(source, map));
		};

		bindPose(car, values.travel, (distance) =>
			poseAt({ x: 0, y: 0, z: distance * cabin.forward.z }),
		);
		bindPose(body, values.lift, (height) => poseAt({ x: 0, y: height, z: 0 }));
		for (const wheel of wheels.spins) {
			const { x, y, z } = wheel.position;
			bindPose(wheel, values.travel, (distance) => {
				const halfAngle = distance / wheels.radius / 2;
				return {
					position: [x, y, z],
					orientation: [Math.sin(halfAngle), 0, 0, Math.cos(halfAngle)],
				};
			});
		}
		bindPose(cameraOrbit, values.yaw, (degrees) => {
			const halfAngle = (degrees * Math.PI) / 360;
			return { position: [0, 0, 0], orientation: [0, Math.sin(halfAngle), 0, Math.cos(halfAngle)] };
		});
		const railPose = resources.add(sceneKitPose(cameraRail));
		const focusPose = resources.add(sceneKitPose(focus));
		const orbit = () => {
			if (disposed) return;
			cameraBindings.reset();
			cameraBindings.use(() =>
				railPose.bind(values.framing, (progress) => {
					const frame = orbitFrame(framing, progress);
					return poseAt({ x: 0, y: frame.height, z: frame.radius });
				}),
			);
			cameraBindings.use(() =>
				focusPose.bind(values.framing, (progress) => poseAt(orbitFrame(framing, progress).target)),
			);
		};
		const enterPath = () => {
			if (disposed) return;
			// Capture the settled orbit once. The sheet and orbit controls are locked
			// during this transition, so the mapping is pure for the entire track.
			const frame = orbitFrame(framing, values.framing.get());
			const yaw = values.yaw.get();
			const outside = { x: 0, y: frame.height, z: frame.radius };
			const doorway = localPoint(cabin.doorway, yaw);
			const eye = localPoint(cabin.pose.eye, yaw);
			cameraBindings.reset();
			cameraBindings.use(() =>
				railPose.bind(values.inside, (t) => poseAt(cabinPoint(outside, doorway, eye, t))),
			);
			cameraBindings.use(() =>
				focusPose.bind(values.inside, (t) =>
					poseAt(mixPoint(frame.target, cabin.pose.look, clamp(t))),
				),
			);
		};

		// Property wrappers outlive suspended bindings and are disposed at teardown.
		const bindAppearance = <T>(
			property: NativeProperty<T>,
			source: DerivedValue,
			map: (value: number) => T,
		) => {
			resources.add(property);
			effects.use(() => property.bind(source, map));
		};
		bindAppearance(sceneKitLightIntensity(beam), values.lamp, (value) => Math.max(0, value) * 2200);
		for (const [material, tint] of glows) {
			bindAppearance(sceneKitMaterialEmission(material), values.lamp, emissionRamp(tint));
		}
		bindAppearance(sceneKitMaterialTransparency(port.glow), values.charge, clamp);
		bindAppearance(sceneKitLightIntensity(port.halo), values.charge, (value) => clamp(value) * 22);
		bindAppearance(sceneKitLightIntensity(interior), values.inside, (value) => clamp(value) * 40);
		bindAppearance(sceneKitLightIntensity(key), values.inside, (value) =>
			lerp(900, 260, clamp(value)),
		);
		bindAppearance(sceneKitMaterialTransparency(vent.glow), values.airOpacity, clamp);
		const airEmission = emissionRamp('#7FE9FF');
		bindAppearance(sceneKitMaterialEmission(vent.glow), values.airGlow, (value) =>
			airEmission(value / AIR_EMISSION_GAIN),
		);
		bindAppearance(sceneKitFieldOfView(camera), values.inside, (value) =>
			lerp(framing.fov, cabin.pose.fov, clamp(value)),
		);
		bindAppearance(sceneKitEnvironmentIntensity(scene), values.inside, (value) =>
			lerp(1.6, 0.45, clamp(value)),
		);
		for (const material of cabinMaterials) {
			bindAppearance(
				sceneKitUniform(material, 'cabinView', {
					type: 'float',
					range: [0, 1],
					units: ['blend fraction'],
					motion: 'appearance',
				}),
				values.inside,
				(value) => {
					// Blend under the entry veil instead of switching the cabin shader abruptly.
					const t = clamp((value - 0.62) / 0.22);
					return t * t * (3 - 2 * t);
				},
			);
		}
		orbit();
		return {
			orbit,
			cabin: enterPath,
			get paused() {
				return paused;
			},
			pause() {
				if (disposed || paused) return;
				paused = true;
				movement.suspend();
				cameraBindings.suspend();
				effects.suspend();
			},
			play() {
				if (disposed || !paused) return;
				paused = false;
				movement.resume();
				cameraBindings.resume();
				effects.resume();
			},
			dispose() {
				if (disposed) return;
				disposed = true;
				cameraBindings.dispose();
				movement.dispose();
				effects.dispose();
				resources.dispose();
			},
		};
	};

	const project = (point: Point3, view: SCNView) => {
		const projected = view.projectPoint(vector(point.x, point.y, point.z));
		return { x: projected.x, y: projected.y };
	};

	const doorYaw = () => (Math.atan2(cabin.doorway.x, cabin.doorway.z) * 180) / Math.PI;

	return { scene, camera: cameraNode, connect, project, climate: vent.update, doorYaw };
}
