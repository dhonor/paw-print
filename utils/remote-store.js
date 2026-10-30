// utils/remote-store.js
// 与 local-store 完全一致的接口（list / get / create / update / remove），
// 只是把数据源从 wx.storage 换成自建后端。返回同样是 Promise<{ data, error }>。

const { request } = require('./api');

function toQuery(query) {
    if (!query || typeof query !== 'object') {
        return '';
    }
    const parts = [];
    Object.keys(query).forEach(key => {
        const value = query[key];
        if (value === undefined || value === null || value === '') {
            return;
        }
        parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value)));
    });
    return parts.length ? '?' + parts.join('&') : '';
}

function createRemoteStore(options) {
    const resource = options && options.resource;
    if (!resource) {
        throw new TypeError('remote-store 需要指定 resource');
    }

    function call(path, method, data) {
        return request(path, { method, data })
            .then(result => ({ data: result, error: null }))
            .catch(err => ({
                data: null,
                error: { code: 'HTTP_ERROR', message: err.message || '请求失败' },
            }));
    }

    const store = {
        list(query) {
            return call('/' + resource + toQuery(query), 'GET');
        },

        get(id) {
            return call('/' + resource + '/' + id, 'GET');
        },

        create(payload) {
            return call('/' + resource, 'POST', payload);
        },

        update(id, patch) {
            return call('/' + resource + '/' + id, 'PATCH', patch);
        },

        remove(id) {
            return call('/' + resource + '/' + id, 'DELETE');
        },
    };

    // 资源级动作（例如提醒打卡、预约评价），保持和 CRUD 一样的 { data, error } 返回
    const actions = (options && options.actions) || {};
    Object.keys(actions).forEach(name => {
        store[name] = function (...args) {
            const action = actions[name](...args);
            return call(action.path, action.method || 'POST', action.data);
        };
    });

    return store;
}

module.exports = {
    createRemoteStore,
};
