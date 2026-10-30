// pages/family/family.js
// 家庭共享：
// - 远端模式（默认）：家庭是真实账号组成的，靠邀请码加入，记录人就是当前登录用户；
// - 本地模式（config.useRemote = false）：手工维护成员名单，可切换「当前记录人」。

const {
    familyStore,
    MEMBER_ROLES,
    getCurrentMemberId,
    setCurrentMemberId,
    useRemoteFamily,
} = require('../../utils/family-store');
const feedback = require('../../utils/feedback');

Page({
    data: {
        isRemote: useRemoteFamily,
        viewState: 'loading',
        members: [],
        currentId: '',
        family: null,
        roles: MEMBER_ROLES,
        memberName: '',
        roleIndex: 0,
        inviteInput: '',
        error: '',
        submitting: false,
    },

    onShow() {
        this.loadMembers();
    },

    loadMembers() {
        this.setData({ viewState: 'loading' });
        if (this.data.isRemote) {
            this.loadRemoteFamily();
            return;
        }
        familyStore.list().then(result => {
            if (result.error) {
                this.setData({ viewState: 'error' });
                return;
            }
            const raw = result.data || [];
            let currentId = getCurrentMemberId();
            if (!hasMember(raw, currentId)) {
                currentId = raw.length > 0 ? String(raw[0].id) : '';
                setCurrentMemberId(currentId);
            }
            const members = raw.map(member => ({
                id: String(member.id),
                name: member.name,
                role: member.role,
                avatar: Array.from(String(member.name || '友'))[0] || '友',
                isCurrent: String(member.id) === String(currentId),
            }));
            this.setData({
                members,
                currentId,
                viewState: members.length === 0 ? 'empty' : 'ready',
            });
        });
    },

    loadRemoteFamily() {
        familyStore.detail().then(result => {
            if (result.error) {
                this.setData({ viewState: 'error' });
                return;
            }
            const family = result.data;
            const members = (family.members || []).map(member => ({
                id: String(member.id),
                name: member.name,
                role: member.role,
                avatar: Array.from(String(member.name || '友'))[0] || '友',
                isSelf: member.isSelf,
            }));
            this.setData({
                family: { name: family.name, inviteCode: family.inviteCode },
                members,
                viewState: members.length === 0 ? 'empty' : 'ready',
            });
        });
    },

    // 邀请码复制给家人
    copyInvite() {
        const code = this.data.family && this.data.family.inviteCode;
        if (!code) {
            return;
        }
        wx.setClipboardData({
            data: code,
            success: () => feedback.success('邀请码已复制'),
        });
    },

    onInviteInput(event) {
        this.setData({ inviteInput: event.detail.value });
    },

    // 用家人的邀请码加入同一个家庭
    joinFamily() {
        if (this.data.submitting) {
            return;
        }
        const code = String(this.data.inviteInput || '').trim();
        if (code === '') {
            this.setData({ error: '请输入邀请码' });
            return;
        }
        this.setData({ submitting: true, error: '' });
        familyStore.join(code).then(result => {
            this.setData({ submitting: false });
            if (result.error) {
                this.setData({ error: result.error.message || '加入失败' });
                return;
            }
            this.setData({ inviteInput: '' });
            feedback.success('已加入「' + (result.data.name || '家庭') + '」');
            this.loadRemoteFamily();
        });
    },

    // ---------- 以下为本地模式的成员管理 ----------

    onNameInput(event) {
        this.setData({ memberName: event.detail.value });
    },

    onRoleTap(event) {
        this.setData({ roleIndex: Number(event.currentTarget.dataset.index) });
    },

    addMember() {
        if (this.data.submitting) {
            return;
        }
        const name = String(this.data.memberName || '').trim();
        if (name === '') {
            this.setData({ error: '请填写称呼，如「妈妈」「小王」' });
            return;
        }
        this.setData({ submitting: true, error: '' });
        familyStore.create({
            name,
            role: this.data.roles[this.data.roleIndex],
        }).then(result => {
            this.setData({ submitting: false });
            if (result.error) {
                this.setData({ error: result.error.message || '添加失败' });
                return;
            }
            const created = result.data;
            if (this.data.members.length === 0 && created) {
                setCurrentMemberId(created.id);
            }
            this.setData({ memberName: '', roleIndex: 0 });
            this.loadMembers();
        });
    },

    selectMember(event) {
        // 远端模式下记录人恒为登录用户，不支持手动切换
        if (this.data.isRemote) {
            return;
        }
        const id = event.currentTarget.dataset.id;
        setCurrentMemberId(id);
        this.loadMembers();
        feedback.toast('已切换记录人');
    },

    removeMember(event) {
        const id = event.currentTarget.dataset.id;
        wx.showModal({
            title: '移除成员',
            content: '移除后该成员不再作为可选的记录人',
            confirmColor: '#ff8a65',
            success: res => {
                if (!res.confirm) {
                    return;
                }
                familyStore.remove(id).then(() => {
                    if (String(id) === String(this.data.currentId)) {
                        setCurrentMemberId('');
                    }
                    this.loadMembers();
                });
            },
        });
    },
});

function hasMember(members, id) {
    for (let i = 0; i < members.length; i += 1) {
        if (String(members[i].id) === String(id)) {
            return true;
        }
    }
    return false;
}
