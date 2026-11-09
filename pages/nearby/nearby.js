// pages/nearby/nearby.js
// 周边服务：先拿位置权限，再调用腾讯位置服务搜索附近的宠物医院、美容院、商店与乐园。
// 状态机：locating（定位中）→ searching（搜索中）→ ready / empty / denied / error

const { getLocation, reverseGeocode, searchNearby } = require('../../utils/lbs');
const feedback = require('../../utils/feedback');

const CATEGORIES = [
    { key: 'hospital', label: '宠物医院', icon: 'hospital', keyword: '宠物医院' },
    { key: 'grooming', label: '美容院', icon: 'scissors', keyword: '宠物美容' },
    { key: 'shop', label: '宠物商店', icon: 'bag', keyword: '宠物店' },
    { key: 'park', label: '宠物乐园', icon: 'tree', keyword: '宠物乐园' },
];

Page({
    data: {
        state: 'locating',
        locationText: '正在获取当前位置…',
        categories: CATEGORIES,
        activeKey: CATEGORIES[0].key,
        activeLabel: CATEGORIES[0].label,
        places: [],
        placeCount: 0,
        errorMsg: '',
    },

    onLoad() {
        this.coords = null;
        this.locating = false;
        this.searchSeq = 0;
        this.locate();
    },

    // 获取定位 → 逆地址解析 → 搜索当前分类
    locate() {
        // 用实例标记防重入。注意别用 state === 'locating' 判断：
        // 初始 state 就是 locating，那样第一次调用会直接 return，页面永远卡在“定位中”。
        if (this.locating) {
            return Promise.resolve();
        }
        this.locating = true;
        this.setData({
            state: 'locating',
            errorMsg: '',
            locationText: '正在获取当前位置…',
        });
        return getLocation()
            .then(res => {
                this.locating = false;
                if (res.error) {
                    const denied = res.error.code === 'LOCATION_DENIED';
                    this.setData({
                        state: denied ? 'denied' : 'error',
                        errorMsg: res.error.message,
                        locationText: denied ? '未获得位置权限' : '定位失败',
                    });
                    return null;
                }
                this.coords = res.data;
                return this.loadAddress(res.data).then(() => this.search());
            })
            .catch(err => {
                this.locating = false;
                this.setData({
                    state: 'error',
                    errorMsg: (err && err.message) || '定位失败',
                });
            });
    },

    loadAddress(coords) {
        return reverseGeocode(coords.latitude, coords.longitude).then(res => {
            const address = res.data && res.data.address ? res.data.address : '';
            this.setData({ locationText: address || '已定位到当前位置' });
        });
    },

    search() {
        if (!this.coords) {
            return Promise.resolve();
        }
        const active = findCategory(this.data.activeKey);
        // 快速切分类时只认最后一次请求，避免先发后到的旧结果覆盖新分类
        const seq = (this.searchSeq || 0) + 1;
        this.searchSeq = seq;
        this.setData({
            state: 'searching',
            places: [],
            placeCount: 0,
            errorMsg: '',
        });
        return searchNearby({
            keyword: active.keyword,
            latitude: this.coords.latitude,
            longitude: this.coords.longitude,
        }).then(res => {
            if (seq !== this.searchSeq) {
                return;
            }
            if (res.error) {
                this.setData({
                    state: 'error',
                    errorMsg: res.error.message,
                });
                return;
            }
            const places = res.data || [];
            this.setData({
                places,
                placeCount: places.length,
                state: places.length === 0 ? 'empty' : 'ready',
            });
        });
    },

    onCategoryTap(event) {
        const key = event.currentTarget.dataset.key;
        const active = findCategory(key);
        if (!active || key === this.data.activeKey) {
            return;
        }
        this.setData({ activeKey: key, activeLabel: active.label });
        if (this.coords) {
            this.search();
        } else {
            this.locate();
        }
    },

    onRelocate() {
        this.locate();
    },

    onRetry() {
        if (this.coords) {
            this.search();
        } else {
            this.locate();
        }
    },

    onOpenSetting() {
        wx.openSetting({
            success: res => {
                if (res.authSetting && res.authSetting['scope.userLocation']) {
                    this.locate();
                }
            },
        });
    },

    // 从门店发起预约，带上门店信息到预约表单
    onBook(event) {
        const index = Number(event.currentTarget.dataset.index);
        const place = this.data.places[index];
        if (!place) {
            return;
        }
        const url = '/pages/booking/booking?name=' + encodeURIComponent(place.title)
            + '&address=' + encodeURIComponent(place.address || '')
            + '&tel=' + encodeURIComponent(place.tel || '');
        wx.navigateTo({ url });
    },

    onPlaceTap(event) {
        const index = Number(event.currentTarget.dataset.index);
        const place = this.data.places[index];
        if (!place || !place.latitude || !place.longitude) {
            return;
        }
        wx.openLocation({
            latitude: place.latitude,
            longitude: place.longitude,
            name: place.title,
            address: place.address,
            scale: 18,
            fail: () => {
                feedback.error('暂时无法打开地图');
            },
        });
    },
});

function findCategory(key) {
    for (let i = 0; i < CATEGORIES.length; i += 1) {
        if (CATEGORIES[i].key === key) {
            return CATEGORIES[i];
        }
    }
    return CATEGORIES[0];
}
