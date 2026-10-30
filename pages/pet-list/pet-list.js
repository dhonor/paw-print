// pages/pet-list/pet-list.js
// 宠物档案列表：复用 list-crud 骨架的“加载/空/错误”三态与删除二次确认。
// 列表项点击进入编辑页；右下角 + 进入新建页。删除只移除此宠物，关联记录保留。

const { petStore } = require('../../utils/pet-store');
const feedback = require('../../utils/feedback');
const { ageText } = require('../../utils/date');
const { avatarSrc, FALLBACK } = require('../../utils/icons');

Page({
    data: {
        viewState: 'loading',
        pets: [],
    },

    onShow() {
        this.loadPets();
    },

    onPullDownRefresh() {
        const done = () => wx.stopPullDownRefresh();
        const result = this.loadPets();
        if (result && typeof result.then === 'function') {
            result.then(done, done);
        } else {
            setTimeout(done, 500);
        }
    },

    loadPets() {
        this.setData({ viewState: 'loading' });
        return petStore.list().then(result => {
            if (result.error) {
                this.setData({ viewState: 'error' });
                return;
            }
            const pets = (result.data || []).map(pet => ({
                id: pet.id,
                name: pet.name,
                species: pet.species,
                gender: pet.gender,
                breed: pet.breed || '',
                ageText: ageText(pet.birthday),
                avatarSrc: avatarSrc(pet.avatar),
            }));
            this.setData({
                pets,
                viewState: pets.length === 0 ? 'empty' : 'ready',
            });
        });
    },

    // 头像加载失败时回退到默认爪印
    onAvatarError(event) {
        const index = Number(event.currentTarget.dataset.index);
        if (!this.data.pets[index] || this.data.pets[index].avatarSrc === FALLBACK) {
            return;
        }
        const patch = {};
        patch['pets[' + index + '].avatarSrc'] = FALLBACK;
        this.setData(patch);
    },

    openCreate() {
        wx.navigateTo({ url: '/pages/pet-edit/pet-edit' });
    },

    openEdit(event) {
        const id = event.currentTarget.dataset.id;
        wx.navigateTo({ url: '/pages/pet-detail/pet-detail?id=' + id });
    },

    handleDelete(event) {
        const id = event.currentTarget.dataset.id;
        wx.showModal({
            title: '确认删除',
            content: '删除后该宠物档案会被移除，但已产生的记录仍会留存。',
            confirmColor: '#ff8a65',
            success: res => {
                if (!res.confirm) {
                    return;
                }
                petStore.remove(id).then(result => {
                    if (result.error) {
                        feedback.error(result.error.message || '删除失败');
                        return;
                    }
                    this.loadPets();
                });
            },
        });
    },
});
