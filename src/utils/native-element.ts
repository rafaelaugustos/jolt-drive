import type { View } from '@nativescript/core';
import type { NSVElement } from 'nativescript-vue';

/** A template element whose NativeScript view is known at the call site. */
export type NativeElement<T extends View = View> = Omit<NSVElement, 'nativeView'> & {
	readonly nativeView: T;
};
