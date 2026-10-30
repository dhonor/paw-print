// pages/booking/booking.js
// 预约表单：从「周边服务」的门店进入，选宠物、服务类型、日期与时段。
// 提交后进入「我的预约」，走 待服务 → 已完成 → 评价 的闭环。

const { petStore } = require('../../utils/pet-store');
const feedback = require('../../utils/feedback');
const { bookingStore, SERVICE_TYPES, TIME_SLOTS } = require('../../utils/booking-store');
const { getCurrentMember } = require('../../utils/family-store');
const { today } = require('../../utils/date');

Page({
    data: {
        viewState: 'loading',
        place: {
            name: '',
            address: '',
            tel: '',
        },
        pets: [],
        petOptions: [],
        petIndex: 0,
        serviceTypes: SERVICE_TYPES,
        serviceIndex: 0,
        slots: TIME_SLOTS,
        slotIndex: 0,
        date: '',
        note: '',
        operator: '我自己',
        error: '',
        submitting: false,
    },

    onLoad(options) {
        const place = {
            name: decode(options && options.name),
            address: decode(options && options.address),
            tel: decode(options && options.tel),
        };
        this.setData({ place, date: today() });
        this.loadPets();
        getCurrentMember().then(result => {
            this.setData({ operator: result.data ? result.data.name : '我自己' });
        });
    },

    loadPets() {
        petStore.list().then(result => {
            const pets = result.data || [];
            if (result.error || pets.length === 0) {
                this.setData({ viewState: pets.length === 0 ? 'no-pet' : 'error' });
                return;
            }
            this.setData({
                pets,
                petOptions: pets.map(pet => pet.name),
                viewState: 'ready',
            });
        });
    },

    onPet(event) {
        this.setData({ petIndex: Number(event.detail.value) });
    },

    onService(event) {
        this.setData({ serviceIndex: Number(event.detail.value) });
    },

    onSlot(event) {
        this.setData({ slotIndex: Number(event.detail.value) });
    },

    onDate(event) {
        this.setData({ date: event.detail.value });
    },

    onNote(event) {
        this.setData({ note: event.detail.value });
    },

    submit() {
        if (this.data.submitting) {
            return;
        }
        const pet = this.data.pets[this.data.petIndex];
        if (!pet) {
            this.setData({ error: '请选择宠物' });
            return;
        }
        if (this.data.date === '') {
            this.setData({ error: '请选择预约日期' });
            return;
        }
        this.setData({ submitting: true, error: '' });
        bookingStore.create({
            petId: pet.id,
            placeName: this.data.place.name || '周边服务门店',
            placeAddress: this.data.place.address,
            placeTel: this.data.place.tel,
            serviceType: this.data.serviceTypes[this.data.serviceIndex],
            date: this.data.date,
            timeSlot: this.data.slots[this.data.slotIndex],
            note: this.data.note,
            status: '待服务',
            operator: this.data.operator,
        }).then(result => {
            this.setData({ submitting: false });
            if (result.error) {
                this.setData({ error: result.error.message || '预约失败' });
                return;
            }
            feedback.success('预约已提交');
            setTimeout(() => {
                wx.redirectTo({ url: '/pages/bookings/bookings' });
            }, 600);
        });
    },

    goNearby() {
        wx.navigateBack({
            fail: () => {
                wx.redirectTo({ url: '/pages/nearby/nearby' });
            },
        });
    },

    goAddPet() {
        wx.navigateTo({ url: '/pages/pet-edit/pet-edit' });
    },
});

function decode(value) {
    if (!value) {
        return '';
    }
    try {
        return decodeURIComponent(value);
    } catch (e) {
        return value;
    }
}
