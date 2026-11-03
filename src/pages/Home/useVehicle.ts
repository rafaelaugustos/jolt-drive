import { computed, onUnmounted, reactive, ref } from 'nativescript-vue';

export type VehicleAction = 'lock' | 'climate' | 'charge' | 'lights' | 'flash';

interface VehicleEffects {
	notify(message: string): void;
	charging(active: boolean): void;
}

const IDLE_TEMPERATURE = 27;
const MILES_PER_PERCENT = 4;

export function useVehicle(effects: VehicleEffects) {
	const state = reactive({ locked: true, charging: false, climate: false, lights: false });
	const level = ref(78);
	const chargeLimit = ref(90);
	const range = computed(() => level.value * MILES_PER_PERCENT);
	const inside = ref(IDLE_TEMPERATURE);
	const target = ref(21);
	let charger: ReturnType<typeof setInterval> | undefined;
	let thermostat: ReturnType<typeof setInterval> | undefined;

	const charge = (active: boolean) => {
		clearInterval(charger);
		if (active && level.value >= chargeLimit.value) {
			effects.notify(`Already at ${chargeLimit.value}%. Adventure is calling.`);
			return;
		}
		state.charging = active;
		effects.charging(active);
		if (!active) return;
		charger = setInterval(() => {
			level.value = Math.min(chargeLimit.value, level.value + 1);
			if (level.value >= chargeLimit.value) {
				charge(false);
				effects.notify(`${chargeLimit.value}%. A little energy. Endless possibilities.`);
			}
		}, 1200);
	};

	const regulate = (active: boolean) => {
		clearInterval(thermostat);
		thermostat = setInterval(
			() => {
				const goal = active ? target.value : IDLE_TEMPERATURE;
				if (inside.value === goal) return clearInterval(thermostat);
				inside.value += inside.value > goal ? -1 : 1;
			},
			active ? 900 : 2500,
		);
	};

	const retarget = (temperature: number) => {
		target.value = Math.min(28, Math.max(16, temperature));
		if (state.climate) regulate(true);
	};

	const savePlan = (limit: number) => {
		chargeLimit.value = limit;
		if (state.charging && level.value >= limit) charge(false);
		effects.notify(`Charge plan set to ${limit}%. Ready for what’s next.`);
	};

	onUnmounted(() => {
		clearInterval(charger);
		clearInterval(thermostat);
	});

	return { state, level, range, chargeLimit, inside, target, charge, regulate, retarget, savePlan };
}
