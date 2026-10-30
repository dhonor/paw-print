// utils/reminder-store.js
// 提醒中心的数据模型：疫苗、驱虫、洗澡、喂食、复诊等周期性事项。
//
// 设计要点：
// 1. 每条提醒只存「下次日期 + 周期天数」，完成一次后自动顺延，不用手工算日子；
// 2. 是否到期由页面用 utils/date.js 现算，避免存冗余状态导致过期不更新；
// 3. 小程序订阅消息（真正推送到微信）需要模板 ID，属于后端/云开发范畴，这里只做本地到期提醒。

const { createLocalStore } = require('./local-store');
const { createRemoteStore } = require('./remote-store');
const { useRemote } = require('./config');
const { addDays } = require('./date');

const REMINDER_TYPES = ['疫苗', '驱虫', '洗澡', '喂食', '复诊', '喂药', '其他'];

// 各类型的默认周期（天），新建提醒时作为初始值
const TYPE_CYCLE = {
    '疫苗': 365,
    '驱虫': 90,
    '洗澡': 30,
    '喂食': 1,
    '复诊': 30,
    '喂药': 1,
    '其他': 30,
};

const TYPE_META = {
    '疫苗': { icon: 'syringe', color: '#2fa97c' },
    '驱虫': { icon: 'pill', color: '#e6a23c' },
    '洗澡': { icon: 'droplet', color: '#ff8a65' },
    '喂食': { icon: 'bowl', color: '#806b5e' },
    '复诊': { icon: 'hospital', color: '#e2574c' },
    '喂药': { icon: 'pill', color: '#e2574c' },
    '其他': { icon: 'pin', color: '#806b5e' },
};

const localReminderStore = createLocalStore({
    storageKey: 'paw-print-reminders',
    fields: [
        { key: 'petId', type: 'string', required: true, label: '宠物' },
        { key: 'type', type: 'enum', values: REMINDER_TYPES, default: '疫苗' },
        { key: 'cycleDays', type: 'number', default: 30 },
        { key: 'nextDate', type: 'string', required: true, label: '下次日期' },
        { key: 'enabled', type: 'boolean', default: true },
        { key: 'note', type: 'string' },
    ],
});

// 完成一次：远端走服务端顺延（多端一致），本地用同一套 addDays 计算
const reminderStore = useRemote
    ? createRemoteStore({
        resource: 'reminders',
        actions: {
            complete: id => ({ method: 'POST', path: '/reminders/' + id + '/complete' }),
        },
    })
    : Object.assign({}, localReminderStore, {
        complete(id) {
            return localReminderStore.list().then(result => {
                if (result.error) {
                    return result;
                }
                const items = result.data || [];
                const target = items.find(item => String(item.id) === String(id));
                if (!target) {
                    return { data: null, error: { code: 'NOT_FOUND', message: '提醒不存在' } };
                }
                return localReminderStore.update(id, {
                    nextDate: addDays(target.nextDate, target.cycleDays),
                });
            });
        },
    });

module.exports = {
    reminderStore,
    REMINDER_TYPES,
    TYPE_CYCLE,
    TYPE_META,
};
