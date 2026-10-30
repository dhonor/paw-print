// pages/bookings/bookings.js
// 我的预约：待服务 → 已完成 → 评价，形成履约闭环。

const { bookingStore } = require('../../utils/booking-store');
const { petStore } = require('../../utils/pet-store');
const { formatDate } = require('../../utils/date');
const feedback = require('../../utils/feedback');

const FILTERS = ['全部', '待服务', '已完成', '已取消'];
const STATUS_CLASS = {
    '待服务': 'warn',
    '已完成': 'done',
    '已取消': 'off',
};

Page({
    data: {
        viewState: 'loading',
        filters: FILTERS,
        filterIndex: 0,
        counts: {},
        items: [],
    },

    onShow() {
        this.load();
    },

    onPullDownRefresh() {
        const done = () => wx.stopPullDownRefresh();
        const result = this.load();
        if (result && typeof result.then === 'function') {
            result.then(done, done);
        } else {
            setTimeout(done, 500);
        }
    },

    load() {
        this.setData({ viewState: 'loading' });
        return Promise.all([bookingStore.list(), petStore.list()]).then(results => {
            if (results[0].error || results[1].error) {
                this.setData({ viewState: 'error' });
                return;
            }
            const pets = results[1].data || [];
            const petNameMap = {};
            pets.forEach(pet => { petNameMap[String(pet.id)] = pet.name; });

            const all = (results[0].data || []).map(item => ({
                id: item.id,
                placeName: item.placeName,
                placeAddress: item.placeAddress || '',
                placeTel: item.placeTel || '',
                serviceType: item.serviceType,
                date: formatDate(item.date),
                timeSlot: item.timeSlot,
                petName: petNameMap[String(item.petId)] || '未知宠物',
                status: item.status,
                statusClass: STATUS_CLASS[item.status] || 'off',
                rating: item.rating || 0,
                review: item.review || '',
                note: item.note || '',
                canRate: item.status === '已完成' && !(item.rating > 0),
            }));

            const counts = { '全部': all.length };
            for (let i = 1; i < FILTERS.length; i += 1) {
                const key = FILTERS[i];
                counts[key] = all.filter(item => item.status === key).length;
            }

            this.all = all;
            this.setData({
                counts,
                viewState: all.length === 0 ? 'empty' : 'ready',
            });
            this.applyFilter();
        });
    },

    applyFilter() {
        const all = this.all || [];
        const key = this.data.filters[this.data.filterIndex];
        const items = key === '全部' ? all : all.filter(item => item.status === key);
        this.setData({ items });
    },

    onFilterTap(event) {
        this.setData({ filterIndex: Number(event.currentTarget.dataset.index) });
        this.applyFilter();
    },

    onComplete(event) {
        const id = event.currentTarget.dataset.id;
        wx.showModal({
            title: '确认完成',
            content: '确认这次服务已经到店完成？',
            confirmColor: '#ff8a65',
            success: res => {
                if (!res.confirm) {
                    return;
                }
                bookingStore.update(id, { status: '已完成' }).then(() => {
                    feedback.success('已完成');
                    this.load();
                });
            },
        });
    },

    onCancel(event) {
        const id = event.currentTarget.dataset.id;
        wx.showModal({
            title: '取消预约',
            content: '取消后需要重新预约',
            confirmColor: '#e2574c',
            success: res => {
                if (!res.confirm) {
                    return;
                }
                bookingStore.update(id, { status: '已取消' }).then(() => this.load());
            },
        });
    },

    onRate(event) {
        const id = event.currentTarget.dataset.id;
        wx.showActionSheet({
            itemList: ['5 星 - 非常满意', '4 星', '3 星 - 一般', '2 星', '1 星 - 不满意'],
            success: sheet => {
                const rating = 5 - sheet.tapIndex;
                wx.showModal({
                    title: rating + ' 星',
                    editable: true,
                    placeholderText: '说说这次服务（可选）',
                    confirmColor: '#ff8a65',
                    success: modal => {
                        if (!modal.confirm) {
                            return;
                        }
                        bookingStore.rate(id, {
                            rating,
                            review: (modal.content || '').trim(),
                        }).then(result => {
                            if (result.error) {
                                feedback.error(result.error.message || '评价失败');
                                return;
                            }
                            feedback.success('已评价');
                            this.load();
                        });
                    },
                });
            },
        });
    },

    onCall(event) {
        const tel = event.currentTarget.dataset.tel;
        if (!tel) {
            feedback.toast('该门店未提供电话');
            return;
        }
        wx.makePhoneCall({ phoneNumber: tel });
    },

    goNearby() {
        wx.redirectTo({ url: '/pages/nearby/nearby' });
    },
});
