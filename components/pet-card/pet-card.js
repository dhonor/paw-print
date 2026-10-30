// components/pet-card/pet-card.js
// 自定义组件：宠物卡片。被首页等多个页面复用，避免重复写卡片布局。
// 通过 properties 接收 pet 对象，通过 triggerEvent 向父页面抛出 tap 事件。

const { ageText } = require('../../utils/date');
const { avatarSrc, FALLBACK } = require('../../utils/icons');

Component({
    properties: {
        pet: {
            type: Object,
            value: {},
        },
    },
    data: {
        age: '年龄未知',
        avatarSrc: '/assets/icons/paw.png',
      avatarFill: false,
    },
    observers: {
        pet(pet) {
            const data = pet && typeof pet === 'object' ? pet : {};
            this.setData({
                age: ageText(data.birthday),
                avatarSrc: avatarSrc(data.avatar),
      avatarFill: /^https?:\/\//.test(data.avatar || ''),
            });
        },
    },
    methods: {
        onTap() {
            this.triggerEvent('tap', { id: this.data.pet.id });
        },

        // 头像加载失败（例如服务端图片被删）时回退到默认爪印
        onAvatarError() {
            if (this.data.avatarSrc === FALLBACK) {
                return;
            }
            this.setData({ avatarSrc: FALLBACK, avatarFill: false });
        },
    },
});
