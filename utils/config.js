// utils/config.js
// 前后端切换开关 + 环境配置。
// 环境按小程序自身的版本自动判断，不用每次发版前手改文件：
//   develop（开发者工具/预览）→ 本机或局域网后端
//   trial（体验版）           → 同开发版
//   release（正式版）         → 备案的 https 域名
// 想回到纯本地存储，把 useRemote 改成 false 即可，页面代码不用动。

// 开发机地址。两种取法，按当前在做什么选：
//   USE_LAN = false → 127.0.0.1，只给开发者工具模拟器用（地址永远不变，日常开发就用这个）
//   USE_LAN = true  → 局域网 IP，给手机真机预览用；换 WiFi 或 DHCP 重新分配后要同步改 LAN_IP
// 查当前 IP：Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '10.*' -or $_.IPAddress -like '192.168.*' }
const USE_LAN = true;
const LAN_IP = '10.3.103.29';

const DEV_API_BASE = 'http://' + (USE_LAN ? LAN_IP : '127.0.0.1') + ':4000/api';

// TODO 上线前替换成备案域名，并在小程序后台「开发管理 → 服务器域名」配置 request 白名单
const RELEASE_API_BASE = 'https://api.example.com/api';

function envVersion() {
    try {
        const info = wx.getAccountInfoSync();
        return (info && info.miniProgram && info.miniProgram.envVersion) || 'develop';
    } catch (e) {
        // 基础库过低或非小程序环境时按开发版处理
        return 'develop';
    }
}

const isRelease = envVersion() === 'release';

module.exports = {
    isRelease,

    // 是否使用自建后端（paw-print-server）
    useRemote: true,

    // 后端地址
    apiBase: isRelease ? RELEASE_API_BASE : DEV_API_BASE,

    // 本地 mock 登录：后端没配 WX_SECRET 时用固定 code 保证每次都是同一个用户。
    // 正式版必须为空，走真实 wx.login。
    devLoginCode: isRelease ? '' : 'dev-user',

    // 订阅消息模板 ID（小程序后台 -> 订阅消息 -> 我的模板）
    // 留空时「微信提醒」按钮会提示未配置，后端推送也只打日志
    subscribeTemplateId: '',
};
