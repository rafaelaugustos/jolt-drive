<script lang="ts" setup>
import { shallowRef, onMounted, onUnmounted } from 'nativescript-vue';
import type { NativeElement } from '@/utils/native-element';
import { useRouter } from 'vue-router-ns';
import { seekableTimeline, type GradientOptions } from '@rafaelaugusto/jolt';
import { useMotionScope, useReducedMotion } from '@rafaelaugusto/jolt/vue';
import { palette, withAlpha } from '@/themes/palette';
import { curves } from '@/themes/motion';
import { finishOpening } from '@/utils/opening';

const emit = defineEmits<{ done: [] }>();
const motion = useMotionScope();
const reduced = useReducedMotion();
const router = useRouter();
const backdrop = shallowRef<NativeElement>();
const stage = shallowRef<NativeElement>();
const halo = shallowRef<NativeElement>();
const mark = shallowRef<NativeElement>();
const word = shallowRef<NativeElement>();
const drive = shallowRef<NativeElement>();
const tagline = shallowRef<NativeElement>();
const line = shallowRef<NativeElement>();
const roadLeft = shallowRef<NativeElement>();
const roadRight = shallowRef<NativeElement>();
let timer: ReturnType<typeof setTimeout> | undefined;
let disposed = false;

const glow: GradientOptions = {
	type: 'radial',
	radius: 0.5,
	colors: [
		withAlpha(palette.volt, 0.17),
		withAlpha(palette.acid, 0.035),
		withAlpha(palette.volt, 0),
	],
	stops: [0, 0.45, 1],
};
const road: GradientOptions = {
	type: 'linear',
	angle: 180,
	colors: [withAlpha(palette.acid, 0), withAlpha(palette.acid, 0.6), withAlpha(palette.volt, 0)],
};

const leave = async () => {
	await router.isReady();
	if (disposed) return;
	finishOpening();
	const duration = reduced.value ? 160 : 420;
	motion.animate(
		stage.value!,
		{ opacity: 0, scale: reduced.value ? 1 : 1.08 },
		{ duration, ease: curves.glide },
	);
	await motion.animate(backdrop.value!, { opacity: 0 }, { duration, delay: 80 });
	if (!disposed) emit('done');
};

const play = async () => {
	if (reduced.value) {
		await motion.animate(
			[mark.value!, word.value!, drive.value!, tagline.value!],
			{ opacity: 1 },
			{ duration: 160 },
		);
	} else {
		const opening = motion.add(
			seekableTimeline([
				{
					target: halo.value!,
					keyframes: { opacity: [0, 1], scale: [0.7, 1.1] },
					transition: { duration: 1700, ease: curves.glide },
				},
				{
					target: roadLeft.value!,
					keyframes: { opacity: [0, 0.65, 0], y: [180, -160] },
					transition: { duration: 1100, ease: 'cubicInOut' },
				},
				{
					target: roadRight.value!,
					keyframes: { opacity: [0, 0.65, 0], y: [220, -120] },
					at: 120,
					transition: { duration: 1100, ease: 'cubicInOut' },
				},
				{
					target: mark.value!,
					keyframes: { opacity: [0, 1], scale: [0.72, 1], y: [24, 0], rotate: [-8, 0] },
					at: 180,
					transition: { duration: 800, ease: curves.glide },
				},
				{
					target: word.value!,
					keyframes: { opacity: [0, 1], y: [24, 0] },
					at: 480,
					transition: { duration: 760, ease: curves.glide },
				},
				{
					target: drive.value!,
					keyframes: { opacity: [0, 1], y: [10, 0] },
					at: 700,
					transition: { duration: 700, ease: curves.glide },
				},
				{
					target: line.value!,
					keyframes: { opacity: [0, 1], scaleX: [0, 1] },
					at: 900,
					transition: { duration: 600, ease: curves.glide },
				},
				{
					target: tagline.value!,
					keyframes: { opacity: [0, 1], y: [6, 0] },
					at: 1100,
					transition: { duration: 500, ease: curves.glide },
				},
			]),
		);
		if (!(await opening.finished)) return;
	}
	if (!disposed) timer = setTimeout(leave, reduced.value ? 200 : 220);
};

onMounted(() => {
	timer = setTimeout(play, 60);
});
onUnmounted(() => {
	disposed = true;
	clearTimeout(timer);
});
</script>

<template>
	<GridLayout
		iosOverflowSafeArea="true"
		accessible="true"
		accessibilityRole="image"
		accessibilityLabel="Jolt Drive. All electric. All yours."
	>
		<ContentView ref="backdrop" class="backdrop" iosOverflowSafeArea="true" />
		<GridLayout ref="stage" iosOverflowSafeArea="true">
			<GridLayout ref="halo" width="460" height="580" opacity="0" v-gradient="glow" />
			<GridLayout
				ref="roadLeft"
				width="2"
				height="380"
				rotate="22"
				translateX="-82"
				opacity="0"
				v-gradient="road"
			/>
			<GridLayout
				ref="roadRight"
				width="2"
				height="380"
				rotate="22"
				translateX="82"
				opacity="0"
				v-gradient="road"
			/>
			<StackLayout verticalAlignment="middle" marginTop="-18">
				<Image
					ref="mark"
					src="res://drive_icon"
					width="164"
					height="164"
					borderRadius="38"
					opacity="0"
					horizontalAlignment="center"
				/>
				<Label ref="word" text="JOLT" class="word display" opacity="0" />
				<Label ref="drive" text="DRIVE" class="drive body-strong" opacity="0" />
				<ContentView
					ref="line"
					width="44"
					height="2"
					marginTop="27"
					backgroundColor="#D5FF62"
					opacity="0"
				/>
				<Label
					ref="tagline"
					text="ALL ELECTRIC. ALL YOURS."
					class="tagline body-medium"
					opacity="0"
				/>
			</StackLayout>
		</GridLayout>
	</GridLayout>
</template>

<style scoped>
.backdrop {
	background-color: #05070a;
}
.word {
	margin-top: 24;
	font-size: 58;
	letter-spacing: 0.2;
	color: #eaf2f8;
	text-align: center;
}
.drive {
	margin-top: -2;
	font-size: 13;
	letter-spacing: 0.65;
	color: #d5ff62;
	text-align: center;
}
.tagline {
	margin-top: 18;
	font-size: 9;
	letter-spacing: 0.16;
	color: #8e9c93;
	text-align: center;
}
</style>
