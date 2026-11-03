<script lang="ts" setup>
import { shallowRef, computed, watch } from 'nativescript-vue';
import type { NativeElement } from '@/utils/native-element';
import type { GradientOptions } from '@rafaelaugusto/jolt';
import { useMotionScope, useReducedMotion } from '@rafaelaugusto/jolt/vue';
import Icon, { type IconName } from '@/components/Icon.vue';
import { palette, withAlpha } from '@/themes/palette';
import { springs } from '@/themes/motion';

const props = defineProps<{ icon: IconName; label: string; active: boolean; tone: string }>();
const emit = defineEmits<{ tap: [] }>();
const motion = useMotionScope();
const reduced = useReducedMotion();
const sweep = shallowRef<NativeElement>();
const glyph = shallowRef<NativeElement>();
const ring = shallowRef<NativeElement>();
const SWEEP = computed<GradientOptions>(() => ({
	type: 'conic',
	colors: [
		withAlpha(props.tone, 0),
		withAlpha(props.tone, 0),
		props.tone,
		withAlpha(props.tone, 0),
	],
	stops: [0, 0.65, 0.93, 1],
}));
const face = computed<GradientOptions>(() => ({
	type: 'linear',
	angle: 145,
	colors: props.active
		? [props.tone, withAlpha(props.tone, 0.75)]
		: [withAlpha(props.tone, 0.1), withAlpha(props.tone, 0.025)],
}));
const react = () => {
	if (reduced.value) return;
	motion.animate(
		glyph.value!,
		{ scale: [1, 0.65, 1.15, 1], rotate: [0, -14, 8, 0] },
		{ duration: 520, haptic: 'light' },
	);
	motion.animate(
		sweep.value!,
		{ opacity: [0, 1, 0], rotate: [0, 360] },
		{ duration: 900, ease: 'cubicOut' },
	);
	motion.animate(
		ring.value!,
		{ scale: [0.9, 1.35], opacity: [0.5, 0] },
		{ duration: 650, ease: 'quadOut' },
	);
};
watch(() => props.active, react);
</script>

<template>
	<StackLayout
		class="action"
		accessible="true"
		accessibilityRole="button"
		:accessibilityLabel="label"
		v-press="[{ scale: 0.9 }, springs.settle]"
		@tap="emit('tap')"
	>
		<GridLayout width="66" height="66" horizontalAlignment="center">
			<GridLayout
				ref="ring"
				width="66"
				height="66"
				borderRadius="23"
				borderWidth="1"
				:borderColor="tone"
				opacity="0"
				isUserInteractionEnabled="false"
			/>
			<GridLayout
				ref="sweep"
				width="70"
				height="70"
				borderRadius="24"
				opacity="0"
				v-gradient="SWEEP"
				isUserInteractionEnabled="false"
			/>
			<GridLayout width="64" height="64" borderRadius="22" backgroundColor="#101712">
				<GridLayout
					borderRadius="22"
					borderWidth="1"
					:borderColor="withAlpha(tone, active ? 0.65 : 0.14)"
					v-gradient="[face, { duration: 420 }]"
				>
					<GridLayout ref="glyph"
						><Icon :name="icon" :size="25" :color="active ? palette.ink : tone"
					/></GridLayout>
				</GridLayout>
			</GridLayout>
		</GridLayout>
		<Label :text="label" class="label body-medium" :color="active ? tone : '#abb6af'" />
	</StackLayout>
</template>

<style scoped>
.label {
	margin-top: 9;
	font-size: 11;
	text-align: center;
}
</style>
