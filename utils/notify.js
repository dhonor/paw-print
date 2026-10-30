// utils/notify.js
// 订阅消息：小程序端只负责「征得用户同意」并上报额度，真正的发送在后端定时任务里。
//
// 微信的规则是「一次性订阅」：用户每授权一次，后端才能发一条。
// 所以额度用完后要再次引导用户点「开启」，这是平台限制，不是实现问题。

const { request } = require('./api');
const { subscribeTemplateId } = require('./config');

function subscribe(count) {
    return request('/notify/subscribe', {
        method: 'POST',
        data: { count: count || 1 },
    })
        .then(res => ({ data: res, error: null }))
        .catch(err => ({ data: null, error: { code: 'HTTP_ERROR', message: err.message } }));
}

// 唤起授权弹窗，用户点「允许」后上报给后端
function requestSubscribe() {
    const tmplId = subscribeTemplateId;
    if (!tmplId) {
        return Promise.resolve({
            data: null,
            error: { code: 'NO_TEMPLATE', message: '还没有配置订阅消息模板' },
        });
    }
    return new Promise(resolve => {
        wx.requestSubscribeMessage({
            tmplIds: [tmplId],
            success(res) {
                if (res[tmplId] === 'accept') {
                    resolve(subscribe(1).then(result => ({ data: result.data, error: result.error })));
                    return;
                }
                resolve({
                    data: null,
                    error: { code: 'DENIED', message: '你取消了授权' },
                });
            },
            fail(err) {
                resolve({
                    data: null,
                    error: { code: 'FAIL', message: (err && err.errMsg) || '订阅失败' },
                });
            },
        });
    });
}

module.exports = {
    subscribe,
    requestSubscribe,
};
