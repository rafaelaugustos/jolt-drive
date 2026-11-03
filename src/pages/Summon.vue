<script lang="ts" setup>
import { Deferred, useRouter } from 'vue-router-ns';
import SummonDrive from '@/components/summon/SummonDrive.vue';

withDefaults(defineProps<{ accent?: string; charging?: boolean }>(), {
	accent: '#D5FF62',
	charging: false,
});
const router = useRouter();
const close = (arrived: boolean) => router.back({ result: arrived });
</script>

<template>
	<Page actionBarHidden="true" backgroundColor="#0D1716">
		<Deferred>
			<SummonDrive :accent="accent" :charging="charging" @close="close" />
			<template #fallback>
				<GridLayout backgroundColor="#0D1716">
					<StackLayout verticalAlignment="middle" horizontalAlignment="center">
						<Label
							text="TESLA / SUMMON"
							fontSize="11"
							:color="accent"
							class="body-strong"
							letterSpacing="0.15"
							textAlignment="center"
						/>
						<ActivityIndicator busy="true" :color="accent" width="28" height="28" marginTop="24" />
						<Label
							text="Your Tesla. The streets of Austin."
							fontSize="12"
							color="#91A596"
							class="body"
							marginTop="18"
						/>
					</StackLayout>
				</GridLayout>
			</template>
		</Deferred>
	</Page>
</template>
