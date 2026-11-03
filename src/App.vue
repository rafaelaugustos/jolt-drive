<script lang="ts" setup>
import { ref } from 'nativescript-vue';
import Splash from '@/pages/Splash.vue';

const opening = ref(true);
</script>

<template>
	<GridLayout iosOverflowSafeArea="true" class="root">
		<RouterView initial="/" />
		<Splash v-if="opening" @done="opening = false" />
	</GridLayout>
</template>

<style scoped>
.root {
	background-color: #05070a;
}
</style>
