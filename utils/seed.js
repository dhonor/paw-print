// utils/seed.js
// 首次启动只准备「本地身份」（家庭成员「我」），不再自动写入示例宠物和记录。
// 示例数据改为用户主动触发（首页空态的「先看看示例」），
// 避免新用户一进来就看到别人家的狗子，误以为是小程序出了错。

const { petStore } = require('./pet-store');
const { recordStore } = require('./record-store');
const { reminderStore } = require('./reminder-store');
const { familyStore, setCurrentMemberId, useRemoteFamily } = require('./family-store');
const { addDays, today } = require('./date');

function pad(value) {
    return value < 10 ? '0' + String(value) : String(value);
}

function offsetDate(now, days) {
    const d = new Date(now - days * 24 * 60 * 60 * 1000);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function ensureFamily() {
    familyStore.list().then(res => {
        const members = res.data || [];
        if (members.length > 0) {
            return;
        }
        familyStore.create({ name: '我', role: '主人' }).then(r => {
            if (r.data) {
                setCurrentMemberId(r.data.id);
            }
        });
    });
}

// 用户主动选择的示例数据：两只宠物 + 几条记录 + 两条提醒
function createDemoData() {
    const now = Date.now();
    return petStore.create({
        name: '豆豆',
        species: '狗',
        breed: '柯基',
        gender: '公',
        birthday: '2023-05-01',
        avatar: 'dog',
        note: '活泼的小短腿（示例数据）',
        microchip: '900215000123456',
        emergencyContact: '13800000000',
        sterilized: '未绝育',
    }).then(res => {
        const doudouId = res.data ? res.data.id : null;
        return petStore.create({
            name: '咪咪',
            species: '猫',
            breed: '英短',
            gender: '母',
            birthday: '2022-11-20',
            avatar: 'cat',
            note: '高冷但粘人（示例数据）',
            microchip: '900215000654321',
            emergencyContact: '13900000000',
            sterilized: '已绝育',
        }).then(r2 => {
            const mimiId = r2.data ? r2.data.id : null;
            const tasks = [];
            if (mimiId) {
                tasks.push(recordStore.create({ petId: mimiId, type: '体重', date: offsetDate(now, 10), value: '4.2kg', note: '月度称重' }));
                tasks.push(recordStore.create({ petId: mimiId, type: '疫苗', date: offsetDate(now, 2), value: '', note: '猫三联第三针' }));
                tasks.push(reminderStore.create({
                    petId: mimiId,
                    type: '疫苗',
                    cycleDays: 365,
                    nextDate: addDays(today(), 7),
                    enabled: true,
                    note: '示例数据，可直接删除',
                }));
                tasks.push(reminderStore.create({
                    petId: mimiId,
                    type: '驱虫',
                    cycleDays: 90,
                    nextDate: addDays(today(), -2),
                    enabled: true,
                    note: '示例数据：演示逾期预警',
                }));
            }
            if (doudouId) {
                tasks.push(recordStore.create({
                    petId: doudouId,
                    type: '异常',
                    date: offsetDate(now, 3),
                    value: '',
                    anomaly: '呕吐',
                    note: '进食后呕吐一次，当日已缓解',
                }));
            }
            return Promise.all(tasks);
        });
    });
}

// 由页面主动调用：已有宠物则不再重复写入
function seedDemo() {
    return petStore.list().then(res => {
        if ((res.data || []).length > 0) {
            return false;
        }
        return createDemoData().then(() => true);
    });
}

function ensureSeed() {
    // 远端模式下家庭成员是真实账号，登录时后端已自动建档，不需要本地预置
    if (!useRemoteFamily) {
        ensureFamily();
    }
}

module.exports = {
    ensureSeed,
    seedDemo,
};
