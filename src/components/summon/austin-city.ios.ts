import { color, vector } from '../scene/scene-kit.ios';
import { austin } from './austin-data';
import { toLocal } from './austin-route';

const material = (hex: string) => {
	const m = SCNMaterial.material();
	m.lightingModelName = SCNLightingModelLambert;
	m.diffuse.contents = color(hex);
	return m;
};
const box = (
	root: SCNNode,
	x: number,
	y: number,
	z: number,
	width: number,
	height: number,
	length: number,
	m: SCNMaterial,
) => {
	const geometry = SCNBox.boxWithWidthHeightLengthChamferRadius(width, height, length, 0);
	geometry.firstMaterial = m;
	const node = SCNNode.nodeWithGeometry(geometry);
	node.position = vector(x, y, z);
	root.addChildNode(node);
	return node;
};
const segment = (
	root: SCNNode,
	a: number[],
	b: number[],
	width: number,
	height: number,
	m: SCNMaterial,
) => {
	const dx = b[0] - a[0],
		dz = b[1] - a[1];
	const length = Math.hypot(dx, dz);
	if (length < 0.01) return;
	const node = box(
		root,
		(a[0] + b[0]) / 2,
		height,
		(a[1] + b[1]) / 2,
		width,
		0.025,
		length + 0.1,
		m,
	);
	node.eulerAngles = vector(0, Math.atan2(dx, dz), 0);
};

export function createAustinCity() {
	const city = SCNNode.node();
	const roads = SCNNode.node(),
		buildings = SCNNode.node(),
		details = SCNNode.node();
	const pavement = material('#C7BFAF'),
		asphalt = material('#535A5C');
	const line = material('#EBE8D8'),
		yellow = material('#D8BB68');
	box(city, 0, -0.1, 0, 1800, 0.1, 1800, material('#A4AD9B'));
	for (const road of austin.roads) {
		for (let i = 1; i < road.points.length; i++) {
			segment(roads, road.points[i - 1], road.points[i], road.width + 8, 0, pavement);
		}
	}
	for (const road of austin.roads) {
		for (let i = 1; i < road.points.length; i++) {
			const a = road.points[i - 1],
				b = road.points[i];
			segment(roads, a, b, road.width, 0.04, asphalt);
			if (road.name !== 'Congress Avenue') continue;
			const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
			const dx = (b[0] - a[0]) / length,
				dz = (b[1] - a[1]) / length;
			for (const offset of [-0.16, 0.16]) {
				segment(
					roads,
					[a[0] - dz * offset, a[1] + dx * offset],
					[b[0] - dz * offset, b[1] + dx * offset],
					0.09,
					0.065,
					yellow,
				);
			}
			for (let d = 2; d < length - 4; d += 9) {
				for (const offset of [-6.2, -3.1, 3.1, 6.2]) {
					const start = [a[0] + dx * d - dz * offset, a[1] + dz * d + dx * offset];
					segment(roads, start, [start[0] + dx * 3.5, start[1] + dz * 3.5], 0.1, 0.07, line);
				}
			}
		}
	}

	const facadeColors = ['#B6B4AA', '#B8A48B', '#818F97', '#A09B8C', '#D2C8B3', '#8A6E60'];
	const facades = facadeColors.map((hex) => {
		const m = material(hex);
		// Windows follow geometry-local elevations, so they travel with the city.
		m.shaderModifiers = NSDictionary.dictionaryWithObjectForKey(
			`
#pragma body
float3 p = (scn_node.inverseModelViewTransform * float4(_surface.position, 1.0)).xyz;
float band = step(.21, fract(p.y / 3.6)) * step(fract(p.y / 3.6), .79);
float bay = step(.18, fract((p.x + p.z) / 2.8));
_surface.diffuse.rgb = mix(_surface.diffuse.rgb, float3(.19, .29, .34), band * bay * .72);
`,
			SCNShaderModifierEntryPointSurface,
		);
		return m;
	});
	for (const building of austin.buildings) {
		const path = UIBezierPath.bezierPath();
		building.points.forEach(([x, z], i) => {
			const point = CGPointMake(x, -z);
			if (i === 0) path.moveToPoint(point);
			else path.addLineToPoint(point);
		});
		path.closePath();
		const shape = SCNShape.shapeWithPathExtrusionDepth(path, building.height);
		shape.firstMaterial = facades[building.id % facades.length];
		const node = SCNNode.nodeWithGeometry(shape);
		node.position = vector(0, building.height / 2, 0);
		node.eulerAngles = vector(-Math.PI / 2, 0, 0);
		buildings.addChildNode(node);
	}

	const bark = material('#776757'),
		leaf = material('#537455'),
		metal = material('#444C4B');
	const signMaterial = material('#315C4D');
	const intersections: [number, number, string][] = [
		[30.2643199, -97.7442121, '2ND ST'],
		[30.2652726, -97.7438534, '3RD ST'],
		[30.266203, -97.7435056, '4TH ST'],
		[30.2671385, -97.7431556, '5TH ST'],
	];
	for (const [latitude, longitude, name] of intersections) {
		const point = toLocal(latitude, longitude);
		const heading = 0.312;
		const right = [Math.cos(heading), Math.sin(heading)];
		const forward = [Math.sin(heading), -Math.cos(heading)];
		for (const approach of [-9, 9])
			for (let across = -8; across <= 8; across += 1.35) {
				const x = point.x + right[0] * across + forward[0] * approach;
				const z = point.z + right[1] * across + forward[1] * approach;
				const stripe = box(roads, x, 0.09, z, 0.6, 0.02, 2.8, line);
				stripe.eulerAngles = vector(0, -heading, 0);
			}
		const x = point.x + right[0] * 11.5,
			z = point.z + right[1] * 11.5;
		box(details, x, 2.8, z, 0.12, 5.6, 0.12, metal);
		const sign = SCNNode.node();
		sign.position = vector(x, 5.1, z);
		sign.eulerAngles = vector(0, -heading, 0);
		details.addChildNode(sign);
		box(sign, 0, 0, 0, 3.8, 0.7, 0.06, signMaterial);
		const text = SCNText.textWithStringExtrusionDepth(name, 0.005);
		text.font = UIFont.boldSystemFontOfSize(0.45);
		text.flatness = 0.2;
		text.firstMaterial = line;
		const label = SCNNode.nodeWithGeometry(text);
		label.position = vector(-1.4, -0.2, 0.04);
		sign.addChildNode(label);
	}
	// Decorative trees and lamps are deliberately separate from surveyed footprints.
	for (const road of austin.roads.filter((r) => r.name === 'Congress Avenue')) {
		for (let i = 1; i < road.points.length; i++) {
			const a = road.points[i - 1],
				b = road.points[i];
			const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
			const dx = (b[0] - a[0]) / length,
				dz = (b[1] - a[1]) / length;
			for (let d = 12; d < length - 10; d += 24) {
				for (const sign of [-1, 1]) {
					const offset = (road.width / 2 + 2) * sign;
					const x = a[0] + dx * d - dz * offset,
						z = a[1] + dz * d + dx * offset;
					box(details, x, 1.6, z, 0.25, 3.2, 0.25, bark);
					const sphere = SCNSphere.sphereWithRadius(2.1);
					sphere.segmentCount = 8;
					sphere.firstMaterial = leaf;
					const crown = SCNNode.nodeWithGeometry(sphere);
					crown.position = vector(x, 4, z);
					crown.scale = vector(1, 0.8, 1);
					details.addChildNode(crown);
					box(details, x + dx * 8, 3.2, z + dz * 8, 0.12, 6.4, 0.12, metal);
					box(details, x + dx * 8, 6.4, z + dz * 8, 0.7, 0.15, 0.4, line);
				}
			}
		}
	}
	// Flatten static groups once; no per-frame geometry work or building nodes to animate.
	city.addChildNode(roads.flattenedClone());
	city.addChildNode(buildings.flattenedClone());
	city.addChildNode(details.flattenedClone());
	return city;
}
