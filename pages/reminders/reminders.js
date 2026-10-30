// pages/reminders/reminders.js
// 提醒中心：疫苗、驱虫、洗澡、喂食、复诊等周期性事项。
// 每项提醒只存「下次日期 + 周期」，完成后自动顺延，避免用户自己算日子。

const { petStore } = require('../../utils/pet-store');
const { reminderStore, REMINDER_TYPES, TYPE_CYCLE, TYPE_META } = require('../../utils/reminder-store');
const { daysBetween, addDays, today } = require('../../utils/date');
const feedback = require('../../utils/feedback');
const { requestSubscribe } = require('../../utils/notify');

Page({
    data: {
        viewState: 'loading',
        items: [],
        pendingCount: 0,
        summary: '',
        pets: [],
        petOptions: [],
        typeOptions: REMINDER_TYPES,
        typeIndex: 0,
        showEditor: false,
        editorPetIndex: 0,
        cycleDays: TYPE_CYCLE[REMINDER_TYPES[0]],
        nextDate: '',
        note: '',
        error: '',
        submitting: false,
        sheetOffset: 0,
    },

    onShow() {
        this.loadData();
    },

    // 开启微信提醒：用户点「允许」后，后端获得一次可发送额度
    onSubscribe() {
        requestSubscribe().then(result => {
            if (result.error) {
                if (result.error.code === 'NO_TEMPLATE') {
                    feedback.toast('还没有配置订阅消息模板');
                    return;
                }
                if (result.error.code === 'DENIED') {
                    feedback.toast('未开启，可在右上角设置里重新允许');
                    return;
                }
                feedback.error(result.error.message || '订阅失败');
                return;
            }
            feedback.success('已开启微信提醒');
        });
    },

    onPullDownRefresh() {
        const done = () => wx.stopPullDownRefresh();
        const result = this.loadData();
        if (result && typeof result.then === 'function') {
            result.then(done, done);
        } else {
            setTimeout(done, 500);
        }
    },

    loadData() {
        this.setData({ viewState: 'loading' });
        return Promise.all([petStore.list(), reminderStore.list()]).then(results => {
            const petsResult = results[0];
            const reminderResult = results[1];
            if (petsResult.error || reminderResult.error) {
                this.setData({ viewState: 'error' });
                return;
            }
            const pets = petsResult.data || [];
            this.raws = reminderResult.data || [];
            if (pets.length === 0) {
                this.setData({ pets, petOptions: [], items: [], viewState: 'empty' });
                return;
            }
            const petNameMap = {};
            pets.forEach(pet => { petNameMap[String(pet.id)] = pet.name; });
            const items = this.raws.map(raw => decorate(raw, petNameMap));
            items.sort(compareItem);
            const pendingCount = items.filter(item => item.enabled && item.daysLeft <= 0).length;
            this.setData({
                pets,
                petOptions: pets.map(pet => pet.name),
                items,
                pendingCount,
                summary: buildSummary(pendingCount, items.length),
                summaryIcon: pendingCount > 0 ? '/assets/icons/bell.png' : '/assets/icons/check.png',
                viewState: 'ready',
            });
        });
    },

    onToggle(event) {
        const id = event.currentTarget.dataset.id;
        const enabled = event.detail.value;
        reminderStore.update(id, { enabled }).then(result => {
            if (result.error) {
                feedback.error(result.error.message || '操作失败');
            }
            this.loadData();
        });
    },

    // 完成一次：远端由服务端按「原定日期 + 周期」顺延，保证多端一致；本地用同一套规则
    onDone(event) {
        const id = event.currentTarget.dataset.id;
        const raw = this.findRaw(id);
        if (!raw) {
            return;
        }
        reminderStore.complete(id).then(result => {
            if (result.error) {
                feedback.error(result.error.message || '操作失败');
                return;
            }
            const nextDate = result.data && result.data.nextDate
                ? result.data.nextDate
                : addDays(today(), raw.cycleDays);
            feedback.toast('已完成，下次 ' + nextDate);
            this.loadData();
        });
    },

    onRemove(event) {
        const id = event.currentTarget.dataset.id;
        wx.showModal({
            title: '删除提醒',
            content: '删除后不再提醒，历史记录不受影响',
            confirmColor: '#ff8a65',
            success: res => {
                if (!res.confirm) {
                    return;
                }
                reminderStore.remove(id).then(() => this.loadData());
            },
        });
    },

    goAddPet() {
        wx.navigateTo({ url: '/pages/pet-edit/pet-edit' });
    },

    openEditor() {
        if (this.data.pets.length === 0) {
            return;
        }
        const type = this.data.typeOptions[0];
        const cycleDays = TYPE_CYCLE[type];
        this.setData({
            showEditor: true,
            editorPetIndex: 0,
            typeIndex: 0,
            cycleDays,
            nextDate: addDays(today(), cycleDays),
            note: '',
            error: '',
            submitting: false,
        });
    },

    closeEditor() {
        if (this.data.submitting) {
            return;
        }
        this.setData({ showEditor: false, error: '', sheetOffset: 0 });
    },

    // 遮罩上阻止滚动穿透
    noop() {},

    onSheetTouchStart(event) {
        this.touchStartY = event.touches[0].clientY;
    },

    onSheetTouchMove(event) {
        if (typeof this.touchStartY !== 'number') {
            return;
        }
        const delta = event.touches[0].clientY - this.touchStartY;
        if (delta > 0) {
            this.setData({ sheetOffset: Math.min(delta, 220) });
        }
    },

    onSheetTouchEnd() {
        this.touchStartY = null;
        if (this.data.sheetOffset > 90) {
            this.setData({ sheetOffset: 0 });
            this.closeEditor();
            return;
        }
        this.setData({ sheetOffset: 0 });
    },

    onEditorPet(event) {
        this.setData({ editorPetIndex: Number(event.detail.value) });
    },

    onEditorType(event) {
        const index = Number(event.detail.value);
        const type = this.data.typeOptions[index];
        const cycleDays = TYPE_CYCLE[type];
        this.setData({
            typeIndex: index,
            cycleDays,
            nextDate: addDays(today(), cycleDays),
        });
    },

    onCycleInput(event) {
        const value = Number(event.detail.value);
        this.setData({
            cycleDays: Number.isFinite(value) && value > 0 ? value : '',
        });
    },

    onNextDate(event) {
        this.setData({ nextDate: event.detail.value });
    },

    onNote(event) {
        this.setData({ note: event.detail.value });
    },

    save() {
        if (this.data.submitting) {
            return;
        }
        const cycleDays = Number(this.data.cycleDays);
        if (!Number.isFinite(cycleDays) || cycleDays <= 0) {
            this.setData({ error: '周期天数需大于 0' });
            return;
        }
        if (this.data.nextDate === '') {
            this.setData({ error: '请选择下次日期' });
            return;
        }
        const pet = this.data.pets[this.data.editorPetIndex];
        if (!pet) {
            this.setData({ error: '请选择宠物' });
            return;
        }
        this.setData({ submitting: true, error: '' });
        reminderStore.create({
            petId: pet.id,
            type: this.data.typeOptions[this.data.typeIndex],
            cycleDays,
            nextDate: this.data.nextDate,
            enabled: true,
            note: this.data.note,
        }).then(result => {
            this.setData({ submitting: false });
            if (result.error) {
                this.setData({ error: result.error.message || '保存失败' });
                return;
            }
            this.setData({ showEditor: false });
            this.loadData();
        });
    },

    findRaw(id) {
        const list = this.raws || [];
        for (let i = 0; i < list.length; i += 1) {
            if (String(list[i].id) === String(id)) {
                return list[i];
            }
        }
        return null;
    },
});

function decorate(raw, petNameMap) {
    const meta = TYPE_META[raw.type] || TYPE_META['其他'];
    const diff = daysBetween(raw.nextDate);
    const daysLeft = diff === null ? 0 : -diff;
    let statusText = '';
    let statusClass = 'normal';
    if (!raw.enabled) {
        statusText = '已关闭';
        statusClass = 'off';
    } else if (daysLeft < 0) {
        statusText = '已逾期 ' + (-daysLeft) + ' 天';
        statusClass = 'overdue';
    } else if (daysLeft === 0) {
        statusText = '今天';
        statusClass = 'today';
    } else if (daysLeft <= 3) {
        statusText = '还有 ' + daysLeft + ' 天';
        statusClass = 'soon';
    } else {
        statusText = '还有 ' + daysLeft + ' 天';
    }
    return {
        id: raw.id,
        type: raw.type,
        icon: meta.icon,
        petName: petNameMap[String(raw.petId)] || '未知宠物',
        cycleDays: raw.cycleDays,
        nextDate: raw.nextDate,
        enabled: raw.enabled !== false,
        note: raw.note || '',
        daysLeft,
        statusText,
        statusClass,
    };
}

function compareItem(a, b) {
    if (a.enabled !== b.enabled) {
        return a.enabled ? -1 : 1;
    }
    return a.daysLeft - b.daysLeft;
}

function buildSummary(pendingCount, total) {
    if (total === 0) {
        return '还没有提醒，添加疫苗、驱虫等周期事项吧';
    }
    if (pendingCount === 0) {
        return '全部安排妥当，没有到期事项';
    }
    return '今天有 ' + pendingCount + ' 项待处理';
}
