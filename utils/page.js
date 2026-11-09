// utils/page.js
// 页面级复用逻辑。目标是把每个页面都要抄一遍的样板代码收在一处。

// 下拉刷新收尾：等 load() 的 Promise 结束再收起动画。
// 传非 Promise 也能用（例如提前 return 的缓存分支），会立即收起。
function stopRefresh(result) {
    const done = () => {
        if (typeof wx !== 'undefined' && wx.stopPullDownRefresh) {
            wx.stopPullDownRefresh();
        }
    };
    if (result && typeof result.then === 'function') {
        result.then(done, done);
        return;
    }
    done();
}

module.exports = {
    stopRefresh,
};
