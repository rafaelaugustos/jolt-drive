<script lang="ts" setup>
import { shallowRef, computed, watch } from 'nativescript-vue';
import type { NativeElement } from '@/utils/native-element';
import { Screen, type View } from '@nativescript/core';
import { animateText, rollTo, type GradientOptions } from '@rafaelaugusto/jolt';
import { useMotionScope, useReducedMotion } from '@rafaelaugusto/jolt/vue';
import Icon from '@/components/Icon.vue';
import { palette } from '@/themes/palette';
import { curves, springs } from '@/themes/motion';

const props = defineProps<{
	top: number;
	locked: boolean;
	charging: boolean;
	climate: boolean;
	level: number;
	range: number;
	accent: string;
	busy: boolean;
	active: boolean;
}>();
const emit = defineEmits<{ replay: []; map: [source: View] }>();
const motion = useMotionScope();
const compact = Screen.mainScreen.heightDIPs < 760;
const reduced = useReducedMotion();
const brand = shallowRef<NativeElement>();
const title = shallowRef<NativeElement>();
const subtitle = shallowRef<NativeElement>();
const status = shallowRef<NativeElement>();
const miles = shallowRef<NativeElement>();
const rangeGroup = shallowRef<NativeElement>();
const energy = shallowRef<NativeElement>();
const percent = shallowRef<NativeElement>();
const replay = shallowRef<NativeElement>();
const segments: NativeElement[] = [];
let shown = false;
const summary = computed(() =>
	props.charging
		? 'Taking a power nap.'
		: props.climate
			? 'Your comfort zone.'
			: props.locked
				? 'Ready when you are.'
				: 'Go on. Make an entrance.',
);
const fill = computed<GradientOptions>(() => ({
	type: 'linear',
	angle: 90,
	colors: [props.accent, palette.volt],
}));

const show = (duration: number) => {
	motion.add(rollTo(miles.value!, props.range, { duration: Math.max(1, duration), stagger: 45 }));
	motion.add(
		rollTo(percent.value!, props.level, {
			duration: Math.max(1, duration),
			format: (v) => `${v}%`,
		}),
	);
	segments.forEach((segment, i) =>
		motion.animate(
			segment,
			{
				opacity: i < Math.round(props.level / 5) ? 1 : 0.12,
				scaleY: i < Math.round(props.level / 5) ? 1 : 0.55,
			},
			{ duration: reduced.value ? 0 : 450, delay: reduced.value ? 0 : i * 22, ease: curves.glide },
		),
	);
};

const enter = () => {
	shown = true;
	motion.sequence([
		[brand.value!, { opacity: [0, 1], y: [-12, 0] }, { duration: 550, ease: curves.glide }],
		[title.value!, { opacity: [0, 1], y: [24, 0] }, { at: 100, duration: 850, ease: curves.glide }],
		[
			[subtitle.value!, status.value!],
			{ opacity: [0, 1], y: [12, 0] },
			{ at: 320, duration: 650, stagger: 90, ease: curves.glide },
		],
		[
			[rangeGroup.value!, energy.value!],
			{ opacity: [0, 1], y: [18, 0] },
			{ at: 500, duration: 750, stagger: 70, ease: curves.glide },
		],
		[
			replay.value!,
			{ opacity: [0, 1], scale: [0.5, 1], rotate: [-60, 0] },
			{ at: 680, ...springs.settle },
		],
	]);
	if (!reduced.value)
		motion.add(animateText(title.value!, { by: 'letter', duration: 900, stagger: 80, y: 22 }));
	show(reduced.value ? 1 : 1200);
};
watch(
	() => [props.level, props.range],
	() => shown && props.active && !motion.suspended && show(reduced.value ? 1 : 520),
);
watch(
	() => props.active,
	(active) => {
		if (active) {
			motion.resume();
			if (shown) show(1);
		} else motion.suspend();
	},
);
defineExpose({ enter });
</script>

<template>
	<StackLayout
		class="hero"
		:class="{ compact }"
		:paddingTop="top + 4"
		isPassThroughParentEnabled="true"
	>
		<GridLayout ref="brand" columns="auto, *, auto" opacity="0" height="30">
			<StackLayout orientation="horizontal" verticalAlignment="middle">
				<Image src="res://jolt_mark" width="14" height="18" />
				<Label text="JOLT DRIVE / GARAGE" class="brand body-strong" />
			</StackLayout>
			<StackLayout
				col="2"
				orientation="horizontal"
				class="connected"
				verticalAlignment="middle"
				accessible="true"
				accessibilityRole="button"
				accessibilityLabel="Open Come to me cabin view"
				:isEnabled="!busy"
				v-press="[{ scale: 0.92 }, { ...springs.snap, haptic: 'light' }]"
				@tap="emit('map', $event.object)"
			>
				<Icon name="navigate-outline" :size="12" :color="accent" />
				<Label text="COME TO ME" class="connected-copy body-strong" :color="accent" />
			</StackLayout>
		</GridLayout>
		<GridLayout columns="*, auto" rows="auto, auto" marginTop="12">
			<Label ref="title" text="Tesla" class="title display" opacity="0" />
			<GridLayout
				ref="replay"
				col="1"
				rowSpan="2"
				class="replay"
				opacity="0"
				verticalAlignment="middle"
				accessible="true"
				accessibilityRole="button"
				accessibilityLabel="Replay the car entrance"
				:isEnabled="!busy"
				v-press="[
					{ scale: 0.86, rotate: -12 },
					{ ...springs.settle, haptic: 'light' },
				]"
				@tap="emit('replay')"
			>
				<Icon name="sparkles" :size="23" :color="accent" />
			</GridLayout>
			<Label
				ref="subtitle"
				row="1"
				text="ALL ELECTRIC. ALL YOURS."
				class="eyebrow body-strong"
				opacity="0"
			/>
		</GridLayout>
		<GridLayout ref="status" marginTop="12" opacity="0" height="23">
			<Label
				:key="summary"
				:text="summary"
				class="status body"
				v-animate="[{ opacity: [0, 1], y: [5, 0] }, { duration: 350 }]"
			/>
		</GridLayout>
		<GridLayout columns="*, auto" height="52" marginTop="19">
			<StackLayout ref="rangeGroup" orientation="horizontal" opacity="0">
				<Label ref="miles" text="312" class="miles display-light" />
				<StackLayout class="range-unit" verticalAlignment="middle">
					<Label text="mi" class="unit body-medium" />
					<Label text="TO ANYWHERE" class="range-caption body-strong" />
				</StackLayout>
			</StackLayout>
			<StackLayout ref="energy" col="1" verticalAlignment="middle" opacity="0">
				<StackLayout orientation="horizontal" horizontalAlignment="right">
					<Icon
						:name="charging ? 'flash' : 'flash-outline'"
						:size="13"
						:color="accent"
						marginRight="4"
					/>
					<Label ref="percent" text="78%" class="percent body-strong" />
				</StackLayout>
				<StackLayout orientation="horizontal" marginTop="8">
					<GridLayout
						v-for="i in 20"
						:key="i"
						:ref="
							(el: unknown) => {
								if (el) segments[i - 1] = el as NativeElement;
							}
						"
						width="3"
						height="13"
						marginLeft="2"
						borderRadius="1.5"
						v-gradient="[fill, { duration: 800 }]"
					/>
				</StackLayout>
			</StackLayout>
		</GridLayout>
	</StackLayout>
</template>

<style scoped>
.hero {
	padding-left: 26;
	padding-right: 26;
}
.brand {
	margin-left: 8;
	font-size: 10;
	letter-spacing: 0.18;
	color: #a0aaa8;
	vertical-align: middle;
}
.connected {
	padding: 7 9;
	border-radius: 12;
	background-color: rgba(213, 255, 98, 0.06);
}
.connected-copy {
	margin-left: 5;
	font-size: 8;
	letter-spacing: 0.08;
	color: #b2beb1;
}
.title {
	font-size: 76;
	letter-spacing: -0.05;
	color: #f3f7ed;
}
.eyebrow {
	font-size: 9;
	letter-spacing: 0.2;
	color: #8e9b99;
	margin-top: -4;
}
.replay {
	width: 48;
	height: 48;
	border-radius: 24;
	border-width: 1;
	border-color: rgba(213, 255, 98, 0.22);
	background-color: rgba(213, 255, 98, 0.06);
}
.status {
	color: #b4bebc;
	font-size: 14;
}
.miles {
	font-size: 40;
	color: #f3f7ed;
	letter-spacing: -0.04;
}
.range-unit {
	margin-left: 9;
}
.unit {
	font-size: 14;
	color: #d5dfd7;
}
.range-caption {
	margin-top: 3;
	font-size: 6.5;
	letter-spacing: 0.13;
	color: #788780;
}
.percent {
	font-size: 14;
	color: #eff6e9;
}
.compact .title {
	font-size: 56;
}
.compact .status {
	font-size: 12;
}
.compact .miles {
	font-size: 34;
}
</style>
