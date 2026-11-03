import type { Point3 } from './car-stage';
import { color, extent, vector } from './scene-kit.ios';
import { loadModel, measureCabin, refinish, trimCabin } from './car-model.ios';
import { AIR_EMISSION_GAIN } from './emission-color';

const glowMaterial = (hex: string, image?: string) => {
	const material = SCNMaterial.material();
	material.lightingModelName = SCNLightingModelConstant;
	material.diffuse.contents = image ? UIImage.imageNamed(image) : color(hex);
	material.emission.contents = image ? UIImage.imageNamed(image) : color(hex);
	return material;
};

export const studio = (scene: SCNScene): SCNLight => {
	scene.lightingEnvironment.contents = UIImage.imageNamed('studio_environment.png');
	scene.lightingEnvironment.intensity = 1.6;

	const key = SCNLight.light();
	key.type = SCNLightTypeDirectional;
	key.intensity = 900;
	key.castsShadow = true;
	key.shadowMode = SCNShadowMode.Deferred;
	key.shadowSampleCount = 16;
	key.shadowRadius = 8;
	key.shadowColor = color('#000000', 0.75);
	key.orthographicScale = 4;
	const keyNode = SCNNode.node();
	keyNode.light = key;
	keyNode.eulerAngles = vector(-Math.PI / 2.4, Math.PI / 6, 0);
	scene.rootNode.addChildNode(keyNode);

	const fill = SCNLight.light();
	fill.type = SCNLightTypeAmbient;
	fill.intensity = 120;
	fill.color = color('#9FD8FF');
	const fillNode = SCNNode.node();
	fillNode.light = fill;
	scene.rootNode.addChildNode(fillNode);

	const floor = SCNFloor.floor();
	floor.reflectivity = 0.12;
	floor.reflectionFalloffEnd = 1.6;
	floor.reflectionResolutionScaleFactor = 0.8;
	const surface = SCNMaterial.material();
	surface.lightingModelName = SCNLightingModelLambert;
	surface.diffuse.contents = color('#0A0D12');
	floor.firstMaterial = surface;
	scene.rootNode.addChildNode(SCNNode.nodeWithGeometry(floor));
	return key;
};

export const airflow = (car: SCNNode, cabin: ReturnType<typeof measureCabin>) => {
	const span = (cabin.dash.high.x - cabin.dash.low.x) * 0.62;
	const strip = SCNBox.boxWithWidthHeightLengthChamferRadius(span, 0.006, 0.02, 0.003);
	const glow = glowMaterial('#7FE9FF');
	glow.emission.contents = color('#000000');
	glow.emission.intensity = AIR_EMISSION_GAIN;
	glow.transparency = 0;
	strip.firstMaterial = glow;
	const vent = SCNNode.nodeWithGeometry(strip);
	vent.position = vector(
		cabin.dash.center.x,
		cabin.dash.high.y - 0.02,
		cabin.steering.center.z + cabin.forward.z * 0.26,
	);
	car.addChildNode(vent);

	const air = SCNParticleSystem.particleSystem();
	air.particleImage = UIImage.imageNamed('air_particle.png');
	air.emitterShape = strip;
	air.birthRate = 0;
	air.particleLifeSpan = 0.85;
	air.particleLifeSpanVariation = 0.25;
	air.particleVelocity = 0.55;
	air.particleVelocityVariation = 0.2;
	air.emittingDirection = vector(0, 0.3, -cabin.forward.z);
	air.spreadingAngle = 12;
	air.particleSize = 0.0035;
	air.particleSizeVariation = 0.0015;
	air.stretchFactor = 0.035;
	air.particleColor = color('#BFF4FF', 0.5);
	air.blendMode = SCNParticleBlendMode.Additive;
	air.affectedByGravity = false;
	const fade = CAKeyframeAnimation.animationWithKeyPath('opacity');
	fade.values = NSArray.arrayWithArray(
		[0, 0.9, 0.6, 0].map((value) => NSNumber.numberWithDouble(value)),
	);
	fade.keyTimes = NSArray.arrayWithArray(
		[0, 0.15, 0.6, 1].map((value) => NSNumber.numberWithDouble(value)),
	);
	air.propertyControllers = NSDictionary.dictionaryWithObjectForKey(
		SCNParticlePropertyController.controllerWithAnimation(fade),
		SCNParticlePropertyOpacity,
	);
	vent.addParticleSystem(air);

	return {
		glow,
		update(on: boolean, fan: number) {
			air.birthRate = on ? 140 * fan : 0;
			air.particleVelocity = 0.3 + fan * 0.09;
		},
	};
};

export const furnish = (
	car: SCNNode,
	cabin: ReturnType<typeof measureCabin>,
	screenImage?: UIImage,
) => {
	const screen = SCNPlane.planeWithWidthHeight(0.36, 0.225);
	screen.cornerRadius = 0.012;
	const display = glowMaterial('#000000', 'cabin_screen.png');
	if (screenImage) {
		display.diffuse.contents = screenImage;
		display.emission.contents = screenImage;
	}
	display.emission.intensity = 1.1;
	display.doubleSided = false;
	screen.firstMaterial = display;
	const screenNode = SCNNode.nodeWithGeometry(screen);
	screenNode.position = vector(
		cabin.dash.center.x,
		cabin.dash.high.y + 0.1,
		cabin.steering.center.z + cabin.forward.z * 0.22,
	);
	screenNode.eulerAngles = vector(-0.22, cabin.forward.z > 0 ? Math.PI : 0, 0);
	car.addChildNode(screenNode);

	const lamp = SCNLight.light();
	lamp.type = SCNLightTypeOmni;
	lamp.intensity = 0;
	lamp.color = color('#BFEFFF');
	lamp.attenuationStartDistance = 0.2;
	lamp.attenuationEndDistance = 1.6;
	const lampNode = SCNNode.node();
	lampNode.light = lamp;
	lampNode.position = vector(
		cabin.dash.center.x,
		cabin.dash.high.y + 0.35,
		cabin.steering.center.z - cabin.forward.z * 0.3,
	);
	car.addChildNode(lampNode);
	return lamp;
};

export const headlightBeam = (car: SCNNode, model: SCNNode, forward: Point3) => {
	const bulb = model.childNodeWithNameRecursively('HeadlightBulb_002', true);
	const origin = bulb ? extent(bulb, car).center : { x: 0, y: 0.7, z: 2.2 * forward.z };
	const beam = SCNLight.light();
	beam.type = SCNLightTypeSpot;
	beam.intensity = 0;
	beam.color = color('#E6FBFF');
	beam.spotInnerAngle = 28;
	beam.spotOuterAngle = 78;
	beam.attenuationStartDistance = 0.5;
	beam.attenuationEndDistance = 7;
	const node = SCNNode.node();
	node.light = beam;
	node.position = vector(origin.x, origin.y, origin.z + forward.z * 0.1);
	node.eulerAngles = vector(-0.32, forward.z > 0 ? Math.PI : 0, 0);
	car.addChildNode(node);
	return beam;
};

export const chargePort = (
	car: SCNNode,
	body: ReturnType<typeof extent>,
	forward: Point3,
	side: Point3,
) => {
	const door = SCNPlane.planeWithWidthHeight(0.085, 0.06);
	door.cornerRadius = 0.014;
	const glow = glowMaterial('#38F5C8');
	glow.emission.intensity = 2;
	glow.transparency = 0;
	door.firstMaterial = glow;
	const node = SCNNode.nodeWithGeometry(door);
	const rear = forward.z > 0 ? body.low.z : body.high.z;
	node.position = vector(
		side.x > 0 ? body.high.x + 0.004 : body.low.x - 0.004,
		body.low.y + (body.high.y - body.low.y) * 0.6,
		rear + forward.z * 0.48,
	);
	node.eulerAngles = vector(0, side.x > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
	car.addChildNode(node);

	const halo = SCNLight.light();
	halo.type = SCNLightTypeOmni;
	halo.intensity = 0;
	halo.color = color('#38F5C8');
	halo.attenuationStartDistance = 0;
	halo.attenuationEndDistance = 0.45;
	const haloNode = SCNNode.node();
	haloNode.light = halo;
	haloNode.position = vector(node.position.x + side.x * 0.25, node.position.y, node.position.z);
	car.addChildNode(haloNode);
	return { glow, halo };
};

/** The same downloaded mesh as the garage, with clear glass for the road camera. */
export function loadDriveCabin(screenImage?: UIImage) {
	const car = loadModel('car', 'usdz');
	refinish(car);
	const cabin = measureCabin(car);
	for (const material of trimCabin(car, cabin)) material.setValueForKey(1, 'cabinView');
	car.enumerateHierarchyUsingBlock((node: SCNNode) => {
		const materials = node.geometry?.materials;
		if (!materials) return;
		for (let i = 0; i < materials.count; i++) {
			const material = materials.objectAtIndex(i);
			if (material.name?.startsWith('Glass')) {
				// The imported shell has overlapping tinted glass layers. From the
				// onboard camera they must not occlude the street behind the windshield.
				material.colorBufferWriteMask = SCNColorMask.None;
				material.writesToDepthBuffer = false;
			}
		}
	});
	const lamp = furnish(car, cabin, screenImage);
	lamp.intensity = 18;
	return { car, cabin };
}
