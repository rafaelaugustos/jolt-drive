export const vector = (x: number, y: number, z: number) => new SCNVector3({ x, y, z });

export const color = (hex: string, alpha = 1) => {
	const value = parseInt(hex.slice(1), 16);
	return UIColor.colorWithRedGreenBlueAlpha(
		((value >> 16) & 255) / 255,
		((value >> 8) & 255) / 255,
		(value & 255) / 255,
		alpha,
	);
};

export const extent = (node: SCNNode, space: SCNNode | null = null) => {
	const min = new interop.Reference(SCNVector3, vector(0, 0, 0));
	const max = new interop.Reference(SCNVector3, vector(0, 0, 0));
	node.getBoundingBoxMinMax(min, max);
	const low = node.convertPositionToNode(min.value, space);
	const high = node.convertPositionToNode(max.value, space);
	return {
		center: { x: (low.x + high.x) / 2, y: (low.y + high.y) / 2, z: (low.z + high.z) / 2 },
		low: { x: Math.min(low.x, high.x), y: Math.min(low.y, high.y), z: Math.min(low.z, high.z) },
		high: { x: Math.max(low.x, high.x), y: Math.max(low.y, high.y), z: Math.max(low.z, high.z) },
	};
};

export const find = (root: SCNNode, prefix: string) => {
	const found: SCNNode[] = [];
	root.enumerateHierarchyUsingBlock((node: SCNNode) => {
		if (node.name?.startsWith(prefix)) found.push(node);
	});
	return found;
};
