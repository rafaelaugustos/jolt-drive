<script lang="ts" setup>
import { shallowRef, computed, onMounted, watch } from 'nativescript-vue';
import type { NativeElement } from '@/utils/native-element';
import {
	particles,
	rollTo,
	springValue,
	type DerivedValue,
	type GradientOptions,
	type MotionValue,
	type Target,
} from '@rafaelaugusto/jolt';
import { useCockpitGesture } from './useCockpitGesture';
import { useBinding, useMotionScope, useReducedMotion } from '@rafaelaugusto/jolt/vue';
import Icon from '@/components/Icon.vue';
import { atmospheres, palette, withAlpha } from '@/themes/palette';
import { curves } from '@/themes/motion';
import SheetAction from './SheetAction.vue';
import AtmosphereOption from './AtmosphereOption.vue';
import type { VehicleAction } from './useVehicle';

const props = defineProps<{
	offset: MotionValue;
	progress: DerivedValue;
	chargeGlow: DerivedValue;
	height: number;
	closed: number;
	bottom: number;
	locked: boolean;
	climate: boolean;
	charging: boolean;
	lights: boolean;
	level: number;
	inside: number;
	outside: number;
	target: number;
	accent: string;
	mood: number;
	busy: boolean;
	active: boolean;
	limit: number;
}>();
const emit = defineEmits<{
	action: [action: VehicleAction];
	target: [value: number];
	mood: [value: number];
	plan: [];
}>();
const { root, expanded, enter: enterPanel, close, toggle } = useCockpitGesture(props);
const motion = useMotionScope();
const reduced = useReducedMotion();
const chevron = useBinding({ rotate: props.progress.to([0, 1], [0, 180]) });
const summary = useBinding({ opacity: props.progress.to([0, 0.3], [1, 0]) });
const expandedLabel = useBinding({ opacity: props.progress.to([0.2, 0.6], [0, 1]) });
const revealProgress = motion.add(springValue(props.progress, { stiffness: 320, damping: 34 }));
const reveal = (i: number) =>
	useBinding({
		opacity: revealProgress.to([0.1 + i * 0.1, 0.5 + i * 0.1], [0, 1]),
		y: revealProgress.to([0.1 + i * 0.1, 0.7 + i * 0.1], [reduced.value ? 0 : 34, 0]),
	});
const cards = [reveal(0), reveal(1), reveal(2), reveal(3)];
const energy = shallowRef<NativeElement>();
const chargeNumber = shallowRef<NativeElement>();
const degrees = shallowRef<NativeElement>();
const actions: Target[] = [];
let stopParticles: (() => void) | undefined;
const fill = shallowRef<NativeElement>();
const ACTIONS = computed(() => [
	{
		key: 'lock' as const,
		icon: props.locked ? ('lock-closed' as const) : ('lock-open' as const),
		label: props.locked ? 'Locked' : 'Unlocked',
		active: !props.locked,
		tone: props.accent,
	},
	{
		key: 'climate' as const,
		icon: 'snow-outline' as const,
		label: 'Climate',
		active: props.climate,
		tone: palette.lilac,
	},
	{
		key: 'charge' as const,
		icon: 'flash-outline' as const,
		label: 'Charge',
		active: props.charging,
		tone: props.accent,
	},
	{
		key: 'lights' as const,
		icon: 'bulb-outline' as const,
		label: 'Lights',
		active: props.lights,
		tone: palette.amber,
	},
]);
const chargeAngle = props.chargeGlow.to([0, 1], [145, 115]);
const chargeStop = props.chargeGlow.to([0, 1], [1, 0.65]);
const energyGradient = computed<GradientOptions>(() => ({
	type: 'linear',
	angle: chargeAngle,
	stops: [0, chargeStop],
	colors: [props.accent, props.mood === 2 ? '#A892DE' : props.mood === 1 ? '#65BDD6' : '#A2CC43'],
}));
const CLIMATE: GradientOptions = { type: 'linear', angle: 150, colors: ['#D8CCFF', '#A594D1'] };
const surface: GradientOptions = {
	type: 'linear',
	angle: props.progress.to([0, 1], [160, 125]),
	colors: ['#18201B', '#0C1211', '#101518'],
};
const enter = () => {
	motion.animate(root.value!, { opacity: 1 }, { duration: 250 });
	enterPanel();
	motion.animate(
		actions,
		{ opacity: [0, 1], y: [24, 0], scale: [0.8, 1] },
		{ duration: 700, delay: 220, ease: curves.glide, stagger: { each: 65, from: 'center' } },
	);
};
const nudge = (delta: number) => emit('target', Math.min(28, Math.max(16, props.target + delta)));
const updateNumbers = () => {
	if (!chargeNumber.value || !degrees.value || !props.active || motion.suspended) return;
	motion.add(
		rollTo(chargeNumber.value!, props.level, {
			duration: reduced.value ? 1 : 600,
			stagger: 45,
			format: (v) => `${v}%`,
		}),
	);
	motion.add(
		rollTo(degrees.value!, props.target, {
			duration: reduced.value ? 1 : 420,
			format: (v) => `${v}°`,
		}),
	);
	motion.animate(fill.value!, { scaleX: props.level / 100 }, { duration: 650, ease: curves.glide });
};
watch(() => [props.level, props.target], updateNumbers);
watch(
	() => [props.charging, expanded.value, reduced.value, props.active],
	() => {
		stopParticles?.();
		stopParticles = undefined;
		if (props.active && props.charging && expanded.value && !reduced.value && energy.value) {
			stopParticles = motion.use(() =>
				particles(energy.value!, {
					colors: ['#FFFFFF', '#FFFFFF80'],
					source: 'bottom',
					shape: 'circle',
					rate: 12,
					size: 3,
					lifetime: 1400,
					velocity: 65,
					spread: 35,
				}),
			);
		}
	},
);
watch(
	() => props.active,
	(active) => {
		if (active) {
			motion.resume();
			updateNumbers();
		} else {
			motion.suspend();
		}
	},
);
onMounted(updateNumbers);
defineExpose({ enter, close });
</script>

<template>
	<GestureSurface
		ref="root"
		:height="height"
		verticalAlignment="bottom"
		opacity="0"
		class="sheet"
		rows="auto, *"
		:isUserInteractionEnabled="active"
		v-gradient="surface"
	>
		<StackLayout row="0">
			<GridLayout
				rows="18, 30"
				class="grip"
				accessible="true"
				accessibilityRole="button"
				accessibilityLabel="Expand or collapse your cockpit"
				@tap="toggle"
			>
				<GridLayout
					width="30"
					height="20"
					scaleY="0.15"
					borderRadius="8"
					backgroundColor="#59635B"
					verticalAlignment="middle"
				/>
				<GridLayout row="1" columns="*, auto, auto" margin="0 8 4">
					<Label text="YOUR COCKPIT" class="eyebrow body-strong" verticalAlignment="middle" />
					<Label
						col="1"
						:text="expanded ? 'CLOSE' : 'PULL TO PLAY'"
						class="pull body-strong"
						verticalAlignment="middle"
					/>
					<GridLayout col="2" :ref="chevron" width="24"
						><Icon name="chevron-up" :size="12" :color="accent"
					/></GridLayout>
				</GridLayout>
			</GridLayout>
			<GridLayout columns="*, *, *, *" class="actions" :isUserInteractionEnabled="!busy">
				<SheetAction
					v-for="(action, i) in ACTIONS"
					:key="action.key"
					:ref="
						(el) => {
							if (el) actions[i] = el as InstanceType<typeof SheetAction>;
						}
					"
					:col="i"
					:icon="action.icon"
					:label="action.label"
					:active="action.active"
					:tone="action.tone"
					opacity="0"
					@tap="emit('action', action.key)"
				/>
			</GridLayout>
			<GridLayout height="36" margin="6 8 0">
				<GridLayout :ref="summary" columns="auto, *, auto">
					<StackLayout orientation="horizontal" verticalAlignment="middle">
						<Icon name="thermometer-outline" :size="12" color="#9DAA9F" />
						<Label :text="`${inside}° inside / ${outside}° outside`" class="summary body" />
					</StackLayout>
					<StackLayout col="2" orientation="horizontal" verticalAlignment="middle">
						<ContentView
							width="4"
							height="4"
							borderRadius="2"
							:backgroundColor="accent"
							verticalAlignment="middle"
						/>
						<Label text="ALL GOOD" class="all-good body-strong" />
					</StackLayout>
				</GridLayout>
				<Label
					:ref="expandedLabel"
					text="A little control. A lot of possibility."
					class="expanded-copy body"
				/>
			</GridLayout>
		</StackLayout>
		<ScrollView
			ref="scrollContent"
			row="1"
			scrollBarIndicatorVisible="false"
			:paddingBottom="bottom + 10"
			:isUserInteractionEnabled="active && !busy"
			:accessibilityHidden="!expanded"
		>
			<StackLayout>
				<GridLayout :ref="cards[0]" columns="*, 10, *" height="192" marginTop="8">
					<GridLayout
						ref="energy"
						rows="auto, *, auto, auto"
						class="bento"
						v-gradient="[energyGradient, { duration: 900 }]"
					>
						<GridLayout
							columns="*, auto"
							accessible="true"
							accessibilityRole="button"
							accessibilityLabel="Open charge plan"
							v-press
							@tap="emit('plan')"
							><Label text="CHARGE PLAN ↗" class="bento-label body-strong" /><Icon
								col="1"
								name="flash"
								:size="15"
								color="#17220B"
						/></GridLayout>
						<Label
							ref="chargeNumber"
							row="1"
							text="78%"
							class="big-number display"
							verticalAlignment="middle"
						/>
						<StackLayout row="2">
							<Label
								:text="
									charging
										? `${Math.max(0, limit - level) * 3} min to ${limit}%`
										: level >= limit
											? 'Your next adventure is charged.'
											: `Plug in. Power up to ${limit}%.`
								"
								class="bento-sub body-medium"
							/>
							<GridLayout height="4" marginTop="9" borderRadius="2" backgroundColor="#22320D28">
								<GridLayout ref="fill" backgroundColor="#20310F" borderRadius="2" originX="0" />
							</GridLayout>
						</StackLayout>
						<GridLayout
							row="3"
							class="bento-button"
							marginTop="13"
							accessible="true"
							accessibilityRole="button"
							:accessibilityLabel="charging ? 'Stop charging' : 'Start charging'"
							v-press
							@tap="emit('action', 'charge')"
						>
							<Label
								:text="
									charging
										? 'Pause charging'
										: level >= limit
											? `Charged to ${limit}%`
											: 'Give it a boost ↗'
								"
								class="bento-button-text body-strong"
							/>
						</GridLayout>
					</GridLayout>
					<GridLayout col="2" rows="auto, *, auto, auto" class="bento" v-gradient="CLIMATE">
						<GridLayout columns="*, auto"
							><Label text="COMFORT ZONE" class="bento-label body-strong" /><Icon
								col="1"
								name="snow-outline"
								:size="15"
								color="#302047"
						/></GridLayout>
						<GridLayout row="1" columns="auto, *"
							><Label
								ref="degrees"
								text="21°"
								class="big-number display"
								verticalAlignment="middle" /><Label
								col="1"
								text="SET TO"
								class="set-to body-strong"
								verticalAlignment="middle"
						/></GridLayout>
						<Label
							row="2"
							:text="
								climate
									? `Cabin ${inside}° · ${inside === target ? 'Just right.' : inside > target ? 'Cooling down.' : 'Warming up.'}`
									: 'Your kind of atmosphere.'
							"
							class="bento-sub body-medium"
						/>
						<GridLayout row="3" columns="38, *, 38" marginTop="13">
							<GridLayout
								class="temp-button"
								accessible="true"
								accessibilityRole="button"
								accessibilityLabel="Lower temperature"
								v-press
								@tap="nudge(-1)"
								><Icon name="remove" :size="18" color="#302047"
							/></GridLayout>
							<GridLayout
								col="1"
								accessible="true"
								accessibilityRole="button"
								:accessibilityLabel="
									climate ? 'Turn climate off' : 'Turn climate on and enter cabin'
								"
								v-press
								@tap="emit('action', 'climate')"
								><Label :text="climate ? 'ON' : 'OFF'" class="temp-state body-strong"
							/></GridLayout>
							<GridLayout
								col="2"
								class="temp-button"
								accessible="true"
								accessibilityRole="button"
								accessibilityLabel="Raise temperature"
								v-press
								@tap="nudge(1)"
								><Icon name="add" :size="18" color="#302047"
							/></GridLayout>
						</GridLayout>
					</GridLayout>
				</GridLayout>
				<GridLayout :ref="cards[1]" columns="auto, *, auto" class="health" marginTop="12">
					<GridLayout
						width="37"
						height="37"
						borderRadius="13"
						:backgroundColor="withAlpha(accent, 0.08)"
						><Icon name="shield-checkmark-outline" :size="20" :color="accent"
					/></GridLayout>
					<StackLayout col="1" marginLeft="11" verticalAlignment="middle"
						><Label text="Good to go." class="health-title body-strong" /><Label
							text="Tires 42 / 42 / 41 / 42 psi"
							class="health-sub body"
					/></StackLayout>
					<GridLayout
						col="2"
						class="flash-button"
						accessible="true"
						accessibilityRole="button"
						accessibilityLabel="Flash headlights"
						v-press
						@tap="emit('action', 'flash')"
						><Icon name="bulb-outline" :size="18" :color="palette.amber"
					/></GridLayout>
				</GridLayout>
				<StackLayout :ref="cards[2]" marginTop="20" marginBottom="6">
					<GridLayout columns="*, auto" margin="0 4 11"
						><Label text="SET THE MOOD" class="eyebrow body-strong" /><Icon
							col="1"
							name="sparkles"
							:size="13"
							:color="accent"
					/></GridLayout>
					<GridLayout columns="*, *, *" height="44">
						<AtmosphereOption
							v-for="(item, i) in atmospheres"
							:key="item.name"
							:col="i"
							:marginLeft="i ? 6 : 0"
							:name="item.name"
							:color="item.color"
							:selected="mood === i"
							@select="emit('mood', i)"
						/>
					</GridLayout>
				</StackLayout>
				<Label
					:ref="cards[3]"
					text="FEEL EVERYTHING. / POWERED BY JOLT"
					class="signature body-strong"
				/>
			</StackLayout>
		</ScrollView>
	</GestureSurface>
</template>

<style scoped>
.sheet {
	margin: 0 12;
	padding: 0 13;
	border-radius: 30;
	border-width: 1;
	border-color: rgba(203, 231, 184, 0.16);
}
.grip {
	padding-top: 2;
}
.eyebrow {
	font-size: 9;
	letter-spacing: 0.15;
	color: #b8c4b7;
}
.pull {
	font-size: 7;
	letter-spacing: 0.08;
	color: #859381;
}
.actions {
	margin-top: 7;
}
.summary {
	margin-left: 3;
	font-size: 10;
	color: #9daa9f;
}
.all-good {
	margin-left: 5;
	font-size: 7;
	letter-spacing: 0.1;
	color: #a4b29c;
}
.expanded-copy {
	font-size: 11;
	color: #8e9c93;
	text-align: center;
}
.bento {
	padding: 15 13 13;
	border-radius: 23;
}
.bento-label {
	font-size: 7;
	letter-spacing: 0.05;
	color: #25301d;
	vertical-align: middle;
}
.big-number {
	font-size: 45;
	letter-spacing: -0.05;
	color: #17220b;
}
.bento-sub {
	font-size: 9;
	color: #303d26;
}
.bento-button {
	height: 34;
	border-radius: 12;
	background-color: rgba(18, 30, 10, 0.9);
}
.bento-button-text {
	font-size: 10;
	color: #f2ffe0;
	text-align: center;
	vertical-align: middle;
}
.set-to {
	font-size: 7;
	margin-left: 5;
	color: #5e4e78;
	letter-spacing: 0.08;
}
.temp-button {
	height: 34;
	border-radius: 12;
	background-color: rgba(48, 32, 71, 0.12);
}
.temp-state {
	font-size: 9;
	color: #302047;
	text-align: center;
	vertical-align: middle;
}
.health {
	padding: 13 12;
	border-radius: 20;
	border-width: 1;
	border-color: rgba(225, 245, 216, 0.08);
	background-color: rgba(225, 245, 216, 0.025);
}
.health-title {
	font-size: 14;
	color: #e7f0e3;
}
.health-sub {
	margin-top: 3;
	font-size: 9;
	color: #94a18e;
}
.flash-button {
	width: 39;
	height: 39;
	border-radius: 14;
	background-color: rgba(255, 181, 71, 0.08);
}
.signature {
	margin: 17 0 6;
	font-size: 7;
	letter-spacing: 0.15;
	color: #617060;
	text-align: center;
}
</style>
