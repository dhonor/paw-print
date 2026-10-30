// utils/config.js
// 前后端切换开关。想回到纯本地存储，把 useRemote 改成 false 即可，页面代码不用动。

module.exports = {
    // 是否使用自建后端（paw-print-server）
    useRemote: true,

    // 后端地址：
    // - 写局域网 IP 可以让「模拟器 + 真机预览」共用一份配置（手机上的 127.0.0.1 指向手机自己，会连不上）
    // - 电脑 IP 变了（换 WiFi / DHCP 重新分配）要同步改这里
    // - 上线前换成备案的 https 域名，并在小程序后台配置 request 合法域名
    apiBase: 'http://192.168.8.56:4000/api',

    // 本地 mock 登录：后端没配 WX_SECRET 时，用固定 code 保证每次都是同一个用户。
    // 接真实微信登录前，把它改成 '' 即可走 wx.login。
    devLoginCode: 'dev-user',

    // 订阅消息模板 ID（小程序后台 -> 订阅消息 -> 我的模板）
    // 留空时「微信提醒」按钮会提示未配置，后端推送也只打日志
    subscribeTemplateId: '',
};
