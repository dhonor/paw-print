// utils/feedback.js
// 反馈分级：轻提示 / 成功 / 错误，成功类附带一次轻震动。
// 破坏性操作（删除、取消预约）仍走 wx.showModal 二次确认，不要用 toast 代替。

function toast(title) {
    wx.showToast({ title, icon: 'none', duration: 1800 });
}

function success(title) {
    wx.showToast({ title, icon: 'success', duration: 1500 });
    haptic('light');
}

function error(title) {
    wx.showToast({ title, icon: 'none', duration: 2200 });
}

function haptic(type) {
    if (typeof wx.vibrateShort !== 'function') {
        return;
    }
    wx.vibrateShort({
        type: type || 'light',
        fail() {
            // 部分机型不支持震动，静默失败
        },
    });
}

module.exports = {
    toast,
    success,
    error,
    haptic,
};
