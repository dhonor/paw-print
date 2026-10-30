// utils/upload.js
// 选图 + 上传：拍照或从相册选，压缩后传到后端 /upload，返回可直接用于 <image src> 的地址。

const { apiBase } = require('./config');
const { login, getToken, clearToken } = require('./api');

function chooseImage() {
    return new Promise((resolve, reject) => {
        wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sizeType: ['compressed'],
            sourceType: ['album', 'camera'],
            success(res) {
                const file = res.tempFiles && res.tempFiles[0];
                if (!file || !file.tempFilePath) {
                    reject(new Error('没有选择图片'));
                    return;
                }
                resolve(file.tempFilePath);
            },
            fail(err) {
                const msg = (err && err.errMsg) || '';
                reject(new Error(msg.indexOf('cancel') !== -1 ? '已取消' : '选择图片失败'));
            },
        });
    });
}

function ensureToken() {
    const token = getToken();
    if (token) {
        return Promise.resolve(token);
    }
    return login().then(res => res.token);
}

function uploadOnce(filePath, token) {
    return new Promise((resolve, reject) => {
        wx.uploadFile({
            url: apiBase + '/upload',
            filePath,
            name: 'file',
            header: { Authorization: 'Bearer ' + token },
            success(res) {
                let data = {};
                try {
                    data = JSON.parse(res.data);
                } catch (e) {
                    data = {};
                }
                if (res.statusCode >= 200 && res.statusCode < 300 && data.url) {
                    resolve({ data, error: null });
                    return;
                }
                const error = new Error(data.message || ('上传失败 ' + res.statusCode));
                error.statusCode = res.statusCode;
                reject(error);
            },
            fail(err) {
                reject(new Error((err && err.errMsg) || '上传失败，请检查网络'));
            },
        });
    });
}

// token 过期时重新登录并重传一次，避免「换头像突然失败」
function uploadFile(filePath) {
    return ensureToken()
        .then(token => uploadOnce(filePath, token).catch(err => {
            if (err.statusCode !== 401) {
                throw err;
            }
            clearToken();
            return login().then(res => uploadOnce(filePath, res.token));
        }));
}

// 一步到位：选图 -> 上传，返回 { data: { url, path }, error }
function pickAndUpload() {
    return chooseImage()
        .then(uploadFile)
        .catch(err => ({ data: null, error: { message: err.message } }));
}

module.exports = {
    chooseImage,
    uploadFile,
    pickAndUpload,
};
