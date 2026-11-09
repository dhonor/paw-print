// utils/lbs.js
// 腾讯位置服务（LBS）封装：定位在端上做，检索走自己的后端代理。
//
// 为什么不再直连 apis.map.qq.com：
// WebServiceAPI 的 key 一旦打进小程序包就等于公开（包可反编译），会被盗刷配额。
// 现在 key 只存在服务端 .env（LBS_KEY），小程序调用 /api/lbs/*，由后端转发。
//
// 本地模式（config.useRemote = false）没有后端，周边服务会返回 NO_BACKEND。
// 真机定位需要在 app.json 声明 permission.scope.userLocation 与 requiredPrivateInfos。

const { useRemote } = require('./config');
const { request } = require('./api');

// 周边搜索半径（米）：5 公里，由腾讯自动扩大一次范围
const DEFAULT_RADIUS = 5000;

function proxy(path, data) {
    if (!useRemote) {
        return Promise.resolve({
            data: null,
            error: {
                code: 'NO_BACKEND',
                message: '周边服务需要通过后端访问，请先启动 paw-print-server',
            },
        });
    }
    return request(path, { method: 'GET', data }).then(
        body => ({ data: body, error: null }),
        err => ({
            data: null,
            error: {
                code: err.statusCode || 'LBS_ERROR',
                message: err.message || '位置服务请求失败',
            },
        }),
    );
}

// 获取用户当前位置（gcj02，与微信内置地图、腾讯地图一致）
function getLocation() {
    return new Promise(resolve => {
        wx.getLocation({
            type: 'gcj02',
            isHighAccuracy: true,
            success(res) {
                resolve({
                    data: {
                        latitude: res.latitude,
                        longitude: res.longitude,
                    },
                    error: null,
                });
            },
            fail(err) {
                const message = (err && err.errMsg) || '';
                const denied = message.indexOf('deny') !== -1 || message.indexOf('authorize') !== -1;
                resolve({
                    data: null,
                    error: {
                        code: denied ? 'LOCATION_DENIED' : 'LOCATION_FAIL',
                        message: denied ? '尚未获得位置权限' : '定位失败，请稍后重试',
                    },
                });
            },
        });
    });
}

// 逆地址解析：把坐标换成「XX市XX区XX路」这样的可读位置
function reverseGeocode(latitude, longitude) {
    return proxy('/lbs/geocode', { latitude, longitude }).then(res => {
        if (res.error) {
            return { data: null, error: res.error };
        }
        const result = (res.data && res.data.result) || {};
        const recommend = result.formatted_addresses && result.formatted_addresses.recommend;
        return {
            data: { address: recommend || result.address || '' },
            error: null,
        };
    });
}

// 周边搜索：keyword 由页面的分类 tab 决定（宠物医院 / 宠物美容 / 宠物店 / 宠物乐园）
function searchNearby(options) {
    const opts = options || {};
    return proxy('/lbs/search', {
        keyword: opts.keyword || '',
        latitude: opts.latitude,
        longitude: opts.longitude,
        radius: opts.radius || DEFAULT_RADIUS,
        pageSize: opts.pageSize || 20,
    }).then(res => {
        if (res.error) {
            return { data: null, error: res.error };
        }
        const rows = (res.data && res.data.data) || [];
        return { data: rows.map(toPlace), error: null };
    });
}

function toPlace(item) {
    const location = item && item.location ? item.location : {};
    const adInfo = item && item.ad_info ? item.ad_info : {};
    return {
        id: String(item.id || location.lat + '-' + location.lng),
        title: item.title || '未命名地点',
        address: item.address || adInfo.title || '',
        tel: item.tel || '',
        category: item.category || '',
        latitude: location.lat || 0,
        longitude: location.lng || 0,
        distanceText: formatDistance(item._distance),
    };
}

function formatDistance(distance) {
    if (typeof distance !== 'number' || !Number.isFinite(distance) || distance < 0) {
        return '';
    }
    if (distance < 1000) {
        return Math.round(distance) + 'm';
    }
    return (distance / 1000).toFixed(1) + 'km';
}

module.exports = {
    getLocation,
    reverseGeocode,
    searchNearby,
};
