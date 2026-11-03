import { Application, isIOS } from '@nativescript/core';

export const safeArea = () => {
	if (!isIOS) return { top: 24, bottom: 16 };
	const insets = (Application.ios.window as UIWindow | undefined)?.safeAreaInsets;
	return {
		top: insets && insets.top > 0 ? insets.top : 62,
		bottom: insets && insets.bottom > 0 ? insets.bottom : 34,
	};
};
