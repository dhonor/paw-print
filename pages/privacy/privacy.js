// pages/privacy/privacy.js
// 隐私政策：小程序上线审核必查，内容需与后台《用户隐私保护指引》保持一致。

Page({
    data: {
        updatedAt: '2026-11-09',
    },

    goFeedback() {
        wx.navigateTo({ url: '/pages/feedback/feedback' });
    },
});
