import { createRouter } from 'vue-router-ns';

export const router = createRouter({
	routes: [
		{ path: '/', name: 'home', component: () => import('./pages/Home/index.vue') },
		{ path: '/summon', name: 'summon', component: () => import('./pages/Summon.vue') },
	],
});
