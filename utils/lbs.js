// utils/lbs.js
// 腾讯位置服务（LBS）封装：定位、逆地址解析、周边 POI 搜索。
//
// 注意（上线前必做）：
// 1. 小程序后台「开发管理 → 服务器域名」把 https://apis.map.qq.com 加入 request 合法域名；
// 2. 腾讯位置服务控制台里把该 key 的 WebServiceAPI 打开，并绑定小程序 AppID；
// 3. 真机上的定位需要在 app.json 声明 permission.scope.userLocation 与 requiredPrivateInfos。

const LBS_KEY = 'QEUBZ-WVIET-IWWXJ-VZ7RJ-FEGV7-YIFZ6';
const SEARCH_URL = 'https://apis.map.qq.com/ws/place/v1/search';
const GEOCODER_URL = 'https://apis.map.qq.com/ws/geocoder/v1/';
// 周边搜索半径（米）：5 公里，可自动扩大一次范围
const DEFAULT_RADIUS = 5000;

function request(url, data) {
    return new Promise(resolve => {
        wx.request({
            url,
            data,
            method: 'GET',
            timeout: 10000,
            success(res) {
                const body = res.data && typeof res.data === 'object' ? res.data : {};
                if (res.statusCode !== 200 || body.status !== 0) {
                    resolve({
                        data: null,
                        error: {
                            code: body.status || res.statusCode,
                            message: body.message || '位置服务请求失败',
                        },
                    });
                    return;
                }
                resolve({ data: body, error: null });
            },
            fail(err) {
                resolve({
                    data: null,
                    error: {
                        code: 'NETWORK_ERROR',
                        message: (err && err.errMsg) || '网络异常，请检查网络连接',
                    },
                });
            },
        });
    });
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
    return request(GEOCODER_URL, {
        location: latitude + ',' + longitude,
        key: LBS_KEY,
        get_poi: 0,
    }).then(res => {
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
    const latitude = opts.latitude;
    const longitude = opts.longitude;
    const radius = opts.radius || DEFAULT_RADIUS;
    return request(SEARCH_URL, {
        keyword: opts.keyword || '',
        // nearby(中心点纬度,经度,半径,是否自动扩大范围)
        boundary: 'nearby(' + latitude + ',' + longitude + ',' + radius + ',1)',
        orderby: '_distance',
        page_size: opts.pageSize || 20,
        page_index: 1,
        key: LBS_KEY,
        output: 'json',
    }).then(res => {
        if (res.error) {
            return { data: null, error: res.error };
        }
        const rows = (res.data && res.data.data) || [];
        const places = rows.map(toPlace);
        return { data: places, error: null };
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
    LBS_KEY,
    getLocation,
    reverseGeocode,
    searchNearby,
};
