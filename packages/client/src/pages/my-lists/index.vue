<template>
<MkSpacer :content-max="700">
	<div class="qkcjvfiv">
		<MkButton primary class="add" @click="create"><i class="fas fa-plus"></i> {{ $ts.createList }}</MkButton>

		<MkPagination v-slot="{items}" ref="list" :pagination="pagination" class="lists _content">
			<MkA v-for="list in items" :key="list.id" class="list _panel" :to="`/my/lists/${ list.id }`">
				<div class="name">{{ list.name }}</div>
				<MkAvatars :user-ids="list.userIds"/>
			</MkA>
		</MkPagination>
	</div>
</MkSpacer>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import MkPagination from '@/components/ui/pagination.vue';
import MkButton from '@/components/ui/button.vue';
import MkAvatars from '@/components/avatars.vue';
import * as os from '@/os';
import * as symbols from '@/symbols';

export default defineComponent({
	components: {
		MkPagination,
		MkButton,
		MkAvatars,
	},

	data() {
		return {
			[symbols.PAGE_INFO]: {
				title: this.$ts.manageLists,
				icon: 'fas fa-list-ul',
				bg: 'var(--bg)',
				action: {
					icon: 'fas fa-plus',
					handler: this.create
				},
			},
			pagination: {
				endpoint: 'users/lists/list',
				limit: 10,
			},
		};
	},

	methods: {
		async create() {
			const { canceled, result: name } = await os.inputText({
				title: this.$ts.enterListName,
			});
			if (canceled) return;
			await os.api('users/lists/create', { name: name });
			this.$refs.list.reload();
			os.success();
		},
	}
});
</script>

<style lang="scss" scoped>
.qkcjvfiv {
	> .add {
		margin: 0 auto var(--margin) auto;
	}

	> .lists {
		> .list {
			display: block;
			padding: 16px;
			border: solid 1px var(--divider);
			border-radius: 6px;

			&:hover {
				border: solid 1px var(--accent);
				text-decoration: none;
			}

			> .name {
				margin-bottom: 4px;
			}
		}
	}
}
</style>
