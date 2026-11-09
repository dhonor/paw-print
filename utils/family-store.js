// utils/family-store.js
// 家庭共享：两种实现，页面通过 config.useRemote 决定用哪一个。
//
// - 本地版：手工维护成员（称呼 + 角色），可切换「当前记录人」，用于单机演示；
// - 远端版：成员是真实微信账号，靠邀请码加入同一家庭，记录人恒为当前登录用户。
//
// 两者都对外暴露 list()，返回 { data: members, error }，字段统一为
// { id, name, role, isSelf }，所以记录页拿「当前记录人」的代码不用分叉。

const { createLocalStore } = require('./local-store');
const { request, setToken } = require('./api');
const { useRemote } = require('./config');

const MEMBER_ROLES = ['主人', '家人', '朋友', '寄养'];
const CURRENT_MEMBER_KEY = 'paw-print-family-current';

// ---------- 本地实现 ----------
const localFamilyStore = createLocalStore({
    storageKey: 'paw-print-family',
    fields: [
        { key: 'name', type: 'string', required: true, label: '称呼' },
        { key: 'role', type: 'enum', values: MEMBER_ROLES, default: '家人' },
    ],
});

function localList() {
    return localFamilyStore.list().then(result => {
        const members = (result.data || []).map(item => ({
            id: item.id,
            name: item.name,
            role: item.role,
            isSelf: false,
        }));
        return { data: members, error: result.error };
    });
}

// ---------- 远端实现 ----------
function toError(err) {
    return { code: 'HTTP_ERROR', message: (err && err.message) || '请求失败' };
}

const remoteFamilyStore = {
    // 家庭信息（名称 + 邀请码 + 成员）
    detail() {
        return request('/family')
            .then(res => ({
                data: {
                    id: res.id,
                    name: res.name,
                    inviteCode: res.inviteCode,
                    members: (res.members || []).map(m => ({
                        id: m.id,
                        // 未设置昵称时：自己是「我」，其他人是「家人」
                        name: m.nickname || (m.isSelf ? '我' : '家人'),
                        nickname: m.nickname || '',
                        role: m.role,
                        avatar: m.avatar || '',
                        isSelf: !!m.isSelf,
                    })),
                },
                error: null,
            }))
            .catch(err => ({ data: null, error: toError(err) }));
    },

    // 与本地版保持同一签名，供记录页取「当前记录人」
    list() {
        return remoteFamilyStore.detail().then(result => {
            if (result.error) {
                return { data: [], error: result.error };
            }
            return { data: result.data.members, error: null };
        });
    },

    // 用邀请码加入别人的家庭，成功后必须换 token（token 里带 familyId）
    join(inviteCode) {
        return request('/family/join', { method: 'POST', data: { inviteCode } })
            .then(res => {
                if (res && res.token) {
                    setToken(res.token);
                }
                return { data: res, error: null };
            })
            .catch(err => ({ data: null, error: toError(err) }));
    },

    rename(name) {
        return request('/family', { method: 'PATCH', data: { name } })
            .then(res => ({ data: res, error: null }))
            .catch(err => ({ data: null, error: toError(err) }));
    },

    updateMe(payload) {
        return request('/family/me', { method: 'PATCH', data: payload })
            .then(res => ({ data: res, error: null }))
            .catch(err => ({ data: null, error: toError(err) }));
    },
};

const familyStore = useRemote ? remoteFamilyStore : localFamilyStore;

// 记录页每次 onShow 都会取记录人，加一个很短的缓存（3 秒）避免同屏重复请求 /family
const CURRENT_MEMBER_TTL = 3000;
let currentMemberCache = { at: 0, value: null };

function getCurrentMemberId() {
    const value = wx.getStorageSync(CURRENT_MEMBER_KEY);
    return typeof value === 'string' ? value : '';
}

function setCurrentMemberId(id) {
    wx.setStorageSync(CURRENT_MEMBER_KEY, id === null || typeof id === 'undefined' ? '' : String(id));
    // 切换记录人后立即失效，避免记录页拿到 3 秒内的旧值
    currentMemberCache = { at: 0, value: null };
}

// 取当前记录人：远端模式下就是登录用户自己；本地模式按选中的成员，没选过取第一个
function getCurrentMember() {
    const now = Date.now();
    if (currentMemberCache.value && now - currentMemberCache.at < CURRENT_MEMBER_TTL) {
        return Promise.resolve(currentMemberCache.value);
    }
    const listMethod = useRemote ? remoteFamilyStore.list : localList;
    return listMethod().then(result => {
        const members = result.data || [];
        let answer;
        if (useRemote) {
            const self = members.find(item => item.isSelf) || members[0] || null;
            answer = { data: self, error: result.error };
        } else {
            const currentId = getCurrentMemberId();
            let current = null;
            for (let i = 0; i < members.length; i += 1) {
                if (String(members[i].id) === String(currentId)) {
                    current = members[i];
                    break;
                }
            }
            if (!current && members.length > 0) {
                current = members[0];
            }
            answer = { data: current, error: result.error };
        }
        currentMemberCache = { at: Date.now(), value: answer };
        return answer;
    });
}

module.exports = {
    familyStore,
    MEMBER_ROLES,
    getCurrentMemberId,
    setCurrentMemberId,
    getCurrentMember,
    useRemoteFamily: useRemote,
};
