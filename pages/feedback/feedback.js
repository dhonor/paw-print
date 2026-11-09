// pages/feedback/feedback.js
// 意见反馈：类型 + 描述 + 截图 + 联系方式，提交到后端 /feedback。

const opinionStore = require('../../utils/opinion-store');
const feedback = require('../../utils/feedback');
const { pickAndUpload } = require('../../utils/upload');

const TYPES = ['功能建议', '问题反馈', '内容错误', '其他'];
const MAX_IMAGES = 3;
const MAX_LEN = 500;

Page({
    data: {
        types: TYPES,
        typeIndex: 0,
        content: '',
        contact: '',
        images: [],
        maxLen: MAX_LEN,
        remaining: MAX_LEN,
        maxImages: MAX_IMAGES,
        submitting: false,
        error: '',
    },

    onTypeTap(event) {
        this.setData({ typeIndex: Number(event.currentTarget.dataset.index) });
    },

    onContentInput(event) {
        const value = event.detail.value || '';
        this.setData({
            content: value,
            remaining: Math.max(0, MAX_LEN - value.length),
            error: '',
        });
    },

    onContactInput(event) {
        this.setData({ contact: event.detail.value || '' });
    },

    addImage() {
        if (this.data.images.length >= MAX_IMAGES) {
            feedback.toast('最多上传 ' + MAX_IMAGES + ' 张截图');
            return;
        }
        pickAndUpload().then(result => {
            if (result.error) {
                feedback.toast(result.error.message);
                return;
            }
            this.setData({ images: this.data.images.concat(result.data.url) });
        });
    },

    previewImage(event) {
        const index = Number(event.currentTarget.dataset.index);
        wx.previewImage({
            current: this.data.images[index],
            urls: this.data.images,
        });
    },

    removeImage(event) {
        const index = Number(event.currentTarget.dataset.index);
        const images = this.data.images.slice();
        images.splice(index, 1);
        this.setData({ images });
    },

    submit() {
        if (this.data.submitting) {
            return;
        }
        const content = String(this.data.content || '').trim();
        if (content.length < 5) {
            this.setData({ error: '请至少写 5 个字，方便我们定位问题' });
            return;
        }
        this.setData({ submitting: true, error: '' });
        opinionStore.submit({
            type: TYPES[this.data.typeIndex],
            content,
            contact: String(this.data.contact || '').trim(),
            images: this.data.images,
        }).then(result => {
            this.setData({ submitting: false });
            if (result.error) {
                this.setData({ error: result.error.message || '提交失败，请稍后重试' });
                return;
            }
            feedback.success('已收到，感谢反馈');
            setTimeout(() => {
                wx.navigateBack({ delta: 1 });
            }, 700);
        });
    },
});
