// utils/pet-store.js
// 宠物档案的业务模型。只描述“有哪些字段”，具体增删改由 local-store 提供。
// 把页面和存储彻底解耦：页面只调用 petStore.list/create/update/remove。

const { createLocalStore } = require('./local-store');
const { createRemoteStore } = require('./remote-store');
const { useRemote } = require('./config');

const SPECIES = ['狗', '猫', '其他'];
const GENDERS = ['公', '母', '未知'];
const STERILIZED = ['未知', '已绝育', '未绝育'];

const petStore = useRemote
    ? createRemoteStore({ resource: 'pets' })
    : createLocalStore({
    storageKey: 'paw-print-pets',
    fields: [
        { key: 'name', type: 'string', required: true, label: '昵称' },
        { key: 'species', type: 'enum', values: SPECIES, default: '狗' },
        { key: 'breed', type: 'string' },
        { key: 'gender', type: 'enum', values: GENDERS, default: '未知' },
        { key: 'birthday', type: 'string' },
        { key: 'avatar', type: 'string' },
        { key: 'note', type: 'string' },
        { key: 'microchip', type: 'string' },
        { key: 'emergencyContact', type: 'string' },
        { key: 'sterilized', type: 'enum', values: STERILIZED, default: '未知' },
        // 数字身份（鼻纹建档）相关字段
        { key: 'noseprintCode', type: 'string' },
        { key: 'noseprintAt', type: 'string' },
        { key: 'noseprintQuality', type: 'number', default: 0 },
    ],
});

module.exports = {
    petStore,
    SPECIES,
    GENDERS,
    STERILIZED,
};
