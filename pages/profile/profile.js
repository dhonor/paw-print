// pages/profile/profile.js
// 个人中心：菜单入口 + 个人资料（头像、昵称）。
// 资料存在后端 User 上，通过 /family/me 读写；本地模式没有账号体系，只做只读展示。

const feedback = require('../../utils/feedback');
const { refreshReminderBadge } = require('../../utils/badge');
const { familyStore, useRemoteFamily } = require('../../utils/family-store');
const { pickAndUpload } = require('../../utils/upload');
const { avatarSrc, FALLBACK } = require('../../utils/icons');

Page({
    data: {
        title: '我的',
        subtitle: '爪印 · 让陪伴有迹可循',
        isRemote: useRemoteFamily,
        nickname: '',
        displayNickname: '未设置昵称',
        displayIntro: '点一下昵称就能改',
        avatarImg: '/assets/icons/paw.png',
        uploading: false,
        menuGroups: [
            {
                key: 'content',
                items: [
                    { key: 'pets', text: '我的宠物', icon: 'paw', path: '/pages/pet-list/pet-list' },
                    { key: 'records', text: '成长记录', icon: 'chart', path: '/pages/record/record' },
                    { key: 'reminders', text: '提醒中心', icon: 'bell', path: '/pages/reminders/reminders' },
                    { key: 'encyclopedia', text: '品种百科', icon: 'book', path: '/pages/encyclopedia/encyclopedia' },
                    { key: 'bookings', text: '我的预约', icon: 'calendar', path: '/pages/bookings/bookings' },
                    { key: 'family', text: '家庭共享', icon: 'family', path: '/pages/family/family' },
                    { key: 'nearby', text: '周边服务', icon: 'pin', path: '/pages/nearby/nearby' },
                ],
            },
            {
                key: 'system',
                items: [
                    { key: 'about', text: '关于爪印', icon: 'info', path: '' },
                ],
            },
        ],
    },

    onShow() {
        this.loadProfile();
        refreshReminderBadge();
    },

    loadProfile() {
        if (!this.data.isRemote) {
            this.setData({
                displayNickname: '未设置昵称',
                displayIntro: '接后端后可以改昵称和头像',
                avatarImg: avatarSrc(''),
            });
            return;
        }
        familyStore.detail().then(result => {
            if (result.error) {
                return;
            }
            const members = result.data.members || [];
            const me = members.find(item => item.isSelf) || null;
            const nickname = me ? me.nickname : '';
            this.setData({
                nickname,
                displayNickname: nickname || '未设置昵称',
                displayIntro: nickname ? '点一下可修改昵称' : '点一下设置昵称',
                avatarImg: avatarSrc(me ? me.avatar : ''),
            });
        });
    },

    // 头像加载失败时回退到默认爪印
    onAvatarError() {
        if (this.data.avatarImg === FALLBACK) {
            return;
        }
        this.setData({ avatarImg: FALLBACK });
    },

    // 换头像：拍照/相册 -> 上传 -> 写入用户资料
    onChangeAvatar() {
        if (!this.data.isRemote) {
            feedback.toast('接后端后可用');
            return;
        }
        if (this.data.uploading) {
            return;
        }
        pickAndUpload().then(result => {
            if (result.error) {
                feedback.toast(result.error.message);
                return;
            }
            this.setData({ uploading: true });
            familyStore.updateMe({ avatar: result.data.url }).then(res => {
                this.setData({ uploading: false });
                if (res.error) {
                    feedback.error(res.error.message || '保存失败');
                    return;
                }
                feedback.success('头像已更新');
                this.loadProfile();
            });
        });
    },

    // 改昵称
    onEditNickname() {
        if (!this.data.isRemote) {
            feedback.toast('接后端后可用');
            return;
        }
        wx.showModal({
            title: '修改昵称',
            editable: true,
            placeholderText: '给自己起个名字',
            content: this.data.nickname || '',
            confirmColor: '#ff8a65',
            success: res => {
                if (!res.confirm) {
                    return;
                }
                const name = String(res.content || '').trim();
                if (name === '') {
                    feedback.toast('昵称不能为空');
                    return;
                }
                if (name === this.data.nickname) {
                    return;
                }
                familyStore.updateMe({ nickname: name }).then(result => {
                    if (result.error) {
                        feedback.error(result.error.message || '保存失败');
                        return;
                    }
                    feedback.success('昵称已更新');
                    this.loadProfile();
                });
            },
        });
    },

    handleMenuTap(event) {
        const dataset = event && event.currentTarget ? event.currentTarget.dataset : null;
        const groupIndex = Number(dataset ? dataset.group : -1);
        const itemIndex = Number(dataset ? dataset.index : -1);
        const group = this.data.menuGroups[groupIndex];
        const menuItem = group && Array.isArray(group.items) ? group.items[itemIndex] : null;
        if (!menuItem) {
            return;
        }

        if (!menuItem.path) {
            feedback.toast('该功能暂未接入');
            return;
        }

        wx.navigateTo({
            url: menuItem.path,
            fail: () => {
                feedback.toast('页面暂未开放');
            },
        });
    },
});
