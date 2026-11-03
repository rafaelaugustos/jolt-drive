<script lang="ts">
const GLYPHS = {
	'lock-closed': 0xecc8,
	'lock-open': 0xeccb,
	flash: 0xec17,
	'flash-outline': 0xec1b,
	'snow-outline': 0xee8b,
	'thermometer-outline': 0xeed0,
	'bulb-outline': 0xeac2,
	sparkles: 0xee8d,
	'navigate-outline': 0xed71,
	'person-circle-outline': 0xedab,
	'chevron-up': 0xeb42,
	'shield-checkmark-outline': 0xee7a,
	'speedometer-outline': 0xee91,
	'leaf-outline': 0xecb4,
	add: 0xea04,
	remove: 0xee21,
	power: 0xede8,
	wifi: 0xef32,
	'volume-high': 0xef14,
} as const;

export type IconName = keyof typeof GLYPHS;
</script>

<script lang="ts" setup>
import { computed } from 'nativescript-vue';
import { palette } from '@/themes/palette';

const props = withDefaults(defineProps<{ name: IconName; size?: number; color?: string }>(), {
	size: 20,
	color: palette.text,
});

const glyph = computed(() => String.fromCodePoint(GLYPHS[props.name]));
</script>

<template>
	<Label :text="glyph" :fontSize="size" :color="color" class="icon" accessibilityHidden="true" />
</template>

<style scoped>
.icon {
	font-family: Ionicons;
	text-align: center;
	vertical-align: middle;
}
</style>
