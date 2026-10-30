// utils/api.js
// 统一的后端请求层：自动带 token、401 自动重新登录并重试一次。
// 依赖 utils/config.js 里的 apiBase 与 devLoginCode。

const { apiBase, devLoginCode } = require('./config');

const TOKEN_KEY = 'paw-print-token';

let loginTask = null;

function getToken() {
    return wx.getStorageSync(TOKEN_KEY) || '';
}

function setToken(token) {
    wx.setStorageSync(TOKEN_KEY, token);
}

function clearToken() {
    wx.removeStorageSync(TOKEN_KEY);
}

function rawRequest(path, method, data, token) {
    return new Promise((resolve, reject) => {
        const header = { 'content-type': 'application/json' };
        if (token) {
            header.Authorization = 'Bearer ' + token;
        }
        wx.request({
            url: apiBase + path,
            method: method || 'GET',
            data: data || {},
            header,
            timeout: 15000,
            success(res) {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(res.data);
                    return;
                }
                let message = '请求失败(' + res.statusCode + ')';
                if (res.data && res.data.message) {
                    message = Array.isArray(res.data.message) ? res.data.message[0] : res.data.message;
                }
                const error = new Error(message);
                error.statusCode = res.statusCode;
                reject(error);
            },
            fail(err) {
                reject(new Error(err && err.errMsg ? err.errMsg : '网络异常，请检查后端是否已启动'));
            },
        });
    });
}

// 登录：拿到 token 后缓存起来。并发调用只会触发一次。
function login() {
    if (loginTask) {
        return loginTask;
    }
    loginTask = new Promise((resolve, reject) => {
        if (devLoginCode) {
            resolve(devLoginCode);
            return;
        }
        wx.login({
            success(res) {
                if (res.code) {
                    resolve(res.code);
                    return;
                }
                reject(new Error('微信登录失败：没有拿到 code'));
            },
            fail() {
                reject(new Error('微信登录失败'));
            },
        });
    })
        .then(code => rawRequest('/auth/login', 'POST', { code }))
        .then(res => {
            setToken(res.token);
            loginTask = null;
            return res;
        })
        .catch(err => {
            loginTask = null;
            throw err;
        });
    return loginTask;
}

function ensureLogin() {
    if (getToken()) {
        return Promise.resolve(getToken());
    }
    return login().then(res => res.token);
}

// 业务请求：无 token 先登录；遇到 401 清掉 token 重登再试一次
function request(path, options) {
    const opts = options || {};
    return ensureLogin().then(token =>
        rawRequest(path, opts.method, opts.data, token).catch(err => {
            if (err.statusCode !== 401) {
                throw err;
            }
            clearToken();
            return login().then(res => rawRequest(path, opts.method, opts.data, res.token));
        }),
    );
}

module.exports = {
    request,
    login,
    getToken,
    setToken,
    clearToken,
};
