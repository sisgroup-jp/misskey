<template>
<div class="hveuntkp">
	<div v-if="objectSelected" class="controller _section">
		<div class="_content">
			<p class="name">{{ selectedFurnitureName }}</p>
			<XPreview ref="preview"/>
			<template v-if="selectedFurnitureInfo.props">
				<div v-for="k in Object.keys(selectedFurnitureInfo.props)" :key="k">
					<p>{{ k }}</p>
					<template v-if="selectedFurnitureInfo.props[k] === 'image'">
						<MkButton @click="chooseImage(k, $event)">{{ $ts._rooms.chooseImage }}</MkButton>
					</template>
					<template v-else-if="selectedFurnitureInfo.props[k] === 'color'">
						<input type="color" :value="selectedFurnitureProps ? selectedFurnitureProps[k] : null" @change="updateColor(k, $event)"/>
					</template>
				</div>
			</template>
		</div>
		<div class="_content">
			<MkButton inline :primary="isTranslateMode" @click="translate()"><i class="fas fa-arrows-alt"></i> {{ $ts._rooms.translate }}</MkButton>
			<MkButton inline :primary="isRotateMode" @click="rotate()"><i class="fas fa-undo"></i> {{ $ts._rooms.rotate }}</MkButton>
			<MkButton v-if="isTranslateMode || isRotateMode" inline @click="exit()"><i class="fas fa-ban"></i> {{ $ts._rooms.exit }}</MkButton>
		</div>
		<div class="_content">
			<MkButton @click="remove()"><i class="fas fa-trash-alt"></i> {{ $ts._rooms.remove }}</MkButton>
		</div>
	</div>

	<div v-if="isMyRoom" class="menu _section">
		<div class="_content">
			<MkButton @click="add()"><i class="fas fa-box-open"></i> {{ $ts._rooms.addFurniture }}</MkButton>
		</div>
		<div class="_content">
			<MkSelect :model-value="roomType" @update:modelValue="updateRoomType($event)">
				<template #label>{{ $ts._rooms.roomType }}</template>
				<option value="default">{{ $ts._rooms._roomType.default }}</option>
				<option value="washitsu">{{ $ts._rooms._roomType.washitsu }}</option>
			</MkSelect>
			<label v-if="roomType === 'default'">
				<span>{{ $ts._rooms.carpetColor }}</span>
				<input type="color" :value="carpetColor" @change="updateCarpetColor($event)"/>
			</label>
		</div>
		<div class="_content">
			<MkButton inline :disabled="!changed" primary @click="save()"><i class="fas fa-save"></i> {{ $ts.save }}</MkButton>
			<MkButton inline @click="clear()"><i class="fas fa-broom"></i> {{ $ts._rooms.clear }}</MkButton>
		</div>
	</div>
</div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { Room } from '@/scripts/room/room';
import * as Acct from 'misskey-js/built/acct';
import XPreview from './preview.vue';
const storeItems = require('@/scripts/room/furnitures.json5');
import { query as urlQuery } from '@/scripts/url';
import MkButton from '@/components/ui/button.vue';
import MkSelect from '@/components/form/select.vue';
import { selectFile } from '@/scripts/select-file';
import * as os from '@/os';
import { ColdDeviceStorage } from '@/store';
import * as symbols from '@/symbols';

let room: Room;

export default defineComponent({
	components: {
		XPreview,
		MkButton,
		MkSelect,
	},

	beforeRouteLeave(to, from, next) {
		if (this.changed) {
			os.confirm({
				type: 'warning',
				text: this.$ts.leaveConfirm,
			}).then(({ canceled }) => {
				if (canceled) {
					next(false);
				} else {
					next();
				}
			});
		} else {
			next();
		}
	},

	props: {
		acct: {
			type: String,
			required: true
		},
	},

	data() {
		return {
			[symbols.PAGE_INFO]: computed(() => this.user ? {
				title: this.$ts.room,
				avatar: this.user,
			} : null),
			user: null,
			objectSelected: false,
			selectedFurnitureName: null,
			selectedFurnitureInfo: null,
			selectedFurnitureProps: null,
			roomType: null,
			carpetColor: null,
			isTranslateMode: false,
			isRotateMode: false,
			isMyRoom: false,
			changed: false,
		};
	},

	async mounted() {
		window.addEventListener('beforeunload', this.beforeunload);

		this.user = await os.api('users/show', {
			...Acct.parse(this.acct)
		});

		this.isMyRoom = this.$i && (this.$i.id === this.user.id);

		const roomInfo = await os.api('room/show', {
			userId: this.user.id
		});

		this.roomType = roomInfo.roomType;
		this.carpetColor = roomInfo.carpetColor;

		room = new Room(this.user, this.isMyRoom, roomInfo, this.$el, {
			graphicsQuality: ColdDeviceStorage.get('roomGraphicsQuality'),
			onChangeSelect: obj => {
				this.objectSelected = obj != null;
				if (obj) {
					const f = room.findFurnitureById(obj.name);
					this.selectedFurnitureName = this.$t('_rooms._furnitures.' + f.type);
					this.selectedFurnitureInfo = storeItems.find(x => x.id === f.type);
					this.selectedFurnitureProps = f.props
						? JSON.parse(JSON.stringify(f.props)) // Disable reactivity
						: null;
					this.$nextTick(() => {
						this.$refs.preview.selected(obj);
					});
				}
			},
			useOrthographicCamera: ColdDeviceStorage.get('roomUseOrthographicCamera'),
		});
	},

	beforeUnmount() {
		room.destroy();
		window.removeEventListener('beforeunload', this.beforeunload);
	},

	methods: {
		beforeunload(e: BeforeUnloadEvent) {
			if (this.changed) {
				e.preventDefault();
				e.returnValue = '';
			}
		},

		async add() {
			const { canceled, result: id } = await os.select({
				title: this.$ts._rooms.addFurniture,
				items: storeItems.map(item => ({
					value: item.id, text: this.$t('_rooms._furnitures.' + item.id)
				}))
			});
			if (canceled) return;
			room.addFurniture(id);
			this.changed = true;
		},

		remove() {
			this.isTranslateMode = false;
			this.isRotateMode = false;
			room.removeFurniture();
			this.changed = true;
		},

		save() {
			os.api('room/update', {
				room: room.getRoomInfo()
			}).then(() => {
				this.changed = false;
				os.success();
			}).catch((e: any) => {
				os.alert({
					type: 'error',
					text: e.message
				});
			});
		},

		clear() {
			os.confirm({
				type: 'warning',
				text: this.$ts._rooms.clearConfirm,
			}).then(({ canceled }) => {
				if (canceled) return;
				room.removeAllFurnitures();
				this.changed = true;
			});
		},

		chooseImage(key, e) {
			selectFile(e.currentTarget || e.target, null, false).then(file => {
				room.updateProp(key, `/proxy/?${urlQuery({ url: file.thumbnailUrl })}`);
				this.$refs.preview.selected(room.getSelectedObject());
				this.changed = true;
			});
		},

		updateColor(key, ev) {
			room.updateProp(key, ev.target.value);
			this.$refs.preview.selected(room.getSelectedObject());
			this.changed = true;
		},

		updateCarpetColor(ev) {
			room.updateCarpetColor(ev.target.value);
			this.carpetColor = ev.target.value;
			this.changed = true;
		},

		updateRoomType(type) {
			room.changeRoomType(type);
			this.roomType = type;
			this.changed = true;
		},

		translate() {
			if (this.isTranslateMode) {
				this.exit();
			} else {
				this.isRotateMode = false;
				this.isTranslateMode = true;
				room.enterTransformMode('translate');
			}
			this.changed = true;
		},

		rotate() {
			if (this.isRotateMode) {
				this.exit();
			} else {
				this.isTranslateMode = false;
				this.isRotateMode = true;
				room.enterTransformMode('rotate');
			}
			this.changed = true;
		},

		exit() {
			this.isTranslateMode = false;
			this.isRotateMode = false;
			room.exitTransformMode();
			this.changed = true;
		}
	}
});
</script>

<style lang="scss" scoped>
.hveuntkp {
	position: relative;
	min-height: 500px;

	> ::v-deep(canvas) {
		display: block;
	}
}
</style>
