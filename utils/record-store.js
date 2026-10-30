// utils/record-store.js
// 健康/日常记录的业务模型。通过 petId 关联到具体宠物（一对多关系）。

const { createLocalStore } = require('./local-store');
const { createRemoteStore } = require('./remote-store');
const { useRemote } = require('./config');

const RECORD_TYPES = ['体重', '疫苗', '驱虫', '就医', '异常', '其他'];

// 出现异常时可选的预设症状（多选）
const ANOMALY_PRESETS = [
    '呕吐',
    '腹泻',
    '食欲不振',
    '精神萎靡',
    '咳嗽/喷嚏',
    '跛行',
    '皮肤/瘙痒',
    '眼鼻分泌物',
    '排尿异常',
    '抽搐',
];

// 各记录类型的展示元数据（颜色/图标），供列表与首页预警复用
const TYPE_META = {
    '体重': { icon: 'scale', color: '#ff8a65' },
    '疫苗': { icon: 'syringe', color: '#2fa97c' },
    '驱虫': { icon: 'pill', color: '#e6a23c' },
    '就医': { icon: 'hospital', color: '#e2574c' },
    '异常': { icon: 'warning', color: '#e2574c' },
    '其他': { icon: 'pin', color: '#806b5e' },
};

const recordStore = useRemote
    ? createRemoteStore({ resource: 'records' })
    : createLocalStore({
    storageKey: 'paw-print-records',
    fields: [
        { key: 'petId', type: 'string', required: true, label: '宠物' },
        { key: 'type', type: 'enum', values: RECORD_TYPES, default: '体重' },
        { key: 'date', type: 'string', required: true, label: '日期' },
        { key: 'value', type: 'string' },
        { key: 'anomaly', type: 'string' },
        { key: 'note', type: 'string' },
        { key: 'operator', type: 'string' },
    ],
});

module.exports = {
    recordStore,
    RECORD_TYPES,
    ANOMALY_PRESETS,
    TYPE_META,
};
