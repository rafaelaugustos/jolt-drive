import { View } from '@nativescript/core';

export class SceneView extends View {
	declare nativeViewProtected: SCNView;

	createNativeView() {
		const view = SCNView.alloc().initWithFrameOptions(CGRectZero, null);
		view.backgroundColor = UIColor.clearColor;
		view.antialiasingMode = SCNAntialiasingMode.Multisampling4X;
		view.preferredFramesPerSecond = 120;
		view.rendersContinuously = true;
		return view;
	}

	get sceneView() {
		return this.nativeViewProtected;
	}
}
