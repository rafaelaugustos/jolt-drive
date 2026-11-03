import type { CabinPose, Point3 } from './car-stage';
import { color, extent, find, vector } from './scene-kit.ios';

const add = (a: Point3, b: Point3, scale = 1): Point3 => ({
	x: a.x + b.x * scale,
	y: a.y + b.y * scale,
	z: a.z + b.z * scale,
});

const UP: Point3 = { x: 0, y: 1, z: 0 };

interface Finish {
	color: string;
	metalness: number;
	roughness: number;
	clearCoat?: number;
	glow?: 'head' | 'tail';
	glowColor?: string;
	texture?: string;
	glass?: number;
}

const FINISHES: Record<string, Finish> = {
	CarExteriorShell: { color: '#E8ECF1', metalness: 0.35, roughness: 0.2, clearCoat: 1 },
	Glass: { color: '#06080B', metalness: 0.3, roughness: 0.06, glass: 0.62 },
	'Glass Dark': { color: '#030405', metalness: 0.45, roughness: 0.05, glass: 0.82 },
	BlackOut: { color: '#0C0D10', metalness: 0.05, roughness: 0.8 },
	matte: { color: '#101318', metalness: 0.2, roughness: 0.5 },
	RimsDark: { color: '#2B3038', metalness: 0.9, roughness: 0.28 },
	RimsDarkLogo: { color: '#2B3038', metalness: 0.9, roughness: 0.28, texture: 'car_logo.jpg' },
	Tires: { color: '#121315', metalness: 0, roughness: 0.85 },
	TiresDecal: { color: '#121315', metalness: 0, roughness: 0.85 },
	Brake: { color: '#C3121F', metalness: 0.3, roughness: 0.35 },
	Rotor: { color: '#80868E', metalness: 1, roughness: 0.35 },
	RotorBrushed: { color: '#9097A0', metalness: 1, roughness: 0.25 },
	Reflectors: { color: '#D9DFE6', metalness: 1, roughness: 0.08 },
	FrontLightReflectors: { color: '#D9DFE6', metalness: 1, roughness: 0.08 },
	'Metal Light CLear': { color: '#D9DFE6', metalness: 1, roughness: 0.1 },
	FrontLightBulb: {
		color: '#F2FDFF',
		metalness: 0,
		roughness: 0.2,
		glow: 'head',
		glowColor: '#E6FBFF',
	},
	RearLightReflectors: {
		color: '#4A0610',
		metalness: 0.4,
		roughness: 0.2,
		glow: 'tail',
		glowColor: '#FF2340',
	},
};

export const refinish = (root: SCNNode) => {
	const glows = new Map<SCNMaterial, string>();
	root.enumerateHierarchyUsingBlock((node: SCNNode) => {
		const materials = node.geometry?.materials;
		if (!materials) return;
		for (let i = 0; i < materials.count; i++) {
			const material = materials.objectAtIndex(i) as SCNMaterial;
			const finish = FINISHES[(material.name ?? '').replace(/_/g, ' ')];
			if (!finish) continue;
			material.lightingModelName = SCNLightingModelPhysicallyBased;
			for (const slot of [
				material.normal,
				material.ambientOcclusion,
				material.transparent,
				material.displacement,
			]) {
				slot.contents = null;
			}
			material.diffuse.contents = finish.texture
				? UIImage.imageNamed(finish.texture)
				: color(finish.color);
			material.metalness.contents = finish.metalness;
			material.roughness.contents = finish.roughness;
			if (finish.clearCoat) {
				material.clearCoat.contents = finish.clearCoat;
				material.clearCoatRoughness.contents = 0.04;
			}
			if (finish.glass) {
				material.doubleSided = true;
				material.transparency = finish.glass;
			}
			if (finish.glow) {
				material.emission.contents = color('#000000');
				material.emission.intensity = finish.glow === 'head' ? 4 : 2.6;
				glows.set(material, finish.glowColor!);
			}
		}
	});
	return glows;
};

export const loadModel = (name: string, extension: string) => {
	const url = NSBundle.mainBundle.URLForResourceWithExtension(name, extension);
	const source = url && SCNScene.sceneWithURLOptionsError(url, null);
	if (!source) throw new Error(`Missing 3D model ${name}.${extension}`);
	const model = SCNNode.node();
	const children = source.rootNode.childNodes;
	for (let i = 0; i < children.count; i++) model.addChildNode(children.objectAtIndex(i));
	return model;
};

export const rigWheels = (car: SCNNode) => {
	const spins: SCNNode[] = [];
	let radius = 0.34;
	for (const pivot of find(car, 'Empty_Ctrl')) {
		const tread = find(pivot, 'tireTread')[0];
		if (!tread) continue;
		const tire = extent(tread, car);
		radius = (tire.high.y - tire.low.y) / 2;
		const spin = SCNNode.node();
		spin.position = vector(tire.center.x, tire.center.y, tire.center.z);
		car.addChildNode(spin);
		const world = pivot.worldTransform;
		pivot.removeFromParentNode();
		spin.addChildNode(pivot);
		pivot.transform = spin.convertTransformFromNode(world, null);
		for (const caliper of [...find(pivot, 'brake'), ...find(pivot, 'logo_text_Brake')]) {
			const placed = caliper.worldTransform;
			caliper.removeFromParentNode();
			car.addChildNode(caliper);
			caliper.transform = car.convertTransformFromNode(placed, null);
		}
		spins.push(spin);
	}
	return { spins, radius };
};

export const measureCabin = (model: SCNNode) => {
	const wheel = model.childNodeWithNameRecursively('Steering_wheel', true);
	const panel = model.childNodeWithNameRecursively('Front_panel', true);
	if (!wheel || !panel) throw new Error('The model needs Steering_wheel and Front_panel nodes');
	const steering = extent(wheel);
	const dash = extent(panel);
	const forward: Point3 = { x: 0, y: 0, z: Math.sign(dash.center.z - steering.center.z) || 1 };
	const outward: Point3 = { x: Math.sign(steering.center.x) || 1, y: 0, z: 0 };
	const eye = add(add(steering.center, forward, -0.5), UP, 0.36);
	return {
		forward,
		outward,
		pose: {
			eye,
			look: {
				x: steering.center.x * 0.35,
				y: dash.high.y - 0.12,
				z: steering.center.z + forward.z * 1.3,
			},
			fov: 70,
		} as CabinPose,
		doorway: add(add(eye, outward, 1.7), UP, 0.2),
		dash,
		steering,
	};
};

export const trimCabin = (model: SCNNode, cabin: ReturnType<typeof measureCabin>) => {
	const ahead = cabin.forward.z > 0;
	const front = ahead ? cabin.dash.high.z : cabin.dash.low.z;
	const rear = cabin.steering.center.z - cabin.forward.z * 1.2;
	const [low, high] = ahead ? [rear, front] : [front, rear];
	const shader = `#pragma arguments
float cabinView;
#pragma body
float4 world = scn_frame.inverseViewTransform * float4(_surface.position, 1.0);
float within = step(${low.toFixed(3)}, world.z) * step(world.z, ${high.toFixed(3)}) * step(0.42, world.y);
float3 inner = mix(_output.color.rgb * 0.22, float3(0.03, 0.033, 0.04), within);
_output.color.rgb = mix(_output.color.rgb, inner, cabinView);`;
	const trims: SCNMaterial[] = [];
	model.enumerateHierarchyUsingBlock((node: SCNNode) => {
		const materials = node.geometry?.materials;
		if (!materials) return;
		for (let i = 0; i < materials.count; i++) {
			const material = materials.objectAtIndex(i) as SCNMaterial;
			if (material.name !== 'CarExteriorShell' || trims.includes(material)) continue;
			material.shaderModifiers = NSDictionary.dictionaryWithObjectForKey(
				shader,
				SCNShaderModifierEntryPointFragment,
			);
			material.setValueForKey(0, 'cabinView');
			trims.push(material);
		}
	});
	return trims;
};
