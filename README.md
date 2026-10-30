# 爪印 PAW-PRINT

宠物成长记录小程序（原生框架）。记录疫苗、驱虫、体重、就诊，到期自动提醒；支持家庭成员共享、品种百科、周边服务与预约。

后端服务在**同级目录** `../paw-print-server`（NestJS + Prisma + PostgreSQL），接口文档见那边的 README。

---

## 功能一览

| 模块 | 页面 | 说明 |
|---|---|---|
| 首页 | `pages/index` | 品牌卡、待办提醒、健康预警、宠物卡、最近记录、周边入口 |
| 宠物档案 | `pages/pet-list` | 卡片式列表，头部带自定义头像 |
| 宠物信息 | `pages/pet-edit` | 新增/编辑；头像可选预设或上传照片 |
| 宠物详情 | `pages/pet-detail` | 身份证卡、最近记录、导出图片、数字身份入口 |
| 成长记录 | `pages/record` | 记录卡片、体重趋势、异常统计、记录人 |
| 提醒中心 | `pages/reminders` | 7 类周期提醒、完成打卡顺延、微信订阅提醒 |
| 品种百科 | `pages/encyclopedia` | 13 个品种、分类筛选、详情弹窗 |
| 周边服务 | `pages/nearby` | 定位授权 + 腾讯 LBS 周边 POI |
| 预约 | `pages/booking` / `pages/bookings` | 预约表单 + 我的预约（完成/取消/评价） |
| 数字身份 | `pages/pet-identity` | 鼻纹建档、拍照识品种、健康初筛（识别为占位实现） |
| 家庭共享 | `pages/family` | 成员列表、邀请码加入 |
| 我的 | `pages/profile` | 个人资料（头像/昵称）+ 功能入口 |

---

## 技术栈

- 微信小程序原生框架（无 UI 库、无构建工具）
- 数据层：可切换的 store 抽象（本地 `wx.storage` ↔ 自建后端 REST）
- 图标：本地 PNG（`assets/icons` 33 个 + `assets/tabbar` 6 个），不使用 emoji
- 设计系统：`app.wxss` 中的 CSS 变量 token

---

## 目录结构

```
paw-print/
├── app.js / app.json / app.wxss     # 入口、页面注册、全局 token 与基础样式
├── project.config.json              # 项目配置（urlCheck 需为 false）
├── project.private.config.json      # 本地私有配置，优先级更高，别漏改
├── pages/                           # 13 个页面
├── components/
│   ├── pet-card/                    # 首页宠物卡
│   └── skeleton/                    # 骨架屏
├── assets/
│   ├── icons/                       # 功能图标与 8 个宠物头像 PNG
│   └── tabbar/                      # 底部导航图标（普通/选中）
└── utils/
    ├── config.js                    # ★ 前后端开关与接口地址
    ├── api.js                       # 请求层：自动登录、token、401 重试
    ├── local-store.js               # 本地存储实现（工厂函数）
    ├── remote-store.js              # 后端实现（与 local 同签名）
    ├── pet-store.js                 # 按 config 选择实现
    ├── record-store.js
    ├── reminder-store.js
    ├── booking-store.js
    ├── family-store.js
    ├── upload.js                    # 选图 + 上传
    ├── notify.js                    # 订阅消息授权
    ├── badge.js                     # tabBar 提醒徽标
    ├── feedback.js                  # 统一 toast/成功/错误反馈
    ├── date.js                      # 日期工具
    ├── icons.js                     # 图标与头像地址解析
    ├── health-score.js              # 健康初筛规则（纯本地）
    ├── ai-vision.js                 # 品种/鼻纹识别适配层（当前为占位）
    ├── lbs.js                       # 腾讯位置服务封装
    └── seed.js                      # 示例数据（用户主动触发才写入）
```

---

## 快速开始

### 1. 启动后端

```powershell
cd ../paw-print-server
.\start-dev.ps1            # 一键：Docker 数据库 + 后端服务
```

看到 `listening on http://127.0.0.1:4000/api` 即成功。

### 2. 打开小程序

微信开发者工具 → 导入项目 → 选择本目录。

确认「详情 → 本地设置」里**取消勾选**「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」。

> 注意语义：勾选 = 开启校验。本地跑 `http://127.0.0.1` 必须**取消勾选**。

### 3. 编译

Ctrl+B 编译。首页能刷出内容即为链路打通。

---

## 配置项（`utils/config.js`）

```js
module.exports = {
    useRemote: true,                        // 是否使用后端；false 则回到纯本地存储
    apiBase: 'http://127.0.0.1:4000/api',   // 模拟器用 127.0.0.1，真机换局域网 IP
    devLoginCode: 'dev-user',               // 本地 mock 登录；接真实登录改成 ''
    subscribeTemplateId: '',                // 订阅消息模板 ID，留空则推送走 mock
};
```

| 场景 | 需要改什么 |
|---|---|
| 日常开发（模拟器） | 不用改 |
| 真机预览 | `apiBase` 换成 `http://<电脑局域网IP>:4000/api` |
| 接真实微信登录 | `devLoginCode: ''`，后端 `.env` 填 `WX_SECRET` |
| 纯本地演示（无后端） | `useRemote: false`，页面零改动 |
| 正式发布 | `apiBase` 换成备案的 https 域名，并在小程序后台配置 request 白名单 |

---

## 数据层设计

页面只调用 `xxxStore.list() / create() / update() / remove()`，所有方法返回 `Promise<{ data, error }>`，**永不 reject**。

```
页面 ──> pet-store ──┬─> local-store  (wx.storage)
                     └─> remote-store (HTTP)
```

- 两种实现签名完全一致，切换只改 `config.useRemote`；
- 业务特殊动作通过 `actions` 扩展，例如：
  - `reminderStore.complete(id)` → `POST /reminders/:id/complete`（服务端顺延下次日期）
  - `bookingStore.rate(id, payload)` → `POST /bookings/:id/rate`（仅已完成可评）

已接后端的域：宠物、记录、提醒、预约、家庭。改为 `useRemote: false` 时全部回落到本地。

---

## 后端接口（详见 `../paw-print-server/README.md`）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/login` | `{ code }` → `{ token }` |
| GET/POST/PATCH/DELETE | `/api/pets`、`/api/records`、`/api/reminders`、`/api/bookings` | CRUD |
| GET/PATCH | `/api/family`、`/api/family/me` | 家庭信息、个人资料（昵称/头像） |
| POST | `/api/family/join` | 邀请码加入家庭（返回新 token） |
| POST | `/api/upload` | 图片上传，返回可访问地址 |
| POST | `/api/notify/subscribe` | 上报订阅额度 |

除 `/auth/login` 外都要带 `Authorization: Bearer <token>`。

---

## 设计规范

`app.wxss` 里的 CSS 变量，页面只引用不硬编码：

| 类别 | 值 |
|---|---|
| 主色 | `#FF8A65`（蜜桃珊瑚）；主色上的文字用 `#4A2415`（对比 5.8:1） |
| 页面底色 | `#FFF7F0`（奶油） |
| 文字三级 | `#3A2A22` / `#7A675C` / `#806B5E` |
| 圆角 | 8 徽标 / 16 控件 / 24 卡片 / 999 胶囊 |
| 间距 | 8 / 16 / 24 / 32 / 48 |
| 动效 | 160ms / 220ms，缓动 `cubic-bezier(0.2,0,0,1)` |

**无边框设计**：不使用 1rpx 描边。卡片靠「白底 + 极轻阴影 `0 6rpx 20rpx rgba(58,42,34,.05)`」与奶油底分层。

---

## 常见问题

| 现象 | 原因 | 处理 |
|---|---|---|
| 首页「加载失败」+ 域名校验报错 | `project.private.config.json` 里的 `urlCheck` 覆盖了主配置 | 两个配置文件都把 `urlCheck` 设为 `false`，或在开发者工具里手动取消勾选 |
| 连不上后端（`[::1]` 拒绝） | Windows 上 localhost 解析到 IPv6，服务只监听 IPv4 | 已改双栈监听；接口地址用 `127.0.0.1` |
| 字段莫名变 `undefined` | 后端改了 Prisma schema 但没重启 | `prisma generate` → `db push` → **重启后端** |
| 真机请求超时 | 还在用 `127.0.0.1` | 换局域网 IP，手机与电脑同 WiFi，手机端打开「调试」 |
| 小程序空白但无报错 | 未编译或缓存旧代码 | Ctrl+B，必要时「清缓存 → 全部清除」 |

---

## 已知边界

1. **AI 识别是占位**：`utils/ai-vision.js` 用图片路径做哈希生成稳定但伪造的结果，页面已标「占位识别」。真实服务必须经后端调用，密钥不能进小程序。
2. **订阅消息需配置模板**：`subscribeTemplateId` 为空时，点「开启」只提示未配置；后端推送也只打日志。微信是一次性订阅，授权一次发一条。
3. **图片存本地磁盘**：后端 `uploads/` 目录只适合开发，生产需换对象存储，并补 `imgSecCheck` 内容安全审核。
4. **家庭共享依赖后端**：本地模式下成员只是手动维护的名单，不是真实账号。
5. **周边服务**：腾讯 LBS key 的免费配额有限，超限会返回 status 121，需要自行扩容或换 key。
