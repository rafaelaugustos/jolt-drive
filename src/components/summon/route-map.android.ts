import { WebView } from '@nativescript/core';
import type { DerivedValue } from '@rafaelaugusto/jolt';
export class RouteMap extends WebView {
	connect(_source: DerivedValue) {
		this.src =
			'https://www.openstreetmap.org/export/embed.html?bbox=-97.7465%2C30.2625%2C-97.7405%2C30.2700&layer=mapnik&marker=30.2670367%2C-97.7431938';
	}
}
