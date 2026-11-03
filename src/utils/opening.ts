import { readonly, ref } from 'nativescript-vue';

const opened = ref(false);

export const finishOpening = () => {
	opened.value = true;
};

export const useOpened = () => readonly(opened);
