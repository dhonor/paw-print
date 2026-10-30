// pages/pet-edit/pet-edit.js
// 宠物新增/编辑页。通过 URL query 的 id 区分两种模式：
// 有 id → 编辑（先拉取原数据回填）；无 id → 新建。保存时调用 petStore。

const { petStore, SPECIES, GENDERS, STERILIZED } = require('../../utils/pet-store');
const { avatarKey } = require('../../utils/icons');
const { pickAndUpload } = require('../../utils/upload');
const feedback = require('../../utils/feedback');

const AVATARS = ['dog', 'cat', 'rabbit', 'hamster', 'bird', 'fish', 'turtle', 'lizard'];

Page({
    data: {
        mode: 'create',
        petId: '',
        name: '',
        speciesOptions: SPECIES,
        speciesIndex: 0,
        genderOptions: GENDERS,
        genderIndex: 2,
        breed: '',
        birthday: '',
        avatarOptions: AVATARS,
        avatarIndex: 0,
        avatarCustom: '',
        uploading: false,
        microchip: '',
        emergencyContact: '',
        sterilizedOptions: STERILIZED,
        sterilizedIndex: 0,
        note: '',
        error: '',
        saving: false,
    },

    onLoad(options) {
        if (options && options.id) {
            this.setData({ mode: 'edit', petId: options.id });
            this.loadPet(options.id);
        }
    },

    loadPet(id) {
        petStore.list().then(result => {
            const pets = result.data || [];
            let pet = null;
            for (let i = 0; i < pets.length; i += 1) {
                if (String(pets[i].id) === String(id)) {
                    pet = pets[i];
                    break;
                }
            }
            if (!pet) {
                this.setData({ error: '宠物不存在' });
                return;
            }
            this.setData({
                name: pet.name,
                speciesIndex: Math.max(0, SPECIES.indexOf(pet.species)),
                genderIndex: Math.max(0, GENDERS.indexOf(pet.gender)),
                breed: pet.breed || '',
                birthday: pet.birthday || '',
                avatarCustom: /^https?:\/\//.test(pet.avatar || '') ? pet.avatar : '',
                avatarIndex: /^https?:\/\//.test(pet.avatar || '') ? -1 : Math.max(0, AVATARS.indexOf(avatarKey(pet.avatar))),
                microchip: pet.microchip || '',
                emergencyContact: pet.emergencyContact || '',
                sterilizedIndex: Math.max(0, STERILIZED.indexOf(pet.sterilized)),
                note: pet.note || '',
            });
        });
    },

    onName(event) {
        this.setData({ name: event.detail.value, error: '' });
    },

    onBreed(event) {
        this.setData({ breed: event.detail.value });
    },

    onNote(event) {
        this.setData({ note: event.detail.value });
    },

    onSpecies(event) {
        this.setData({ speciesIndex: Number(event.detail.value) });
    },

    onGender(event) {
        this.setData({ genderIndex: Number(event.detail.value) });
    },

    onBirthday(event) {
        this.setData({ birthday: event.detail.value });
    },

    onAvatar(event) {
        this.setData({
            avatarIndex: Number(event.currentTarget.dataset.index),
            avatarCustom: '',
        });
    },

    // 自定义头像加载失败时清空，回落到预设图标
    onAvatarError() {
        if (this.data.avatarCustom === '') {
            return;
        }
        this.setData({ avatarCustom: '', avatarIndex: 0 });
    },

    // 上传照片作为头像
    onUploadAvatar() {
        if (this.data.uploading) {
            return;
        }
        this.setData({ uploading: true });
        pickAndUpload().then(result => {
            this.setData({ uploading: false });
            if (result.error) {
                feedback.toast(result.error.message);
                return;
            }
            this.setData({ avatarCustom: result.data.url, avatarIndex: -1 });
        });
    },

    onMicrochip(event) {
        this.setData({ microchip: event.detail.value });
    },

    onEmergencyContact(event) {
        this.setData({ emergencyContact: event.detail.value });
    },

    onSterilized(event) {
        this.setData({ sterilizedIndex: Number(event.detail.value) });
    },

    save() {
        if (this.data.saving) {
            return;
        }
        const name = this.data.name.trim();
        if (name === '') {
            this.setData({ error: '请填写宠物昵称' });
            return;
        }
        const payload = {
            name,
            species: SPECIES[this.data.speciesIndex],
            gender: GENDERS[this.data.genderIndex],
            breed: this.data.breed,
            birthday: this.data.birthday,
            avatar: this.data.avatarCustom || AVATARS[this.data.avatarIndex] || AVATARS[0],
            microchip: this.data.microchip,
            emergencyContact: this.data.emergencyContact,
            sterilized: STERILIZED[this.data.sterilizedIndex],
            note: this.data.note,
        };
        this.setData({ saving: true, error: '' });
        const request = this.data.mode === 'edit'
            ? petStore.update(this.data.petId, payload)
            : petStore.create(payload);
        request.then(result => {
            this.setData({ saving: false });
            if (result.error) {
                this.setData({ error: result.error.message || '保存失败' });
                return;
            }
            wx.navigateBack();
        });
    },
});
