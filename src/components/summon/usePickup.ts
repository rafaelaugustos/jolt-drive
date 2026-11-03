import { Application } from '@nativescript/core';
import { computed, onMounted, onUnmounted, ref, watch } from 'nativescript-vue';
import { onPageDeactivated } from 'vue-router-ns';
import { set, type PlaybackAnimation } from '@rafaelaugusto/jolt';
import { useMotionScope, useMotionValue, useReducedMotion } from '@rafaelaugusto/jolt/vue';
import { driveFrame, DRIVE_SECONDS, ROUTE_METERS } from './austin-route';

interface PickupOptions {
	charging(): boolean;
	ready(): boolean;
	render(): void;
	close(arrived: boolean): void;
}

export function usePickup(options: PickupOptions) {
	type Phase = 'idle' | 'moving' | 'paused' | 'arrived' | 'cancelled';
	const phase = ref<Phase>('idle');
	const motion = useMotionScope();
	const reduced = useReducedMotion();
	const progress = useMotionValue(0);
	const remaining = ref(Math.ceil(ROUTE_METERS));
	const seconds = ref(DRIVE_SECONDS);
	const speed = ref(0);
	const active = computed(() => phase.value === 'moving' || phase.value === 'paused');
	let journey: PlaybackAnimation | undefined;
	let revision = 0;
	let disposed = false;
	const telemetry = (value: number) => {
		const frame = driveFrame(value);
		remaining.value = Math.ceil(ROUTE_METERS - frame.distance);
		seconds.value = Math.ceil(DRIVE_SECONDS * (1 - Math.max(0, Math.min(1, value))));
		speed.value = phase.value === 'moving' ? Math.round(frame.mph) : 0;
	};
	const pause = () => {
		if (phase.value !== 'moving') return;
		journey?.pause();
		phase.value = 'paused';
		telemetry(progress.get());
		options.render();
	};
	const cancel = () => {
		revision++;
		journey?.stop();
		journey = undefined;
		phase.value = 'cancelled';
		telemetry(progress.get());
		options.render();
	};
	const close = () => options.close(phase.value === 'arrived');
	const start = async () => {
		if (!options.ready() || active.value || disposed || options.charging()) return;
		const run = ++revision;
		set(progress, 0);
		phase.value = 'moving';
		options.render();
		journey = motion.animate(progress, 1, {
			duration: reduced.value ? 0 : DRIVE_SECONDS * 1000,
			ease: 'linear',
		});
		const completed = await journey.finished;
		if (!completed || run !== revision || disposed) return;
		phase.value = 'arrived';
		telemetry(1);
		options.render();
	};
	const act = () => {
		if (options.charging() || phase.value === 'arrived') return close();
		if (phase.value === 'moving') return pause();
		if (phase.value === 'paused') {
			phase.value = 'moving';
			journey?.play();
			options.render();
			return;
		}
		void start();
	};
	watch(reduced, (on) => {
		if (on) pause();
	});
	onPageDeactivated(pause);
	onMounted(() => {
		motion.use(() => progress.subscribe(telemetry));
		Application.on(Application.suspendEvent, pause);
	});
	onUnmounted(() => {
		disposed = true;
		revision++;
		journey?.stop();
		Application.off(Application.suspendEvent, pause);
	});
	return { phase, active, progress, remaining, seconds, speed, act, cancel, close };
}
