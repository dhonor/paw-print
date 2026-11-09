// utils/opinion-store.js
// 意见反馈的数据访问。
// 注意：这里的 store 叫 opinion，是为了不和 utils/feedback.js（统一 toast 提示工具）混淆。

const { request } = require('./api');

function toError(err) {
    return { code: 'HTTP_ERROR', message: (err && err.message) || '提交失败' };
}

// payload: { type, content, contact, images: [] }
function submit(payload) {
    return request('/feedback', { method: 'POST', data: payload })
        .then(res => ({ data: res, error: null }))
        .catch(err => ({ data: null, error: toError(err) }));
}

// 查看自己提交过的反馈
function listMine() {
    return request('/feedback/mine')
        .then(res => ({ data: res || [], error: null }))
        .catch(err => ({ data: [], error: toError(err) }));
}

module.exports = {
    submit,
    listMine,
};
