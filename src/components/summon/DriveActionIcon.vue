<script lang="ts" setup>
import { onUnmounted, watch } from 'nativescript-vue';
import type { EventData, View } from '@nativescript/core';
import { shape, type Shape } from '@rafaelaugusto/jolt/shapes';
import { useMotionScope, useReducedMotion } from '@rafaelaugusto/jolt/vue';
import { springs } from '@/themes/motion';

type Mode = 'play' | 'pause' | 'done' | 'back';
const props = defineProps<{ mode: Mode }>();
const motion = useMotionScope();
const reduced = useReducedMotion();
// Matching two-contour topology lets the native renderer morph without JS frames.
const paths = {
	play: 'M28 18 L76 50 L76 50 L28 50 Z M28 50 L76 50 L76 50 L28 82 Z',
	pause: 'M26 20 L42 20 L42 80 L26 80 Z M58 20 L74 20 L74 80 L58 80 Z',
	back: 'M66 16 L44 50 L28 50 L50 16 Z M28 50 L44 50 L66 84 L50 84 Z',
};
let transport: Shape | undefined;
let arrival: Shape | undefined;
let transportView: View | undefined;
let arrivalView: View | undefined;

const update = (animate: boolean) => {
	const done = props.mode === 'done';
	const transition = animate && !reduced.value ? springs.snap : { duration: 0 };
	if (transport && !done)
		motion.add(transport.animate({ d: paths[props.mode as Exclude<Mode, 'done'>] }, transition));
	if (transportView)
		motion.animate(
			transportView,
			{ opacity: done ? 0 : 1 },
			{ duration: animate && !reduced.value ? 120 : 0 },
		);
	if (arrivalView) motion.animate(arrivalView, { opacity: done ? 1 : 0 }, { duration: 0 });
	if (arrival) {
		arrival.set({ strokeEnd: 0 });
		if (done)
			motion.add(
				arrival.animate(
					{ strokeEnd: 1 },
					{ duration: animate && !reduced.value ? 480 : 0, ease: 'easeInOut' },
				),
			);
	}
};
const layout = (event: EventData, kind: 'transport' | 'arrival') => {
	const view = event.object as View;
	if (view.getActualSize().width <= 0) return;
	if (kind === 'transport' && !transport) {
		transportView = view;
		transport = shape(view, {
			d: paths.play,
			viewBox: [0, 0, 100, 100],
			fill: '#17230E',
			stroke: 'transparent',
		});
	} else if (kind === 'arrival' && !arrival) {
		arrivalView = view;
		arrival = shape(view, {
			d: 'M22 51 L43 71 L79 28',
			viewBox: [0, 0, 100, 100],
			fill: 'transparent',
			stroke: '#17230E',
			strokeWidth: 8,
			lineCap: 'round',
			lineJoin: 'round',
			strokeEnd: 0,
		});
	} else return;
	update(false);
};
watch(
	() => props.mode,
	() => update(true),
);
onUnmounted(() => {
	transport?.dispose();
	arrival?.dispose();
});
</script>

<template>
	<GridLayout width="24" height="24" isUserInteractionEnabled="false" accessibilityHidden="true">
		<GridLayout @layoutChanged="layout($event, 'transport')" />
		<GridLayout @layoutChanged="layout($event, 'arrival')" opacity="0" />
	</GridLayout>
</template>
