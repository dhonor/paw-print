// utils/badge.js
// tabBar 徽标：把「今天到期 + 已逾期」的提醒数挂到「我的」tab 上。
// 只在 tab 页调用才会生效；其它页面调用会静默失败（返回的 due 仍然可用）。

const { reminderStore } = require('./reminder-store');
const { daysBetween } = require('./date');

// tabBar 第三项 = 我的
const PROFILE_TAB_INDEX = 2;

function countDue(reminders) {
    let due = 0;
    for (let i = 0; i < reminders.length; i += 1) {
        const item = reminders[i];
        if (item.enabled === false) {
            continue;
        }
        const diff = daysBetween(item.nextDate);
        // diff >= 0 表示今天或已经过了
        if (diff !== null && diff >= 0) {
            due += 1;
        }
    }
    return due;
}

function refreshReminderBadge() {
    return reminderStore.list().then(result => {
        const due = countDue(result.data || []);
        try {
            if (due > 0) {
                wx.setTabBarBadge({
                    index: PROFILE_TAB_INDEX,
                    text: due > 99 ? '99+' : String(due),
                    fail() {},
                });
            } else {
                wx.removeTabBarBadge({
                    index: PROFILE_TAB_INDEX,
                    fail() {},
                });
            }
        } catch (e) {
            // 非 tab 页面调用时忽略
        }
        return due;
    });
}

module.exports = {
    refreshReminderBadge,
    countDue,
};
