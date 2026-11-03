import { createApp, registerElement } from 'nativescript-vue';
import Jolt from '@rafaelaugusto/jolt/vue';
import { GestureSurface } from '@rafaelaugusto/jolt/gestures';
import { GlassContainer, GlassView } from '@rafaelaugusto/jolt/glass';
import App from './App.vue';
import { router } from './router';

registerElement('SceneView', () => require('./components/scene/scene-view').SceneView);
registerElement('GestureSurface', () => GestureSurface);
registerElement('GlassContainer', () => GlassContainer);
registerElement('GlassView', () => GlassView);
registerElement('RouteMap', () => require('./components/summon/route-map').RouteMap);

createApp(App).use(router).use(Jolt).start();
