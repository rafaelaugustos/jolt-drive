<script lang="ts" setup>
import { shallowRef, computed, onMounted, watch } from 'nativescript-vue';
import type { NativeElement } from '@/utils/native-element';
import type { DerivedValue, GradientOptions } from '@rafaelaugusto/jolt';
import { useMotionScope, useReducedMotion } from '@rafaelaugusto/jolt/vue';
import { withAlpha } from '@/themes/palette';

const props = defineProps<{
	accent: string;
	secondary: string;
	progress: DerivedValue;
	active: boolean;
}>();
const motion = useMotionScope();
const reduced = useReducedMotion();
const glow = shallowRef<NativeElement>();
const halo = shallowRef<NativeElement>();
const wash = (color: string, strength: number): GradientOptions => ({
	type: 'radial',
	colors: [withAlpha(color, strength), withAlpha(color, 0)],
	radius: 0.5,
});
// Stable derived values let the gradients follow the same drag as the camera.
const topCenter = {
	x: props.progress.to([0, 1], [0.5, 0.76]),
	y: props.progress.to([0, 1], [0.5, 0.78]),
};
const bottomCenter = {
	x: props.progress.to([0, 1], [0.5, 0.25]),
	y: props.progress.to([0, 1], [0.5, 0.3]),
};
const topRadius = props.progress.to([0, 1], [0.5, 0.72]);
const bottomRadius = props.progress.to([0, 1], [0.5, 0.65]);
const top = computed<GradientOptions>(() => ({
	...wash(props.accent, 0.16),
	center: topCenter,
	radius: topRadius,
}));
const bottom = computed<GradientOptions>(() => ({
	...wash(props.secondary, 0.12),
	center: bottomCenter,
	radius: bottomRadius,
}));

const breathe = () => {
	motion.reset();
	if (reduced.value || !props.active) return;
	motion.resume();
	motion.animate(
		glow.value!,
		{ x: [-30, 20], y: [-10, 20], scale: [1, 1.12] },
		{ duration: 7500, repeat: Infinity, repeatType: 'reverse', ease: 'sineInOut' },
	);
	motion.animate(
		halo.value!,
		{ x: [25, -20], opacity: [0.5, 1] },
		{ duration: 6200, repeat: Infinity, repeatType: 'reverse', ease: 'sineInOut' },
	);
};
onMounted(breathe);
watch(reduced, breathe);
watch(
	() => props.active,
	(active) => {
		if (active) {
			motion.resume();
			if (!motion.size) breathe();
		} else motion.suspend();
	},
);
</script>

<template>
	<GridLayout isUserInteractionEnabled="false" iosOverflowSafeArea="true">
		<GridLayout
			ref="glow"
			width="420"
			height="360"
			horizontalAlignment="left"
			verticalAlignment="top"
			marginLeft="-120"
			marginTop="-80"
			v-gradient="[top, { duration: 1100 }]"
		/>
		<GridLayout
			ref="halo"
			width="360"
			height="280"
			horizontalAlignment="right"
			verticalAlignment="top"
			marginRight="-160"
			v-gradient="[bottom, { duration: 1100 }]"
		/>
	</GridLayout>
</template>
