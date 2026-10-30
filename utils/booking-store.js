// utils/booking-store.js
// 服务预约：从「周边服务」的 POI 发起预约，走「待服务 → 已完成 → 评价」的闭环。
//
// 说明：真正的门店排期、到店核销、技师/医生选择需要商户端系统（B 端接口）。
// 这里把预约存在本地，字段按履约闭环设计，后续换成云数据库或商户 API 时页面不用改。

const { createLocalStore } = require('./local-store');
const { createRemoteStore } = require('./remote-store');
const { useRemote } = require('./config');

const SERVICE_TYPES = ['医院挂号', '美容洗护', '寄养', '乐园', '上门喂养'];
const TIME_SLOTS = ['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00', '19:00-21:00'];
const BOOKING_STATUS = ['待服务', '已完成', '已取消'];

const localBookingStore = createLocalStore({
    storageKey: 'paw-print-bookings',
    fields: [
        { key: 'petId', type: 'string', required: true, label: '宠物' },
        { key: 'placeName', type: 'string', required: true, label: '门店' },
        { key: 'placeAddress', type: 'string' },
        { key: 'placeTel', type: 'string' },
        { key: 'serviceType', type: 'enum', values: SERVICE_TYPES, default: SERVICE_TYPES[0] },
        { key: 'date', type: 'string', required: true, label: '预约日期' },
        { key: 'timeSlot', type: 'enum', values: TIME_SLOTS, default: TIME_SLOTS[0] },
        { key: 'note', type: 'string' },
        { key: 'status', type: 'enum', values: BOOKING_STATUS, default: '待服务' },
        { key: 'rating', type: 'number', default: 0 },
        { key: 'review', type: 'string' },
        { key: 'operator', type: 'string' },
    ],
});

// 评价：远端走 POST /bookings/:id/rate（仅已完成可评），本地直接更新字段
const bookingStore = useRemote
    ? createRemoteStore({
        resource: 'bookings',
        actions: {
            rate: (id, payload) => ({ method: 'POST', path: '/bookings/' + id + '/rate', data: payload }),
        },
    })
    : Object.assign({}, localBookingStore, {
        rate(id, payload) {
            return localBookingStore.update(id, payload);
        },
    });

module.exports = {
    bookingStore,
    SERVICE_TYPES,
    TIME_SLOTS,
    BOOKING_STATUS,
};
