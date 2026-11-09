// pages/about/about.js
// 关于爪印：只放必要信息——是什么、版本、怎么反馈。

const feedback = require('../../utils/feedback');

const APP_VERSION = '1.0.0';

const ENV_TEXT = {
    develop: '开发版',
    trial: '体验版',
    release: '',
};

Page({
    data: {
        appName: '爪印',
        slogan: '记录每个毛孩子的成长',
        intro: '疫苗、驱虫、体重、就诊一处归档，到期自动提醒，家人一起照护。',
        version: 'v' + APP_VERSION,
        envText: '',
    },

    onLoad() {
        // 版本号取小程序自身信息，开发版通常为空，回退到内置版本号
        let version = 'v' + APP_VERSION;
        let envText = '';
        try {
            const info = wx.getAccountInfoSync();
            const mini = info && info.miniProgram ? info.miniProgram : null;
            if (mini) {
                if (mini.version) {
                    version = 'v' + mini.version;
                }
                envText = ENV_TEXT[mini.envVersion] || '';
            }
        } catch (e) {
            envText = '';
        }
        this.setData({ version, envText });
    },

    goFeedback() {
        wx.navigateTo({
            url: '/pages/feedback/feedback',
            fail: () => feedback.toast('页面暂未开放'),
        });
    },

    goPrivacy() {
        wx.navigateTo({ url: '/pages/privacy/privacy' });
    },
});
