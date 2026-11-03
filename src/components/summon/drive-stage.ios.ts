import { color, vector } from '../scene/scene-kit.ios';
import { motionScope, type DerivedValue } from '@rafaelaugusto/jolt';
import { sceneKitPose } from '@rafaelaugusto/jolt/native';
import { loadDriveCabin } from '../scene/car-effects.ios';
import { createAustinCity } from './austin-city.ios';
import { driveFrame } from './austin-route';
import { createDriveDisplay } from './drive-display.ios';
import { createDisposables } from '@/utils/disposables';

export function createDriveStage(source: DerivedValue) {
	const resources = createDisposables();
	const motion = motionScope();
	const scene = SCNScene.scene();
	scene.background.contents = color('#B9D5DF');
	scene.fogColor = color('#B9D5DF');
	scene.fogStartDistance = 220;
	scene.fogEndDistance = 650;
	scene.lightingEnvironment.contents = UIImage.imageNamed('studio_environment.png');
	scene.lightingEnvironment.intensity = 0.65;
	const sun = SCNNode.node();
	sun.light = SCNLight.light();
	sun.light.type = SCNLightTypeDirectional;
	sun.light.color = color('#FFF1D7');
	sun.light.intensity = 1000;
	sun.eulerAngles = vector(-1, -0.5, 0);
	scene.rootNode.addChildNode(sun);
	const sky = SCNNode.node();
	sky.light = SCNLight.light();
	sky.light.type = SCNLightTypeAmbient;
	sky.light.color = color('#C6E1F1');
	sky.light.intensity = 340;
	scene.rootNode.addChildNode(sky);

	const { car, cabin } = loadDriveCabin(createDriveDisplay());
	scene.rootNode.addChildNode(car);
	const city = createAustinCity();
	scene.rootNode.addChildNode(city);
	const worldPose = resources.add(sceneKitPose(city));
	motion.use(() =>
		worldPose.bind(source, (value) => {
			const frame = driveFrame(value);
			const angle = frame.heading + (cabin.forward.z > 0 ? Math.PI : 0);
			const c = Math.cos(angle),
				s = Math.sin(angle);
			return {
				position: [-c * frame.x - s * frame.z, 0, s * frame.x - c * frame.z],
				orientation: [0, Math.sin(angle / 2), 0, Math.cos(angle / 2)],
			};
		}),
	);

	const camera = SCNNode.node();
	camera.camera = SCNCamera.camera();
	camera.camera.projectionDirection = SCNCameraProjectionDirection.Horizontal;
	camera.camera.fieldOfView = 76;
	camera.camera.zNear = 0.025;
	camera.camera.zFar = 900;
	camera.camera.wantsHDR = true;
	camera.camera.wantsExposureAdaptation = false;
	camera.camera.exposureOffset = -0.2;
	const eye = cabin.pose.eye;
	// This downloaded Roadster has a low roof: the garage's raised inspection
	// camera intersects its headliner when aimed at the horizon.
	camera.position = vector(eye.x * 0.7, eye.y - 0.145, eye.z - cabin.forward.z * 0.03);
	camera.eulerAngles = vector(0, cabin.forward.z > 0 ? Math.PI : 0, 0);
	scene.rootNode.addChildNode(camera);
	return {
		scene,
		camera,
		dispose() {
			motion.dispose();
			resources.dispose();
		},
	};
}
