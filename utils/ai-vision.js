// utils/ai-vision.js
// AI 视觉能力适配层（当前为**占位实现**）：品种识别、鼻纹建档。
//
// 接真实服务时只需要改这里，页面代码不用动：
// 1. ENDPOINTS 填自己的后端地址（不要把第三方 key 放在小程序里）；
// 2. 把 mockBreed / mockNosePrint 换成 wx.uploadFile + wx.request；
// 3. 保持返回结构 Promise<{ data, error }> 不变（与项目里其它 store 一致）。
//
// 页面通过 data.placeholder 展示「占位识别」提示，接入真实服务后由后端返回 placeholder=false。

const ENDPOINTS = {
    breed: '', // 例：'https://your-server.example.com/api/vision/breed'
    nose: '',  // 例：'https://your-server.example.com/api/vision/noseprint'
};

// 占位用的候选品种（真实服务应返回全量品种库 + 置信度）
const BREED_CANDIDATES = [
    { breed: '柯基犬', species: '狗' },
    { breed: '金毛寻回犬', species: '狗' },
    { breed: '中华田园犬', species: '狗' },
    { breed: '泰迪 / 贵宾', species: '狗' },
    { breed: '英短', species: '猫' },
    { breed: '布偶猫', species: '猫' },
    { breed: '橘猫', species: '猫' },
    { breed: '兔子', species: '异宠' },
];

const MOCK_DELAY = 600;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 稳定的伪随机：同一张图 + 同一个盐得到同样的结果，方便调试
function hashString(input) {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function toHex(value, length) {
    const text = (value >>> 0).toString(16).toUpperCase();
    return ('00000000' + text).slice(-length);
}

// 拍照识品种
// options: { imagePath }
function recognizeBreed(options) {
    const imagePath = (options && options.imagePath) || '';
    if (imagePath === '') {
        return Promise.resolve({ data: null, error: { code: 'NO_IMAGE', message: '请先选择一张照片' } });
    }
    return mockBreed(imagePath);
}

// 鼻纹建档：返回唯一特征码（真实服务应由后端生成并落库，避免客户端伪造）
// options: { imagePath, petId }
function extractNosePrint(options) {
    const imagePath = (options && options.imagePath) || '';
    if (imagePath === '') {
        return Promise.resolve({ data: null, error: { code: 'NO_IMAGE', message: '请先拍摄宠物鼻部特写' } });
    }
    return mockNosePrint(imagePath, (options && options.petId) || '');
}

function mockBreed(imagePath) {
    return delay(MOCK_DELAY).then(() => {
        const seed = hashString('breed:' + imagePath);
        const main = BREED_CANDIDATES[seed % BREED_CANDIDATES.length];
        const candidates = [];
        for (let i = 0; i < 3; i += 1) {
            const item = BREED_CANDIDATES[(seed + i * 3) % BREED_CANDIDATES.length];
            candidates.push({
                breed: item.breed,
                confidence: Number((0.96 - i * 0.09).toFixed(2)),
            });
        }
        return {
            data: {
                breed: main.breed,
                species: main.species,
                confidence: Number((0.88 + (seed % 9) / 100).toFixed(2)),
                candidates,
                placeholder: true,
            },
            error: null,
        };
    });
}

function mockNosePrint(imagePath, petId) {
    return delay(MOCK_DELAY + 200).then(() => {
        const seed = hashString('nose:' + petId + ':' + imagePath);
        return {
            data: {
                code: 'NP-' + toHex(seed, 4) + '-' + toHex(hashString(String(seed) + 'x'), 4) + '-' + toHex(hashString(String(seed) + 'y'), 4),
                quality: Number((0.8 + (seed % 17) / 100).toFixed(2)),
                imagePath,
                placeholder: true,
            },
            error: null,
        };
    });
}

module.exports = {
    ENDPOINTS,
    recognizeBreed,
    extractNosePrint,
};
