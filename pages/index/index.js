// pages/index/index.js
// 首页聚合页：组合读取宠物与记录两个数据层，做概览展示。
// onShow 每次进入都刷新，保证从其他页面返回时数据最新。
// 同时聚合近 14 天的「异常」记录，主动给出健康预警。

const { petStore } = require('../../utils/pet-store');
const { recordStore } = require('../../utils/record-store');
const { formatDate, daysBetween } = require('../../utils/date');
const { reminderStore } = require('../../utils/reminder-store');
const { setReminderBadge } = require('../../utils/badge');
const { seedDemo } = require('../../utils/seed');
const { stopRefresh } = require('../../utils/page');
const feedback = require('../../utils/feedback');

// 记录类型用「浅底 + 同色文字」，比实心色块更轻，信息密度也更好
const TYPE_TINT = {
    '体重': '#fff0e9',
    '疫苗': '#e8f5ef',
    '驱虫': '#fdf2e2',
    '就医': '#ffeee8',
    '异常': '#ffeee8',
    '其他': '#fbf1e9',
};

const TYPE_COLOR = {
    '体重': '#ff8a65',
    '疫苗': '#2fa97c',
    '驱虫': '#e6a23c',
    '就医': '#e2574c',
    '异常': '#e2574c',
    '其他': '#806b5e',
};

function diffText(d) {
    if (d === 0) {
        return '今天';
    }
    if (d === 1) {
        return '昨天';
    }
    return d + '天前';
}

Page({
    data: {
        showSplash: true,
        splashHide: false,
        showPrivacy: false,
        viewState: 'loading',
        errorMessage: '',
        todoList: [],
        todoCount: 0,
        pets: [],
        recentRecords: [],
        anomalyAlerts: [],
        typeColor: TYPE_COLOR,
        typeTint: TYPE_TINT,
    },

    onLoad() {
        // 隐私授权检查放在最前面：下面的启动动画分支有 return，放后面会漏执行
        this.checkPrivacy();

        const app = getApp();
        const globalData = app && app.globalData ? app.globalData : null;
        // 只有本次启动的第一个页面播启动动画，热重载或再次进入首页不重复播放
        if (globalData && globalData.showLaunchSplash === false) {
            this.setData({ showSplash: false });
            return;
        }
        if (globalData) {
            globalData.showLaunchSplash = false;
        }

        // 启动动画：先淡出覆盖层，再移除节点，避免遮挡首页交互
        this.splashTimer = setTimeout(() => {
            this.setData({ splashHide: true });
        }, 1100);
        this.splashRemoveTimer = setTimeout(() => {
            this.setData({ showSplash: false });
        }, 1600);
    },

    // 官方隐私授权：需要时由用户点击确认，再交给 wx.requirePrivacyAuthorize
    checkPrivacy() {
        if (!wx.getPrivacySetting) {
            return;
        }
        wx.getPrivacySetting({
            success: res => {
                if (res && res.needAuthorization) {
                    this.setData({ showPrivacy: true });
                }
            },
        });
    },

    // 遮罩上阻止滚动穿透
    noop() {},

    openPrivacy() {
        wx.navigateTo({ url: '/pages/privacy/privacy' });
    },

    closePrivacy() {
        this.setData({ showPrivacy: false });
    },

    agreePrivacy() {
        const done = () => this.setData({ showPrivacy: false });
        if (wx.requirePrivacyAuthorize) {
            wx.requirePrivacyAuthorize({ success: done, fail: done });
            return;
        }
        // 低版本基础库没有该接口，直接关闭提示
        done();
    },

    onUnload() {
        if (this.splashTimer) {
            clearTimeout(this.splashTimer);
        }
        if (this.splashRemoveTimer) {
            clearTimeout(this.splashRemoveTimer);
        }
    },

    // 第一次进入才显示骨架屏，返回首页时复用旧数据静默刷新，避免闪一下
    onShow() {
        this.loadData();
    },

    onPullDownRefresh() {
        stopRefresh(this.loadData());
    },

    loadData() {
        if (this.data.pets.length === 0) {
            this.setData({ viewState: 'loading' });
        }
        return Promise.all([
            petStore.list(),
            // 首页只需要最近一段时间的数据：后端上限 200，这里取 100 条足够
            recordStore.list({ take: 100 }),
            reminderStore.list(),
        ]).then(results => {
            const petsResult = results[0];
            const recordsResult = results[1];
            if (petsResult.error || recordsResult.error) {
                const fail = petsResult.error || recordsResult.error;
                this.setData({
                    viewState: 'error',
                    // 把真实原因带出来，避免只看到一个没有信息量的「加载失败」
                    errorMessage: (fail && fail.message) || '请求失败',
                });
                return;
            }
            const pets = petsResult.data || [];
            const allRecords = recordsResult.data || [];
            const recent = allRecords.slice(0, 5).map(record => ({
                id: record.id,
                petName: findPetName(pets, record.petId),
                type: record.type,
                date: formatDate(record.date),
                value: record.value || '',
                note: record.note || '',
            }));
            const reminders = results[2].data || [];
            const todo = buildTodoList(reminders, pets);
            // 用刚拿到的提醒直接更新 tabBar 徽标，省掉一次重复请求；
            // 提醒拉取失败时不动徽标，避免误清掉已有数字
            if (!results[2].error) {
                setReminderBadge(reminders);
            }
            this.setData({
                pets,
                recentRecords: recent,
                todoList: todo.slice(0, 3),
                todoCount: todo.length,
                anomalyAlerts: buildAnomalyAlerts(pets, allRecords),
                viewState: pets.length === 0 ? 'empty' : 'ready',
            });
        });
    },

    onShareAppMessage() {
        return {
            title: '爪印 · 记录每个毛孩子的成长',
            path: '/pages/index/index',
        };
    },

    onPetTap(event) {
        const id = event.detail.id;
        wx.navigateTo({ url: '/pages/pet-detail/pet-detail?id=' + id });
    },

    goPets() {
        wx.switchTab({ url: '/pages/pet-list/pet-list' });
    },

    goRecords() {
        wx.navigateTo({ url: '/pages/record/record' });
    },

    goNearby() {
        wx.navigateTo({ url: '/pages/nearby/nearby' });
    },

    goReminders() {
        wx.navigateTo({ url: '/pages/reminders/reminders' });
    },

    // 空态里的「先看看示例」：用户主动触发才写入示例数据
    loadDemo() {
        wx.showLoading({ title: '准备示例数据', mask: true });
        seedDemo().then(created => {
            wx.hideLoading();
            if (!created) {
                feedback.toast('已经有宠物档案了');
                return;
            }
            feedback.success('已载入示例');
            this.loadData();
        }).catch(() => {
            wx.hideLoading();
            feedback.error('载入失败，请重试');
        });
    },
});

function findPetName(pets, petId) {
    for (let i = 0; i < pets.length; i += 1) {
        if (String(pets[i].id) === String(petId)) {
            return pets[i].name;
        }
    }
    return '未知宠物';
}

// 聚合近 14 天内 type=异常 的记录，按宠物合并症状，生成主动预警
// 待办提醒：把开启中的提醒按到期先后排序，逾期的最靠前
function buildTodoList(reminders, pets) {
    const list = [];
    for (let i = 0; i < reminders.length; i += 1) {
        const item = reminders[i];
        if (item.enabled === false) {
            continue;
        }
        const diff = daysBetween(item.nextDate);
        if (diff === null) {
            continue;
        }
        list.push({
            id: item.id,
            type: item.type,
            petName: findPetName(pets, item.petId),
            diff,
            daysText: diff < 0 ? '逾期 ' + (-diff) + ' 天' : (diff === 0 ? '今天' : '还有 ' + diff + ' 天'),
            urgent: diff <= 0,
        });
    }
    list.sort((a, b) => a.diff - b.diff);
    return list;
}

function buildAnomalyAlerts(pets, allRecords) {
    const groups = {};
    for (let i = 0; i < allRecords.length; i += 1) {
        const rec = allRecords[i];
        if (rec.type !== '异常') {
            continue;
        }
        const diff = daysBetween(rec.date);
        if (diff === null || diff < 0 || diff > 14) {
            continue;
        }
        const pid = String(rec.petId);
        if (!groups[pid]) {
            groups[pid] = {
                petId: pid,
                petName: findPetName(pets, pid),
                symptoms: [],
                days: diff,
            };
        }
        if (rec.anomaly) {
            const list = rec.anomaly.split('、');
            for (let j = 0; j < list.length; j += 1) {
                if (groups[pid].symptoms.indexOf(list[j]) === -1) {
                    groups[pid].symptoms.push(list[j]);
                }
            }
        }
        if (diff < groups[pid].days) {
            groups[pid].days = diff;
        }
    }
    return Object.keys(groups).map(pid => {
        const g = groups[pid];
        return {
            petId: g.petId,
            petName: g.petName,
            symptomText: g.symptoms.join('、') || '异常状况',
            daysText: diffText(g.days),
        };
    });
}
