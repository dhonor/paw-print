// pages/record/record.js
// 健康/日常记录页。顶部用 picker 选择宠物（一对多：一个宠物多条记录），
// 列表只展示当前宠物的记录。新增/编辑复用底部弹层（sheet）表单。
// 类型选择「异常」时，可多选预设症状（anomaly 字段）。

const { petStore } = require('../../utils/pet-store');
const { recordStore, RECORD_TYPES, ANOMALY_PRESETS } = require('../../utils/record-store');
const { getCurrentMember } = require('../../utils/family-store');
const feedback = require('../../utils/feedback');
const { formatDate, today, daysBetween } = require('../../utils/date');

Page({
    data: {
        viewState: 'loading',
        pets: [],
        selectedPetId: '',
        selectedIndex: 0,
        selectedPetName: '',
        petOptions: [],
        records: [],
        weightPoints: [],
        weightTip: '',
        anomalyCount: 0,
        currentOperator: '我自己',
        showEditor: false,
        editorMode: 'create',
        editingId: '',
        typeOptions: RECORD_TYPES,
        typeIndex: 0,
        anomalyPresets: ANOMALY_PRESETS,
        selectedAnomalies: [],
        date: '',
        value: '',
        note: '',
        error: '',
        submitting: false,
        sheetOffset: 0,
    },

    onShow() {
        this.loadOperator();
        this.loadPets();
    },

    loadOperator() {
        getCurrentMember().then(result => {
            const member = result.data;
            this.setData({
                currentOperator: member ? member.name : '我自己',
            });
        });
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
            const pets = result.data || [];
            if (pets.length === 0) {
                this.setData({ pets, petOptions: [], viewState: 'empty' });
                return;
            }
            const keepSelected = this.data.selectedPetId
                && pets.some(pet => String(pet.id) === String(this.data.selectedPetId));
            const selectedPetId = keepSelected ? this.data.selectedPetId : pets[0].id;
            let selectedIndex = 0;
            for (let i = 0; i < pets.length; i += 1) {
                if (String(pets[i].id) === String(selectedPetId)) {
                    selectedIndex = i;
                    break;
                }
            }
            this.setData({
                pets,
                petOptions: pets.map(pet => pet.name),
                selectedPetId,
                selectedIndex,
                selectedPetName: pets[selectedIndex].name,
                viewState: 'ready',
            });
            this.loadRecords();
        });
    },

    onSelectPet(event) {
        const index = Number(event.detail.value);
        this.setData({
            selectedPetId: this.data.pets[index].id,
            selectedIndex: index,
            selectedPetName: this.data.pets[index].name,
        });
        this.loadRecords();
    },

    loadRecords() {
        recordStore.list().then(result => {
            if (result.error) {
                this.setData({ viewState: 'error' });
                return;
            }
            const all = result.data || [];
            const petId = this.data.selectedPetId;
            const petNameMap = {};
            this.data.pets.forEach(pet => { petNameMap[String(pet.id)] = pet.name; });
            const petRecords = all.filter(record => String(record.petId) === String(petId));
            const records = petRecords.map(record => ({
                id: record.id,
                type: record.type,
                date: formatDate(record.date),
                value: record.value || '',
                anomaly: record.anomaly || '',
                note: record.note || '',
                operator: record.operator || '',
                petName: petNameMap[String(record.petId)] || '',
            }));
            const trend = buildTrend(petRecords);
            this.setData({
                records,
                weightPoints: trend.points,
                weightTip: trend.tip,
                anomalyCount: countRecentAnomaly(petRecords),
                viewState: this.data.pets.length === 0 ? 'empty' : 'ready',
            });
        });
    },

    goPets() {
        wx.switchTab({ url: '/pages/pet-list/pet-list' });
    },

    openCreate() {
        this.setData({
            showEditor: true,
            editorMode: 'create',
            editingId: '',
            typeIndex: 0,
            selectedAnomalies: [],
            date: today(),
            value: '',
            note: '',
            error: '',
            submitting: false,
        });
    },

    openEdit(event) {
        const id = event.currentTarget.dataset.id;
        let record = null;
        for (let i = 0; i < this.data.records.length; i += 1) {
            if (this.data.records[i].id === id) {
                record = this.data.records[i];
                break;
            }
        }
        if (!record) {
            return;
        }
        this.setData({
            showEditor: true,
            editorMode: 'edit',
            editingId: id,
            typeIndex: Math.max(0, RECORD_TYPES.indexOf(record.type)),
            selectedAnomalies: record.anomaly ? record.anomaly.split('、') : [],
            date: record.date,
            value: record.value,
            note: record.note,
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

    // 底部弹层下拉关闭
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

    onType(event) {
        const index = Number(event.detail.value);
        const next = { typeIndex: index };
        if (RECORD_TYPES[index] !== '异常') {
            next.selectedAnomalies = [];
        }
        this.setData(next);
    },

    toggleAnomaly(event) {
        const index = Number(event.currentTarget.dataset.index);
        const preset = this.data.anomalyPresets[index];
        const current = this.data.selectedAnomalies.slice();
        const pos = current.indexOf(preset);
        if (pos > -1) {
            current.splice(pos, 1);
        } else {
            current.push(preset);
        }
        this.setData({ selectedAnomalies: current });
    },

    onDate(event) {
        this.setData({ date: event.detail.value });
    },

    onValue(event) {
        this.setData({ value: event.detail.value });
    },

    onNote(event) {
        this.setData({ note: event.detail.value });
    },

    // 编辑别人的记录时保留原记录人；新建时用当前用户
    resolveOperator() {
        if (this.data.editorMode !== 'edit') {
            return this.data.currentOperator;
        }
        const list = this.data.records || [];
        for (let i = 0; i < list.length; i += 1) {
            if (String(list[i].id) === String(this.data.editingId) && list[i].operator) {
                return list[i].operator;
            }
        }
        return this.data.currentOperator;
    },

    save() {
        if (this.data.submitting) {
            return;
        }
        if (this.data.date === '') {
            this.setData({ error: '请选择日期' });
            return;
        }
        const isAnomaly = this.data.typeOptions[this.data.typeIndex] === '异常';
        const payload = {
            petId: this.data.selectedPetId,
            type: RECORD_TYPES[this.data.typeIndex],
            date: this.data.date,
            value: this.data.value,
            anomaly: isAnomaly ? this.data.selectedAnomalies.join('、') : '',
            note: this.data.note,
            operator: this.resolveOperator(),
        };
        this.setData({ submitting: true, error: '' });
        const request = this.data.editorMode === 'edit'
            ? recordStore.update(this.data.editingId, payload)
            : recordStore.create(payload);
        request.then(result => {
            this.setData({ submitting: false });
            if (result.error) {
                this.setData({ error: result.error.message || '保存失败' });
                return;
            }
            this.setData({ showEditor: false });
            feedback.success(this.data.editorMode === 'edit' ? '已更新' : '已保存');
            this.loadRecords();
        });
    },

    handleDelete(event) {
        const id = event.currentTarget.dataset.id;
        wx.showModal({
            title: '确认删除',
            content: '删除后不可恢复',
            confirmColor: '#ff8a65',
            success: res => {
                if (!res.confirm) {
                    return;
                }
                recordStore.remove(id).then(result => {
                    if (result.error) {
                        feedback.error(result.error.message || '删除失败');
                        return;
                    }
                    this.loadRecords();
                });
            },
        });
    },
});

// 体重趋势：取最近 8 次「体重」记录，按日期升序，用柱高表示相对区间
function buildTrend(records) {
    const values = [];
    for (let i = 0; i < records.length; i += 1) {
        const record = records[i];
        if (record.type !== '体重') {
            continue;
        }
        const value = parseWeight(record.value);
        if (value === null) {
            continue;
        }
        values.push({ date: formatDate(record.date), value });
    }
    values.sort((a, b) => new Date(a.date) - new Date(b.date));
    const recent = values.slice(-8);
    if (recent.length === 0) {
        return { points: [], tip: '' };
    }

    let max = recent[0].value;
    let min = recent[0].value;
    for (let i = 1; i < recent.length; i += 1) {
        max = Math.max(max, recent[i].value);
        min = Math.min(min, recent[i].value);
    }
    const span = max - min;
    const points = recent.map((item, index) => {
        const ratio = span === 0 ? 0.6 : (item.value - min) / span;
        return {
            key: item.date + '-' + index,
            value: formatWeight(item.value),
            height: Math.round(18 + ratio * 82),
            label: item.date.slice(5),
        };
    });

    const delta = recent[recent.length - 1].value - recent[0].value;
    let tip = '最近 ' + recent.length + ' 次体重';
    if (delta > 0.01) {
        tip += '，累计 +' + formatWeight(delta) + 'kg';
    } else if (delta < -0.01) {
        tip += '，累计 -' + formatWeight(-delta) + 'kg';
    } else {
        tip += '，基本稳定';
    }
    return { points, tip };
}

// 近 30 天的异常记录条数
function countRecentAnomaly(records) {
    let count = 0;
    for (let i = 0; i < records.length; i += 1) {
        if (records[i].type !== '异常') {
            continue;
        }
        const diff = daysBetween(records[i].date);
        if (diff !== null && diff >= 0 && diff <= 30) {
            count += 1;
        }
    }
    return count;
}

function parseWeight(value) {
    const matched = String(value || '').match(/(\d+(\.\d+)?)/);
    if (!matched) {
        return null;
    }
    const number = Number(matched[1]);
    return Number.isFinite(number) && number > 0 ? number : null;
}

function formatWeight(value) {
    return String(Math.round(value * 100) / 100);
}
