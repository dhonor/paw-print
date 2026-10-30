// utils/local-store.js
// 通用本地存储数据访问工厂（业务模型层的核心）。
//
// 设计要点（请重点理解）：
// 1. 页面与业务层只依赖返回对象的四个方法：list / create / update / remove；
// 2. 每个方法都返回 Promise<{ data, error }>，不会 reject（error 为 null 表示成功）；
// 3. 返回结构刻意与 cloud-service 的 createTableAccess 保持一致——
//    因此“数据上云”时只需把页面的 store 换成云端实现，页面代码一行不用改。
//
// 字段用配置描述（key / type / required / default），store 自动做归一化与校验。
// 用法示例见 utils/pet-store.js 与 utils/record-store.js。

const ERROR = {
    NOT_FOUND_OR_FORBIDDEN: { code: 'NOT_FOUND_OR_FORBIDDEN', message: '记录不存在或无权修改' },
    INVALID_ID: { code: 'INVALID_ID', message: '缺少记录 id' },
    INVALID_PAYLOAD: { code: 'INVALID_PAYLOAD', message: '没有可提交的字段' },
};

let sequence = 0;

function createLocalStore(options) {
    if (!options || typeof options.storageKey !== 'string' || options.storageKey.trim() === '') {
        throw new TypeError('storageKey 不能为空');
    }
    const storageKey = options.storageKey;
    const fields = Array.isArray(options.fields) ? options.fields : [];

    // 把外部传入的 payload 归一化为干净的字段对象。
    // mode = 'create' 时校验必填；mode = 'update' 时只接受显式传入的字段（其余保持原值）。
    function normalize(payload, mode) {
        const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
        const row = {};
        let writable = 0;
        for (let i = 0; i < fields.length; i += 1) {
            const field = fields[i];
            const hasKey = Object.prototype.hasOwnProperty.call(source, field.key);
            if (mode === 'update' && !hasKey) {
                continue;
            }
            let value = source[field.key];
            if (field.type === 'string') {
                value = typeof value === 'string' ? value.trim() : '';
                if (field.required && value === '' && mode === 'create') {
                    return { error: { code: 'INVALID_PAYLOAD', message: '请填写' + (field.label || field.key) } };
                }
            } else if (field.type === 'number') {
                value = typeof value === 'number' ? value : Number(value);
                if (!Number.isFinite(value)) {
                    value = field.default != null ? field.default : 0;
                }
            } else if (field.type === 'boolean') {
                if (typeof value === 'undefined' || value === null) {
                    value = field.default != null ? field.default : false;
                } else {
                    value = value === true || value === 'true' || value === 1;
                }
            } else if (field.type === 'enum') {
                if (field.values.indexOf(value) === -1) {
                    value = field.default != null ? field.default : field.values[0];
                }
            }
            row[field.key] = value;
            writable += 1;
        }
        if (writable === 0) {
            return { error: ERROR.INVALID_PAYLOAD };
        }
        return { row };
    }

    function readAll() {
        const value = wx.getStorageSync(storageKey);
        return Array.isArray(value) ? value : [];
    }

    function writeAll(items) {
        wx.setStorageSync(storageKey, items);
    }

    function findIndex(items, id) {
        const target = String(id);
        for (let i = 0; i < items.length; i += 1) {
            if (String(items[i].id) === target) {
                return i;
            }
        }
        return -1;
    }

    function newId() {
        sequence = (sequence + 1) % 1000000;
        return String(Date.now()) + '-' + String(sequence);
    }

    function safely(executor) {
        return Promise.resolve()
            .then(executor)
            .catch(error => ({ data: null, error: toClientError(error) }));
    }

    function toClientError(error) {
        const message = error && typeof error === 'object' && typeof error.message === 'string' ? error.message : '';
        return { code: 'CLIENT_EXCEPTION', message: message || '本地读写异常' };
    }

    return {
        list() {
            return safely(() => {
                const items = readAll().slice().sort((a, b) => b.updatedAt - a.updatedAt);
                return { data: items, error: null };
            });
        },

        create(payload) {
            return safely(() => {
                const result = normalize(payload, 'create');
                if (result.error) {
                    return { data: null, error: result.error };
                }
                const now = Date.now();
                const item = Object.assign({ id: newId(), createdAt: now, updatedAt: now }, result.row);
                const items = readAll();
                items.unshift(item);
                writeAll(items);
                return { data: item, error: null };
            });
        },

        update(id, patch) {
            if (isInvalidId(id)) {
                return Promise.resolve({ data: null, error: ERROR.INVALID_ID });
            }
            return safely(() => {
                const result = normalize(patch, 'update');
                if (result.error) {
                    return { data: null, error: result.error };
                }
                const items = readAll();
                const index = findIndex(items, id);
                if (index === -1) {
                    return { data: null, error: ERROR.NOT_FOUND_OR_FORBIDDEN };
                }
                const current = items[index];
                const next = Object.assign({}, current, result.row, { updatedAt: Date.now() });
                items[index] = next;
                writeAll(items);
                return { data: next, error: null };
            });
        },

        remove(id) {
            if (isInvalidId(id)) {
                return Promise.resolve({ data: null, error: ERROR.INVALID_ID });
            }
            return safely(() => {
                const items = readAll();
                const index = findIndex(items, id);
                if (index === -1) {
                    return { data: null, error: ERROR.NOT_FOUND_OR_FORBIDDEN };
                }
                items.splice(index, 1);
                writeAll(items);
                return { data: { removed: 1 }, error: null };
            });
        },
    };
}

function isInvalidId(id) {
    if (typeof id === 'string') {
        return id.trim() === '';
    }
    if (typeof id === 'number') {
        return !Number.isFinite(id);
    }
    return true;
}

module.exports = {
    createLocalStore,
    ERROR,
};
