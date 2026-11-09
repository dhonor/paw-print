// pages/pet-identity/pet-identity.js
// 宠物数字身份：鼻纹建档（占位 AI 服务）、拍照识品种、基于记录的本地健康初筛。
// 三个能力都通过适配层调用，AI 目前是占位实现，接入真实服务后页面无需改动。

const { petStore } = require('../../utils/pet-store');
const { recordStore } = require('../../utils/record-store');
const { recognizeBreed, extractNosePrint } = require('../../utils/ai-vision');
const healthScore = require('../../utils/health-score');
const feedback = require('../../utils/feedback');
const { formatDate, ageText } = require('../../utils/date');
const { avatarSrc } = require('../../utils/icons');

Page({
    data: {
        viewState: 'loading',
        errorMessage: '',
        petId: '',
        pet: null,
        ageText: '',
        recordCount: 0,
        noseprint: null,
        breedResult: null,
        health: null,
        busy: '',
    },

    onLoad(options) {
        if (!options || !options.id) {
            this.setData({
                viewState: 'error',
                errorMessage: '缺少宠物参数，请从宠物详情进入',
            });
            return;
        }
        // 只记参数，取数统一交给 onShow，避免首屏发两次请求
        this.setData({ petId: options.id });
    },

    onShow() {
        if (this.data.petId) {
            this.loadAll(this.data.petId);
        }
    },

    // 出错后重试（按钮事件会传 event，不能直接绑 loadAll）
    retry() {
        if (this.data.petId) {
            this.loadAll(this.data.petId);
        }
    },

    loadAll(petId) {
        if (!this.data.pet) {
            this.setData({ viewState: 'loading' });
        }
        return Promise.all([
            petStore.get(petId),
            // 只取这只宠物的记录，健康初筛和条数都用它
            recordStore.list({ petId }),
        ]).then(results => {
            const petRes = results[0];
            const recordsRes = results[1];
            if (petRes.error || !petRes.data || recordsRes.error) {
                const fail = petRes.error || recordsRes.error;
                this.setData({
                    viewState: 'error',
                    errorMessage: (fail && fail.message) || '宠物不存在',
                });
                return;
            }
            const pet = petRes.data;
            const records = recordsRes.data || [];
            this.setData({
                pet,
                avatarSrc: avatarSrc(pet.avatar),
                ageText: ageText(pet.birthday),
                recordCount: records.length,
                errorMessage: '',
                noseprint: pet.noseprintCode
                    ? {
                        code: pet.noseprintCode,
                        at: pet.noseprintAt || '',
                        quality: pet.noseprintQuality || 0,
                    }
                    : null,
                health: healthScore.evaluate(records),
                viewState: 'ready',
            });
        });
    },

    // 拍摄/选择照片，返回临时路径
    pickImage() {
        return new Promise(resolve => {
            wx.chooseMedia({
                count: 1,
                mediaType: ['image'],
                sourceType: ['camera', 'album'],
                sizeType: ['compressed'],
                success(res) {
                    const file = res.tempFiles && res.tempFiles[0];
                    resolve(file ? file.tempFilePath : '');
                },
                fail() {
                    resolve('');
                },
            });
        });
    },

    buildNosePrint() {
        if (this.data.busy) {
            return;
        }
        this.pickImage().then(imagePath => {
            if (!imagePath) {
                return null;
            }
            this.setData({ busy: 'nose' });
            return extractNosePrint({ imagePath, petId: this.data.petId }).then(result => {
                this.setData({ busy: '' });
                if (result.error) {
                    feedback.error(result.error.message);
                    return null;
                }
                const data = result.data;
                return petStore.update(this.data.petId, {
                    noseprintCode: data.code,
                    noseprintAt: formatDate(new Date()),
                    noseprintQuality: data.quality,
                }).then(updateResult => {
                    if (updateResult.error) {
                        feedback.error('保存失败');
                        return null;
                    }
                    feedback.success('建档成功');
                    this.loadAll(this.data.petId);
                });
            });
        });
    },

    recognizeBreed() {
        if (this.data.busy) {
            return;
        }
        this.pickImage().then(imagePath => {
            if (!imagePath) {
                return null;
            }
            this.setData({ busy: 'breed' });
            return recognizeBreed({ imagePath }).then(result => {
                this.setData({ busy: '' });
                if (result.error) {
                    feedback.error(result.error.message);
                    return null;
                }
                const data = result.data;
                this.setData({
                    breedResult: {
                        breed: data.breed,
                        percent: Math.round(data.confidence * 100),
                        candidates: (data.candidates || []).map(item => ({
                            breed: item.breed,
                            percent: Math.round(item.confidence * 100),
                        })),
                    },
                });
            });
        });
    },

    applyBreed() {
        const result = this.data.breedResult;
        if (!result) {
            return;
        }
        petStore.update(this.data.petId, { breed: result.breed }).then(res => {
            if (res.error) {
                feedback.error('写入失败');
                return;
            }
            feedback.success('已写入');
            this.setData({ breedResult: null });
            this.loadAll(this.data.petId);
        });
    },

    copyCode() {
        if (!this.data.noseprint) {
            return;
        }
        wx.setClipboardData({ data: this.data.noseprint.code });
    },

    goRecords() {
        wx.navigateTo({ url: '/pages/record/record' });
    },
});
