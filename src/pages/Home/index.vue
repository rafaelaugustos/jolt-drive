<script lang="ts" setup>
import { shallowRef, computed, nextTick, onUnmounted, ref, watch } from 'nativescript-vue';
import type { NativeElement } from '@/utils/native-element';
import { Screen, type View } from '@nativescript/core';
import { onPageActivated, onPageDeactivated, useRouter } from 'vue-router-ns';
import {
	useBinding,
	useMotionScope,
	useMotionValue,
	useReducedMotion,
} from '@rafaelaugusto/jolt/vue';
import Car3D from '@/components/scene/Car3D.vue';
import Icon from '@/components/Icon.vue';
import { atmospheres } from '@/themes/palette';
import { useOpened } from '@/utils/opening';
import { safeArea } from '@/utils/safe-area';
import Atmosphere from './Atmosphere.vue';
import ControlSheet from './ControlSheet.vue';
import { useVehicle, type VehicleAction } from './useVehicle';
import HeroHeader from './HeroHeader.vue';
import EnergyPlan from './EnergyPlan.vue';

const PEEK = Screen.mainScreen.heightDIPs < 760 ? 174 : 192;
const insets = safeArea();
const screenHeight = Screen.mainScreen.heightDIPs;
const sheetHeight = Math.round(screenHeight * 0.76);
const closed = sheetHeight - (PEEK + insets.bottom);
const opened = useOpened();
const router = useRouter();
const motion = useMotionScope();
const reduced = useReducedMotion();
const offset = useMotionValue(sheetHeight);
const chargeGlow = useMotionValue(0);
const progress = offset.to([0, closed], [1, 0]);
const heroBinding = useBinding({
	opacity: progress.to([0, 0.45], [1, 0]),
	y: progress.to([0, 1], [0, -40]),
	scale: progress.to([0, 1], [1, 0.96]),
});
const dim = useBinding({ opacity: progress.to([0, 1], [0, 0.35]) });
const stage = useBinding({
	y: progress.to([0, 1], [0, -Math.round(screenHeight * 0.36)]),
});
const stageCaption = useBinding({
	opacity: progress.to([0, 0.16], [1, 0]),
	y: progress.to([0, 1], [0, -20]),
});
const noticePosition = useBinding({ y: progress.to([0, 1], [screenHeight * 0.34, 12]) });
const hero = shallowRef<InstanceType<typeof HeroHeader>>();
const content = shallowRef<NativeElement>();
const car = shallowRef<InstanceType<typeof Car3D>>();
const sheet = shallowRef<InstanceType<typeof ControlSheet>>();
const cue = shallowRef<NativeElement>();
const ready = ref(false);
const busy = ref(false);
const pageActive = ref(true);
const planOpen = ref(false);
const openingMap = ref(false);
const visualActive = computed(() => pageActive.value && !planOpen.value);
const mood = ref(0);
const atmosphere = computed(() => atmospheres[mood.value]);
const toast = ref('');
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
let entryTimer: ReturnType<typeof setTimeout> | undefined;
let entered = false;
let disposed = false;

const notify = (message: string) => {
	clearTimeout(noticeTimer);
	toast.value = message;
	noticeTimer = setTimeout(() => {
		toast.value = '';
	}, 2600);
};
const { state, level, range, chargeLimit, inside, target, charge, regulate, retarget, savePlan } =
	useVehicle({
		notify,
		charging: (active) => car.value!.charging(active),
	});
const enter = async () => {
	if (entered) return;
	entered = true;
	busy.value = true;
	hero.value!.enter();
	entryTimer = setTimeout(() => sheet.value?.enter(), reduced.value ? 0 : 700);
	await car.value!.introduce();
	if (disposed) return;
	busy.value = false;
	motion.animate(cue.value!, { opacity: [0, 1], y: [12, 0] }, { duration: 700 });
};
const replay = async () => {
	if (busy.value) return;
	busy.value = true;
	await sheet.value!.close();
	if (disposed) return;
	if (state.climate) {
		state.climate = false;
		regulate(false);
		await car.value!.leaveCabin();
	}
	if (disposed) return;
	notify('One more entrance. Just for you.');
	await car.value!.introduce();
	if (!disposed) busy.value = false;
};
const changeMood = (value: number) => {
	if (mood.value === value) return;
	mood.value = value;
	notify(atmospheres[value].caption);
};
const openMap = async (source: View) => {
	if (busy.value || openingMap.value) return;
	clearTimeout(noticeTimer);
	toast.value = '';
	openingMap.value = true;
	try {
		const arrived = await router.pushForResult<boolean>(
			{ name: 'summon' },
			{
				props: { accent: atmosphere.value.color, charging: state.charging },
				zoomFrom: source,
				transition: { name: 'slideLeft', duration: 380 },
			},
		);
		await nextTick();
		if (arrived && !disposed) {
			car.value!.flash();
			notify('Your ride has arrived. Let’s go somewhere.');
		}
	} catch (error) {
		console.error('Unable to open the summon cabin view', error);
		if (!disposed) notify('The cabin view could not open. Give it another try.');
	} finally {
		openingMap.value = false;
	}
};
const onAction = async (action: VehicleAction) => {
	if (busy.value) return;
	if (action === 'lock') {
		state.locked = !state.locked;
		car.value!.flash();
		notify(state.locked ? 'Tucked in. Locked up.' : 'Your next chapter is unlocked.');
	}
	if (action === 'climate') {
		busy.value = true;
		state.climate = !state.climate;
		regulate(state.climate);
		notify(state.climate ? 'Come on in. Get comfortable.' : 'Back to the big picture.');
		try {
			if (state.climate) {
				await sheet.value!.close();
				if (!disposed) await car.value!.enterCabin();
			} else await car.value!.leaveCabin();
		} finally {
			if (!disposed) busy.value = false;
		}
		return;
	}
	if (action === 'charge') {
		const on = !state.charging;
		charge(on);
		if (level.value < chargeLimit.value)
			notify(on ? 'Good energy, coming right up.' : 'Power nap paused.');
	}
	if (action === 'lights') {
		state.lights = !state.lights;
		car.value!.lightsOn(state.lights);
		notify(state.lights ? 'Hello, spotlight.' : 'A little mystery looks good on you.');
	}
	if (action === 'flash') {
		car.value!.flash();
		notify('There you are. Looking good.');
	}
};
watch(
	() => opened.value && ready.value && !!hero.value! && !!sheet.value!,
	(canEnter) => canEnter && enter(),
	{ flush: 'post', immediate: true },
);
onPageActivated(() => {
	pageActive.value = true;
});
onPageDeactivated(() => {
	pageActive.value = false;
	clearTimeout(noticeTimer);
	toast.value = '';
});
onUnmounted(() => {
	disposed = true;
	clearTimeout(noticeTimer);
	clearTimeout(entryTimer);
});
</script>

<template>
	<Page actionBarHidden="true">
		<GridLayout iosOverflowSafeArea="true" class="screen">
			<GridLayout
				ref="content"
				iosOverflowSafeArea="true"
				:isUserInteractionEnabled="!planOpen"
				:accessibilityHidden="!visualActive"
			>
				<Atmosphere
					:accent="atmosphere.color"
					:secondary="atmosphere.secondary"
					:progress="progress"
					:active="visualActive"
				/>
				<GridLayout :ref="stage" iosOverflowSafeArea="true" :accessibilityHidden="!visualActive">
					<Car3D
						ref="car"
						iosOverflowSafeArea="true"
						:target="target"
						:charge="chargeGlow"
						:framing="progress"
						:active="visualActive"
						:interactive="!busy && !state.climate && visualActive"
						:inset="PEEK + insets.bottom + 10"
						@ready="ready = true"
						@target="retarget"
					/>
				</GridLayout>
				<GridLayout :ref="dim" class="dim" opacity="0" isUserInteractionEnabled="false" />
				<GridLayout
					:ref="heroBinding"
					verticalAlignment="top"
					isPassThroughParentEnabled="true"
					:accessibilityHidden="!visualActive"
				>
					<HeroHeader
						ref="hero"
						:top="8"
						:locked="state.locked"
						:charging="state.charging"
						:climate="state.climate"
						:level="level"
						:range="range"
						:accent="atmosphere.color"
						:busy="busy || openingMap"
						:active="visualActive"
						@replay="replay"
						@map="openMap"
					/>
				</GridLayout>
				<GridLayout
					:ref="stageCaption"
					verticalAlignment="bottom"
					:marginBottom="PEEK + insets.bottom + 12"
					isUserInteractionEnabled="false"
					:accessibilityHidden="!visualActive"
				>
					<StackLayout
						ref="cue"
						opacity="0"
						orientation="horizontal"
						horizontalAlignment="center"
						:visibility="state.climate ? 'hidden' : 'visible'"
					>
						<Label text="↔" class="orbit-arrow" :color="atmosphere.color" />
						<Label text="360° / DRAG TO EXPLORE" class="orbit-copy body-strong" />
					</StackLayout>
				</GridLayout>

				<ControlSheet
					ref="sheet"
					:accessibilityHidden="!visualActive"
					:offset="offset"
					:progress="progress"
					:chargeGlow="chargeGlow"
					:height="sheetHeight"
					:closed="closed"
					:bottom="insets.bottom"
					:active="visualActive"
					:limit="chargeLimit"
					:locked="state.locked"
					:climate="state.climate"
					:charging="state.charging"
					:lights="state.lights"
					:level="level"
					:inside="inside"
					:outside="17"
					:target="target"
					:accent="atmosphere.color"
					:mood="mood"
					:busy="busy"
					@action="onAction"
					@target="retarget"
					@mood="changeMood"
					@plan="planOpen = true"
				/>
				<!-- Intercept touches without cancelling the panel's programmatic spring. -->
				<ContentView v-if="busy" backgroundColor="#00000001" accessibilityHidden="true" />
			</GridLayout>
			<GridLayout
				:ref="noticePosition"
				verticalAlignment="top"
				horizontalAlignment="center"
				isUserInteractionEnabled="false"
			>
				<JoltTransition
					:enter="[
						{ opacity: [0, 1], y: [-14, 0], scale: [0.9, 1] },
						{ type: 'spring', duration: 550, bounce: 0.25 },
					]"
					:leave="[{ opacity: 0, y: -10 }, { duration: 200 }]"
					mode="out-in"
				>
					<StackLayout
						v-if="toast"
						:key="toast"
						orientation="horizontal"
						class="toast"
						accessible="true"
						:accessibilityLabel="toast"
					>
						<Icon name="sparkles" :size="12" :color="atmosphere.color" marginRight="8" />
						<Label :text="toast" class="toast-copy body-medium" />
					</StackLayout>
				</JoltTransition>
			</GridLayout>
			<EnergyPlan
				v-if="planOpen"
				:background="content?.nativeView"
				:accent="atmosphere.color"
				:level="level"
				:limit="chargeLimit"
				@save="savePlan"
				@close="planOpen = false"
			/>
		</GridLayout>
	</Page>
</template>

<style scoped>
.screen {
	background-color: #05070a;
}
.dim {
	background-color: #000000;
}
.orbit-arrow {
	font-size: 17;
	margin-right: 8;
}
.orbit-copy {
	font-size: 8;
	letter-spacing: 0.15;
	color: #8b9b8d;
	vertical-align: middle;
}
.toast {
	padding: 11 16;
	border-radius: 20;
	background-color: #172019;
	border-width: 1;
	border-color: rgba(213, 255, 98, 0.18);
}
.toast-copy {
	font-size: 10;
	color: #e6efdf;
}
</style>
