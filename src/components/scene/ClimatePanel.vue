<script lang="ts" setup>
import { shallowRef, nextTick, onUnmounted, ref, watch } from 'nativescript-vue';
import type { NativeElement } from '@/utils/native-element';
import { isIOS } from '@nativescript/core';
import { rollTo } from '@rafaelaugusto/jolt';
import { useMotionScope, useReducedMotion } from '@rafaelaugusto/jolt/vue';
import Icon from '@/components/Icon.vue';
import { palette, withAlpha } from '@/themes/palette';
import { curves, springs } from '@/themes/motion';

const props = defineProps<{ open: boolean; target: number; fan: number }>();
const emit = defineEmits<{ target: [value: number]; fan: [value: number]; close: [] }>();

const LEVELS = [1, 2, 3, 4, 5];
const BAR = { width: 7, gap: 5, base: 8, step: 5 };

const motion = useMotionScope();
const reduced = useReducedMotion();
const panel = shallowRef<NativeElement>();
const temperature = shallowRef<NativeElement>();
const ventilation = shallowRef<NativeElement>();
const present = ref(false);
const degrees = shallowRef<NativeElement>();
const bars: NativeElement[] = [];
let revision = 0;

const paintBars = (duration: number) =>
	LEVELS.forEach((level, i) =>
		motion.animate(
			bars[i],
			{
				backgroundColor: level <= props.fan ? palette.sky : withAlpha(palette.text, 0.14),
				scaleY: level <= props.fan ? 1 : 0.6,
			},
			{ duration, ease: curves.glide, delay: duration ? i * 40 : 0 },
		),
	);

watch(
	() => props.open,
	async (open) => {
		const run = ++revision;
		if (!open) {
			await motion.animate(
				panel.value!,
				{ y: 60 },
				{ duration: reduced.value ? 0 : 260, ease: 'quadIn' },
			).finished;
			if (run === revision) present.value = false;
			return;
		}
		present.value = true;
		await nextTick();
		if (run !== revision) return;
		// Glass and its ancestors stay opaque so UIKit can sample the cabin behind it.
		const transition = reduced.value ? { duration: 0 } : springs.soft;
		motion.animate(panel.value!, { y: [60, 0] }, transition);
		motion.animate(temperature.value!, { x: [-14, 0] }, transition);
		motion.animate(ventilation.value!, { x: [14, 0] }, transition);
		motion.add(
			rollTo(degrees.value!, props.target, {
				duration: reduced.value ? 1 : 900,
				format: (v) => `${Math.round(v)}°`,
			}),
		);
		paintBars(reduced.value ? 0 : 420);
	},
);

watch(
	() => props.target,
	(value) => {
		if (present.value)
			motion.add(
				rollTo(degrees.value!, value, {
					duration: reduced.value ? 1 : 320,
					format: (v) => `${Math.round(v)}°`,
				}),
			);
	},
);

watch(
	() => props.fan,
	() => {
		if (present.value) paintBars(reduced.value ? 0 : 220);
	},
);

onUnmounted(() => {
	revision++;
});
const nudge = (delta: number) => emit('target', Math.min(28, Math.max(16, props.target + delta)));
</script>

<template>
	<GlassContainer
		ref="panel"
		columns="*, 12, 120"
		glassSpacing="20"
		class="panel"
		verticalAlignment="bottom"
		:visibility="present ? 'visible' : 'hidden'"
		translateY="60"
		:isUserInteractionEnabled="open"
	>
		<GlassView
			ref="temperature"
			columns="44, *, 44"
			height="58"
			padding="0 8"
			glassRadius="24"
			glassTint="rgba(12,24,32,.55)"
			:backgroundColor="isIOS ? undefined : '#14222C'"
			:borderRadius="isIOS ? 0 : 24"
		>
			<GridLayout
				col="0"
				class="step"
				accessible="true"
				accessibilityRole="button"
				accessibilityLabel="Lower cabin temperature"
				v-press
				@tap="nudge(-1)"
			>
				<Icon name="remove" :size="18" />
			</GridLayout>
			<Label ref="degrees" col="1" :text="`${target}°`" class="degrees display-light" />
			<GridLayout
				col="2"
				class="step"
				accessible="true"
				accessibilityRole="button"
				accessibilityLabel="Raise cabin temperature"
				v-press
				@tap="nudge(1)"
			>
				<Icon name="add" :size="18" />
			</GridLayout>
		</GlassView>
		<GlassView
			ref="ventilation"
			col="2"
			height="58"
			glassRadius="24"
			glassTint="rgba(12,24,32,.55)"
			glassInteractive="true"
			:backgroundColor="isIOS ? undefined : '#14222C'"
			:borderRadius="isIOS ? 0 : 24"
			accessible="true"
			accessibilityRole="button"
			:accessibilityLabel="`Fan speed ${fan}`"
			@tap="emit('fan', (fan % LEVELS.length) + 1)"
		>
			<StackLayout
				orientation="horizontal"
				class="fan"
				horizontalAlignment="center"
				verticalAlignment="middle"
			>
				<Icon name="snow-outline" :size="18" :color="palette.sky" class="fan-icon" />
				<StackLayout orientation="horizontal" verticalAlignment="bottom" class="bars">
					<ContentView
						v-for="(level, i) in LEVELS"
						:key="level"
						:ref="
							(el: unknown) => {
								if (el) bars[i] = el as NativeElement;
							}
						"
						:width="BAR.width"
						:height="BAR.base + BAR.step * i"
						:marginLeft="i ? BAR.gap : 0"
						:borderRadius="BAR.width / 2"
						originY="1"
						verticalAlignment="bottom"
					/>
				</StackLayout>
			</StackLayout>
		</GlassView>
	</GlassContainer>
</template>

<style scoped>
.panel {
	margin: 0 20 14 20;
}

.step {
	width: 44;
	height: 44;
	border-radius: 22;
}

.degrees {
	font-size: 30;
	color: #eaf2f8;
	vertical-align: middle;
	text-align: center;
}

.fan {
	padding: 4 0;
}

.fan-icon {
	margin-right: 10;
}

.bars {
	height: 30;
	padding-bottom: 3;
}
</style>
