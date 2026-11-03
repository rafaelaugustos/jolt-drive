import { View } from '@nativescript/core';
import { motionScope, type DerivedValue } from '@rafaelaugusto/jolt';
import { mapKitCamera, mapKitCoordinate } from '@rafaelaugusto/jolt/native';
import { driveFrame } from './austin-route';
import { createDisposables } from '@/utils/disposables';

@NativeClass()
class RouteDelegate extends NSObject implements MKMapViewDelegate {
	static ObjCProtocols = [MKMapViewDelegate];
	mapViewRendererForOverlay(_map: MKMapView, overlay: MKOverlay): MKOverlayRenderer {
		const renderer = MKPolylineRenderer.alloc().initWithPolyline(overlay as MKPolyline);
		renderer.strokeColor = UIColor.colorWithRedGreenBlueAlpha(0.23, 0.65, 0.4, 1);
		renderer.lineWidth = 5;
		return renderer;
	}
	mapViewViewForAnnotation(_map: MKMapView, annotation: MKAnnotation): MKAnnotationView {
		const view = MKMarkerAnnotationView.alloc().initWithAnnotationReuseIdentifier(annotation, null);
		view.glyphText = annotation.title === 'Your Tesla' ? 'T' : 'YOU';
		view.markerTintColor =
			annotation.title === 'Your Tesla'
				? UIColor.darkGrayColor
				: UIColor.colorWithRedGreenBlueAlpha(0.23, 0.65, 0.4, 1);
		view.canShowCallout = true;
		return view;
	}
}

export class RouteMap extends View {
	declare nativeViewProtected: MKMapView;
	private delegate?: RouteDelegate;
	private motion?: ReturnType<typeof motionScope>;
	private properties = createDisposables();
	createNativeView() {
		const map = MKMapView.alloc().initWithFrame(CGRectZero);
		map.showsBuildings = true;
		map.showsCompass = false;
		map.showsUserLocation = false;
		map.scrollEnabled = false;
		map.rotateEnabled = false;
		map.pitchEnabled = false;
		map.zoomEnabled = false;
		return map;
	}
	initNativeView() {
		super.initNativeView();
		const delegate = RouteDelegate.new() as RouteDelegate;
		this.delegate = delegate;
		this.nativeViewProtected.delegate = this.delegate;
	}
	connect(source: DerivedValue) {
		this.motion?.dispose();
		this.properties.dispose();
		const motion = (this.motion = motionScope());
		const map = this.nativeViewProtected;
		const points = new Float64Array(101 * 2);
		for (let i = 0; i <= 100; i++) {
			const p = driveFrame(i / 100);
			points[i * 2] = p.latitude;
			points[i * 2 + 1] = p.longitude;
		}
		map.addOverlayLevel(
			MKPolyline.polylineWithCoordinatesCount(points, 101),
			MKOverlayLevel.AboveLabels,
		);
		const pickup = MKPointAnnotation.new();
		const end = driveFrame(1);
		pickup.coordinate = new CLLocationCoordinate2D({
			latitude: end.latitude,
			longitude: end.longitude,
		});
		pickup.title = '5th & Congress';
		map.addAnnotation(pickup);
		const car = MKPointAnnotation.new();
		car.title = 'Your Tesla';
		const start = driveFrame(source.get());
		car.coordinate = new CLLocationCoordinate2D({
			latitude: start.latitude,
			longitude: start.longitude,
		});
		map.addAnnotation(car);
		const coordinate = this.properties.add(mapKitCoordinate(car));
		motion.use(() => coordinate.bind(source, driveFrame));
		const camera = this.properties.add(mapKitCamera(map));
		motion.use(() =>
			camera.bind(source, (value) => {
				const frame = driveFrame(value);
				return {
					latitude: frame.latitude,
					longitude: frame.longitude,
					altitude: 650,
					pitch: 35,
					heading: (frame.heading * 180) / Math.PI,
				};
			}),
		);
	}
	disposeNativeView() {
		this.motion?.dispose();
		this.properties.dispose();
		this.motion = undefined;
		this.nativeViewProtected.delegate = null;
		this.delegate = undefined;
		super.disposeNativeView();
	}
}
