// utils/icons.js
// 图标资源与宠物头像的统一入口。
// 项目里不再使用 emoji：图标一律是 assets/icons 下的 PNG，
// 宠物头像存「头像键」（dog / cat / rabbit …），旧数据里的 emoji 会被自动映射。

const AVATAR_KEYS = ['dog', 'cat', 'rabbit', 'hamster', 'bird', 'fish', 'turtle', 'lizard'];

// 兼容历史数据：以前头像是 emoji，直接映射到对应头像键
const EMOJI_TO_KEY = {
    '🐶': 'dog',
    '🐕': 'dog',
    '🦮': 'dog',
    '🐩': 'dog',
    '🐱': 'cat',
    '🐈': 'cat',
    '😺': 'cat',
    '🐰': 'rabbit',
    '🐹': 'hamster',
    '🐦': 'bird',
    '🦜': 'bird',
    '🐠': 'fish',
    '🐢': 'turtle',
    '🦎': 'lizard',
};

const FALLBACK = '/assets/icons/paw.png';

function avatarKey(value) {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (raw === '') {
        return '';
    }
    if (AVATAR_KEYS.indexOf(raw) !== -1) {
        return raw;
    }
    return EMOJI_TO_KEY[raw] || '';
}

function avatarSrc(value) {
    const raw = typeof value === 'string' ? value.trim() : '';
    // 用户上传的照片：直接当图片地址用
    if (/^https?:\/\//.test(raw) || raw.indexOf('wxfile://') === 0) {
        return raw;
    }
    const key = avatarKey(raw);
    return key === '' ? FALLBACK : '/assets/icons/avatar-' + key + '.png';
}

function iconSrc(name) {
    return name ? '/assets/icons/' + name + '.png' : FALLBACK;
}

module.exports = {
    AVATAR_KEYS,
    FALLBACK,
    avatarKey,
    avatarSrc,
    iconSrc,
};
