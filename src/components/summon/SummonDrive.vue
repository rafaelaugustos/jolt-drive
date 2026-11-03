<script lang="ts" setup>
import { isIOS, Utils, type EventData } from '@nativescript/core';
import { computed, onUnmounted, ref } from 'nativescript-vue';
import { useBinding, useReducedMotion } from '@rafaelaugusto/jolt/vue';
import type { SceneView } from '../scene/scene-view';
import type { RouteMap } from './route-map';
import { createDriveStage } from './drive-stage';
import { driveFrame } from './austin-route';
import { safeArea } from '@/utils/safe-area';
import { springs } from '@/themes/motion';
import DriveActionIcon from './DriveActionIcon.vue';
import { usePickup } from './usePickup';

const props = defineProps<{ accent: string; charging: boolean }>();
const emit = defineEmits<{ close: [arrived: boolean] }>();
const reduced = useReducedMotion();
const { phase, active, progress, remaining, seconds, speed, act, cancel, close } = usePickup({
	charging: () => props.charging,
	ready: () => ready.value,
	render: () => render(),
	close: (arrived) => emit('close', arrived),
});
const ready = ref(false);
const error = ref('');
const mapOpen = ref(!isIOS);
const checkpoints = Array.from({ length: 21 }, (_, i) => i / 20);
const fill = useBinding({
	scaleX: progress.to(
		checkpoints,
		checkpoints.map((t) => driveFrame(t).fraction),
	),
});
const bottom = safeArea().bottom;
let stage: ReturnType<typeof createDriveStage> | undefined;
let sceneView: SceneView['sceneView'] | undefined;

const title = computed(() =>
	props.charging
		? 'Unplug. Then let’s go.'
		: {
				idle: 'Come to me.',
				moving: 'On my way.',
				paused: 'Right here. Ready.',
				arrived: 'Your ride is here.',
				cancelled: 'Another time, then.',
			}[phase.value],
);
const detail = computed(() =>
	props.charging
		? 'Pause charging in the garage to start.'
		: {
				idle: 'From 2nd Street to you at 5th & Congress.',
				moving: 'North on Congress Avenue. Coming to you.',
				paused: 'Pickup paused. Continue when you’re ready.',
				arrived: 'Waiting by the curb at 5th & Congress.',
				cancelled: 'Pickup cancelled. You can call again.',
			}[phase.value],
);
const action = computed(() =>
	props.charging || phase.value === 'arrived'
		? 'Back to garage'
		: {
				idle: reduced.value ? 'Preview arrival' : 'Come to me',
				moving: 'Pause pickup',
				paused: 'Continue pickup',
				cancelled: 'Call again',
			}[phase.value],
);
const render = () => {
	if (!sceneView) return;
	sceneView.playing = phase.value === 'moving';
	sceneView.rendersContinuously = phase.value === 'moving';
	sceneView.setNeedsDisplay();
};
const sceneLoaded = (event: EventData) => {
	if (stage) return;
	try {
		sceneView = (event.object as SceneView).sceneView;
		if (!sceneView) {
			ready.value = true;
			return;
		}
		stage = createDriveStage(progress);
		sceneView.scene = stage.scene;
		sceneView.pointOfView = stage.camera;
		sceneView.preferredFramesPerSecond = 60;
		render();
		ready.value = true;
	} catch (cause) {
		console.error('Unable to prepare the Austin cabin view', cause);
		error.value = 'The cabin view could not load. Go back and try again.';
	}
};
const mapLoaded = (event: EventData) => (event.object as RouteMap).connect(progress);
onUnmounted(() => {
	stage?.dispose();
	if (sceneView) {
		sceneView.playing = false;
		sceneView.rendersContinuously = false;
		sceneView.scene = null;
	}
});
</script>

<template>
	<GridLayout rows="auto, *, auto" backgroundColor="#0B1411">
		<GlassContainer columns="44, *, auto" glassSpacing="16" padding="10 18 14">
			<GlassView
				height="44"
				width="44"
				glassRadius="capsule"
				glassTint="rgba(29,43,35,.4)"
				glassInteractive="true"
				:backgroundColor="isIOS ? undefined : '#1D2B23'"
				:borderRadius="isIOS ? 0 : 22"
				accessible="true"
				accessibilityRole="button"
				accessibilityLabel="Back to garage"
				@tap="close"
			>
				<Label
					text="‹"
					fontSize="32"
					color="#ECF3E5"
					textAlignment="center"
					verticalAlignment="middle"
					marginTop="-3"
				/>
			</GlassView>
			<StackLayout col="1" marginLeft="13" verticalAlignment="middle">
				<Label
					text="AUSTIN, TEXAS"
					fontSize="8"
					letterSpacing=".15"
					:color="accent"
					class="body-strong"
				/>
				<Label
					text="The view from your Tesla."
					fontSize="17"
					color="#F1F5EB"
					class="display"
					marginTop="4"
				/>
			</StackLayout>
			<GlassView
				col="2"
				height="44"
				padding="0 12"
				glassRadius="capsule"
				:glassTint="mapOpen ? 'rgba(52,74,50,.65)' : 'rgba(29,43,35,.4)'"
				glassInteractive="true"
				:backgroundColor="isIOS ? undefined : mapOpen ? '#344A32' : '#1D2B23'"
				:borderRadius="isIOS ? 0 : 22"
				accessible="true"
				accessibilityRole="button"
				:accessibilityLabel="mapOpen ? 'Close route map' : 'Show real Austin route map'"
				@tap="mapOpen = !mapOpen"
			>
				<Label
					:text="mapOpen ? 'Close map' : 'Route ↗'"
					fontSize="10"
					:color="accent"
					class="body-strong"
					verticalAlignment="middle"
				/>
			</GlassView>
		</GlassContainer>

		<GridLayout row="1" clipToBounds="true" backgroundColor="#B9D5DF">
			<SceneView
				v-if="isIOS"
				@loaded="sceneLoaded"
				accessible="true"
				accessibilityLabel="View through the windshield of your empty Tesla, travelling along Congress Avenue in Austin"
			/>
			<GridLayout v-else @loaded="ready = true" backgroundColor="#17241F"
				><Label
					text="The cabin camera is available on iOS."
					color="#DAE7D7"
					textAlignment="center"
					textWrap="true"
					margin="30"
			/></GridLayout>
			<GridLayout
				verticalAlignment="top"
				height="100"
				isUserInteractionEnabled="false"
				v-gradient="{
					type: 'linear',
					angle: 180,
					colors: ['rgba(11,20,17,.8)', 'rgba(11,20,17,0)'],
				}"
			/>
			<GlassContainer
				columns="*, 12, auto"
				glassSpacing="18"
				verticalAlignment="top"
				margin="14 16"
				isUserInteractionEnabled="false"
			>
				<GlassView
					height="52"
					glassRadius="20"
					glassTint="rgba(11,28,23,.5)"
					:backgroundColor="isIOS ? undefined : '#162A23'"
					:borderRadius="isIOS ? 0 : 20"
					padding="0 13"
				>
					<StackLayout verticalAlignment="middle">
						<Label
							text="WINDSHIELD / EMPTY CABIN"
							fontSize="8"
							letterSpacing=".12"
							color="#FFFFFF"
							class="body-strong"
						/>
						<Label
							text="Congress Avenue · Northbound"
							fontSize="10"
							color="#E0E9E6"
							class="body"
							marginTop="6"
						/>
					</StackLayout>
				</GlassView>
				<GlassView
					col="2"
					height="34"
					glassRadius="capsule"
					glassTint="rgba(20,37,28,.6)"
					:backgroundColor="isIOS ? undefined : '#14251C'"
					:borderRadius="isIOS ? 0 : 17"
					padding="0 11"
					verticalAlignment="middle"
				>
					<Label
						:text="
							phase === 'moving'
								? '●  DRIVING'
								: phase === 'arrived'
									? '●  ARRIVED'
									: phase === 'paused'
										? '●  PAUSED'
										: '●  PARKED'
						"
						fontSize="7"
						:color="accent"
						verticalAlignment="middle"
						class="body-strong"
					/>
				</GlassView>
			</GlassContainer>
			<ActivityIndicator
				v-if="!ready && !error"
				busy="true"
				:color="accent"
				width="28"
				height="28"
			/>
			<Label
				v-if="error"
				:text="error"
				textWrap="true"
				margin="35"
				textAlignment="center"
				color="#102017"
			/>
			<GridLayout
				v-if="mapOpen"
				height="235"
				margin="78 16 14"
				verticalAlignment="top"
				borderRadius="20"
				borderWidth="1"
				borderColor="#BACABB"
				clipToBounds="true"
				backgroundColor="#E4E8E0"
			>
				<RouteMap @loaded="mapLoaded" />
			</GridLayout>
			<GridLayout
				verticalAlignment="bottom"
				height="100"
				isUserInteractionEnabled="false"
				v-gradient="{ type: 'linear', angle: 180, colors: ['rgba(11,20,17,0)', '#0B1411'] }"
			/>
			<Label
				text="3D SIMULATION · © OpenStreetMap contributors"
				verticalAlignment="bottom"
				horizontalAlignment="center"
				marginBottom="12"
				fontSize="7"
				color="#AABBAE"
				class="body-medium"
				accessible="true"
				accessibilityRole="link"
				accessibilityLabel="3D simulation, geographic data from OpenStreetMap contributors. Open attribution."
				@tap="Utils.openUrl('https://www.openstreetmap.org/copyright')"
			/>
		</GridLayout>

		<StackLayout
			row="2"
			padding="15 22 0"
			:paddingBottom="Math.max(14, bottom)"
			backgroundColor="#0B1411"
		>
			<GridLayout columns="*, auto, auto" marginBottom="17">
				<StackLayout
					><Label :text="String(speed)" fontSize="38" color="#EFF5E9" class="display-light" /><Label
						text="MPH"
						fontSize="7"
						letterSpacing=".1"
						color="#94A795"
						class="body-strong"
				/></StackLayout>
				<StackLayout col="1" marginRight="30" verticalAlignment="middle"
					><Label :text="`${remaining} m`" fontSize="23" color="#EFF5E9" class="display" /><Label
						text="TO YOU"
						fontSize="7"
						letterSpacing=".1"
						color="#94A795"
						class="body-strong"
						marginTop="4"
				/></StackLayout>
				<StackLayout col="2" verticalAlignment="middle"
					><Label :text="`${seconds} s`" fontSize="23" :color="accent" class="display" /><Label
						text="ARRIVAL"
						fontSize="7"
						letterSpacing=".1"
						color="#94A795"
						class="body-strong"
						marginTop="4"
				/></StackLayout>
			</GridLayout>
			<GridLayout
				height="3"
				marginBottom="17"
				backgroundColor="#2B3A2D"
				borderRadius="2"
				clipToBounds="true"
				><GridLayout :ref="fill" originX="0" scaleX="0" :backgroundColor="accent"
			/></GridLayout>
			<Label :text="title" fontSize="28" color="#F2F7ED" class="display" />
			<Label
				:text="detail"
				fontSize="11"
				color="#9EAF9E"
				class="body"
				textWrap="true"
				marginTop="6"
				marginBottom="18"
			/>
			<GridLayout :columns="active ? '*, 10, 50' : '*'" height="52">
				<GridLayout
					borderRadius="18"
					:backgroundColor="accent"
					:isEnabled="ready || charging"
					:opacity="ready || charging ? 1 : 0.5"
					accessible="true"
					accessibilityRole="button"
					:accessibilityLabel="action"
					v-press="[{ scale: 0.97 }, { ...springs.snap, haptic: 'medium' }]"
					@tap="act"
				>
					<StackLayout
						orientation="horizontal"
						horizontalAlignment="center"
						verticalAlignment="middle"
					>
						<DriveActionIcon
							:mode="
								charging
									? 'back'
									: phase === 'arrived'
										? 'done'
										: phase === 'moving'
											? 'pause'
											: 'play'
							"
							marginRight="8"
						/>
						<Label
							:text="action"
							fontSize="14"
							color="#17230E"
							class="body-strong"
							verticalAlignment="middle"
						/>
					</StackLayout>
				</GridLayout>
				<GridLayout
					v-if="active"
					col="2"
					borderRadius="18"
					backgroundColor="#30261F"
					accessible="true"
					accessibilityRole="button"
					accessibilityLabel="Cancel pickup"
					v-press
					@tap="cancel"
					><Label
						text="×"
						fontSize="27"
						color="#E3B7A0"
						textAlignment="center"
						verticalAlignment="middle"
				/></GridLayout>
			</GridLayout>
		</StackLayout>
	</GridLayout>
</template>
