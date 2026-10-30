// pages/pet-detail/pet-detail.js
// 宠物详情页：展示资料 + 电子身份证卡 + 最近记录，并支持把身份证卡导出为图片。
// 导出图片用于宠物走失时直接发给他人/发朋友圈寻回。

const { petStore } = require('../../utils/pet-store');
const feedback = require('../../utils/feedback');
const { recordStore } = require('../../utils/record-store');
const { ageText, formatDate } = require('../../utils/date');
const { avatarSrc, FALLBACK } = require('../../utils/icons');

Page({
    data: {
        viewState: 'loading',
        petId: '',
        pet: null,
        ageText: '',
        recentRecords: [],
        exporting: false,
    },

    onLoad(options) {
        if (options && options.id) {
            this.setData({ petId: options.id });
            this.loadPet(options.id);
        } else {
            this.setData({ viewState: 'error' });
        }
    },

    onShow() {
        if (this.data.petId) {
            this.loadPet(this.data.petId);
        }
    },

    loadPet(id) {
        this.setData({ viewState: 'loading' });
        petStore.list().then(petRes => {
            const pets = petRes.data || [];
            let pet = null;
            for (let i = 0; i < pets.length; i += 1) {
                if (String(pets[i].id) === String(id)) {
                    pet = pets[i];
                    break;
                }
            }
            if (!pet) {
                this.setData({ viewState: 'error' });
                return;
            }
            this.setData({
                pet,
                avatarSrc: avatarSrc(pet.avatar),
                avatarFill: /^https?:\/\//.test(pet.avatar || ''),
                ageText: ageText(pet.birthday),
                viewState: 'ready',
            });
            this.loadRecords(id);
        });
    },

    loadRecords(id) {
        recordStore.list().then(recRes => {
            const all = recRes.data || [];
            const list = all.filter(r => String(r.petId) === String(id))
                .slice(0, 5)
                .map(r => ({
                    id: r.id,
                    type: r.type,
                    date: formatDate(r.date),
                    value: r.value || '',
                    anomaly: r.anomaly || '',
                    note: r.note || '',
                }));
            this.setData({ recentRecords: list });
        });
    },

    // 头像加载失败时回退到默认爪印
    onAvatarError() {
        if (this.data.avatarSrc === FALLBACK) {
            return;
        }
        this.setData({ avatarSrc: FALLBACK, avatarFill: false });
    },

    goEdit() {
        wx.navigateTo({ url: '/pages/pet-edit/pet-edit?id=' + this.data.pet.id });
    },

    goRecords() {
        wx.navigateTo({ url: '/pages/record/record' });
    },

    goIdentity() {
        wx.navigateTo({ url: '/pages/pet-identity/pet-identity?id=' + this.data.pet.id });
    },

    copyPhone() {
        const phone = this.data.pet.emergencyContact;
        if (!phone) {
            feedback.toast('未填写紧急电话');
            return;
        }
        wx.setClipboardData({ data: phone });
    },

    exportCard() {
        if (this.data.exporting) {
            return;
        }
        this.setData({ exporting: true });
        const query = wx.createSelectorQuery();
        query.select('#idcardCanvas').fields({ node: true, size: true }).exec(res => {
            if (!res || !res[0] || !res[0].node) {
                this.setData({ exporting: false });
                feedback.error('导出组件未就绪');
                return;
            }
            const canvas = res[0].node;
            const ctx = canvas.getContext('2d');
            const dpr = (wx.getWindowInfo && wx.getWindowInfo().pixelRatio) || 2;
            const W = 600;
            const H = 800;
            canvas.width = W * dpr;
            canvas.height = H * dpr;
            ctx.scale(dpr, dpr);
            this.drawCard(ctx, W, H);
            wx.canvasToTempFilePath({
                canvas,
                x: 0,
                y: 0,
                width: W,
                height: H,
                destWidth: W * dpr,
                destHeight: H * dpr,
                success: r => this.saveToAlbum(r.tempFilePath),
                fail: () => {
                    this.setData({ exporting: false });
                    feedback.error('生成图片失败');
                },
            });
        });
    },

    drawCard(ctx, W, H) {
        const pet = this.data.pet;
        // 背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        // 顶部品牌色带
        ctx.fillStyle = '#ff8a65';
        ctx.fillRect(0, 0, W, 110);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 34px sans-serif';
        ctx.fillText('爪印 · 宠物身份证', 36, 70);
        // 头像
        ctx.fillStyle = '#fff0e9';
        ctx.beginPath();
        ctx.arc(96, 240, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b3462a';
        ctx.font = 'bold 56px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(pet.name || '宠').slice(0, 1), 96, 260);
        ctx.textAlign = 'left';
        // 名字与基本信息
        ctx.fillStyle = '#3a2a22';
        ctx.font = 'bold 48px sans-serif';
        ctx.fillText(pet.name || '未命名', 210, 205);
        ctx.fillStyle = '#7a675c';
        ctx.font = '28px sans-serif';
        const speciesText = (pet.species || '') + (pet.breed ? ' · ' + pet.breed : '');
        ctx.fillText(speciesText, 210, 255);
        ctx.fillText('性别 ' + (pet.gender || '未知') + '　' + this.data.ageText, 210, 300);
        // 分隔线
        ctx.strokeStyle = '#f7e6da';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(36, 345);
        ctx.lineTo(W - 36, 345);
        ctx.stroke();
        // 字段
        const fields = [
            ['品种', pet.breed || '—'],
            ['性别', pet.gender || '—'],
            ['年龄', this.data.ageText || '—'],
            ['绝育', pet.sterilized || '未知'],
            ['芯片号', pet.microchip || '未登记'],
        ];
        let y = 405;
        ctx.font = '26px sans-serif';
        for (let i = 0; i < fields.length; i += 1) {
            ctx.fillStyle = '#806b5e';
            ctx.fillText(fields[i][0], 36, y);
            ctx.fillStyle = '#3a2a22';
            ctx.fillText(String(fields[i][1]), 210, y);
            y += 56;
        }
        // 紧急联系（重点）
        ctx.fillStyle = '#ff8a65';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText('若拾到请拨紧急联系', 36, y + 20);
        ctx.fillStyle = '#e2574c';
        ctx.font = 'bold 46px sans-serif';
        ctx.fillText(pet.emergencyContact || '未填写', 36, y + 72);
        // 底部说明
        ctx.fillStyle = '#806b5e';
        ctx.font = '22px sans-serif';
        ctx.fillText('本卡片由「爪印」生成，仅用于宠物走失寻回', 36, H - 36);
    },

    saveToAlbum(filePath) {
        wx.saveImageToPhotosAlbum({
            filePath,
            success: () => {
                this.setData({ exporting: false });
                feedback.success('已保存');
            },
            fail: err => {
                this.setData({ exporting: false });
                const msg = (err && err.errMsg) || '';
                if (/auth|deny|album/i.test(msg)) {
                    wx.showModal({
                        title: '需要相册权限',
                        content: '请在设置中允许保存到相册，以便走失时把卡片发给他人。',
                        confirmText: '去设置',
                        success: r => {
                            if (r.confirm) {
                                wx.openSetting();
                            }
                        },
                    });
                } else {
                    feedback.error('保存失败');
                }
            },
        });
    },
});
