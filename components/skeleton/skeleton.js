// components/skeleton/skeleton.js
// 骨架屏：加载时先占住版面，避免从“转圈”到“内容”的布局跳动。
Component({
    properties: {
        count: {
            type: Number,
            value: 3,
        },
    },
});
