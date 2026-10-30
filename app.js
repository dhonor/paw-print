App({
    globalData: {
        appName: '爪印',
        // 启动动画开关：只在本次启动的第一个页面播放一次
        showLaunchSplash: true,
    },
    onLaunch() {
        // onLaunch 每次冷启动只执行一次，这里重置标记
        this.globalData.showLaunchSplash = true;

        // 首次启动注入示例数据，方便学习时直接看到效果。
        // 真实项目里这里通常做登录、云环境初始化等。
        const { ensureSeed } = require('./utils/seed');
        ensureSeed();
    },
    onShow() {
        // 回到前台时同步一次提醒徽标（在 tab 页才会真正生效）
        const { refreshReminderBadge } = require('./utils/badge');
        refreshReminderBadge();
    },
});
