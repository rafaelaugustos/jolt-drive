import { austin } from './austin-data';
import { driveFrame } from './austin-route';
import { color } from '../scene/scene-kit.ios';

/** The original dashboard screen shows this route, instead of a frozen 0 MPH demo. */
export function createDriveDisplay(): UIImage {
	UIGraphicsBeginImageContextWithOptions(CGSizeMake(720, 450), true, 1);
	try {
		color('#0B151A').setFill();
		UIRectFill(CGRectMake(0, 0, 720, 450));
		const text = (label: string, x: number, y: number, size: number, hex: string) => {
			const attrs = NSDictionary.dictionaryWithObjectsForKeys(
				[UIFont.systemFontOfSizeWeight(size, UIFontWeightSemibold), color(hex)],
				[NSFontAttributeName, NSForegroundColorAttributeName],
			);
			NSAttributedString.alloc()
				.initWithStringAttributes(label, attrs)
				.drawAtPoint(CGPointMake(x, y));
		};
		text('Tesla', 24, 24, 28, '#F0F7F4');
		text('COME', 24, 105, 34, '#D5FF62');
		text('TO ME.', 24, 146, 34, '#D5FF62');
		text('CONGRESS AVE', 24, 238, 14, '#E3EBE3');
		text('Austin, Texas', 24, 265, 16, '#9FB4B5');
		text('3D SIMULATION', 24, 402, 11, '#718E90');
		const mapPoint = (x: number, z: number) =>
			CGPointMake(295 + (x + 180) * 1.02, 25 + (z + 200) * 0.92);
		const context = UIGraphicsGetCurrentContext();
		CGContextSaveGState(context);
		CGContextClipToRect(context, CGRectMake(275, 0, 445, 450));
		color('#243A42').setFill();
		for (const building of austin.buildings) {
			const path = UIBezierPath.bezierPath();
			building.points.forEach(([x, z], i) =>
				i ? path.addLineToPoint(mapPoint(x, z)) : path.moveToPoint(mapPoint(x, z)),
			);
			path.closePath();
			path.fill();
		}
		color('#4D6267').setStroke();
		for (const road of austin.roads) {
			const path = UIBezierPath.bezierPath();
			path.lineWidth = 3;
			road.points.forEach(([x, z], i) =>
				i ? path.addLineToPoint(mapPoint(x, z)) : path.moveToPoint(mapPoint(x, z)),
			);
			path.stroke();
		}
		color('#D5FF62').setStroke();
		const route = UIBezierPath.bezierPath();
		route.lineWidth = 6;
		for (let i = 0; i <= 50; i++) {
			const frame = driveFrame(i / 50);
			if (i) route.addLineToPoint(mapPoint(frame.x, frame.z));
			else route.moveToPoint(mapPoint(frame.x, frame.z));
		}
		route.stroke();
		const end = driveFrame(1),
			point = mapPoint(end.x, end.z);
		color('#D5FF62').setFill();
		UIBezierPath.bezierPathWithOvalInRect(CGRectMake(point.x - 7, point.y - 7, 14, 14)).fill();
		text('YOU · 5TH ST', point.x + 14, point.y - 8, 13, '#E4F5E3');
		CGContextRestoreGState(context);
		const image = UIGraphicsGetImageFromCurrentImageContext();
		if (!image) throw new Error('Unable to draw the Austin route display');
		return image;
	} finally {
		UIGraphicsEndImageContext();
	}
}
