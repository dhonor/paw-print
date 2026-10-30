// utils/date.js
// 日期与年龄相关的纯函数工具。页面里涉及计算的字段都先在 JS 算好再塞进 data，
// 不要依赖 WXML 表达式做复杂运算（WXML 不支持函数调用）。

function pad(value) {
    return value < 10 ? '0' + String(value) : String(value);
}

function formatDate(value) {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function today() {
    return formatDate(new Date());
}

// 根据生日计算可读年龄（月 / 岁）
function ageText(birthday) {
    if (!birthday) {
        return '年龄未知';
    }
    const start = new Date(birthday);
    if (Number.isNaN(start.getTime())) {
        return '年龄未知';
    }
    const now = new Date();
    let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (months < 0) {
        return '年龄未知';
    }
    if (months === 0) {
        return '不到 1 个月';
    }
    if (months < 12) {
        return months + ' 个月';
    }
    const years = Math.floor(months / 12);
    const rest = months % 12;
    return rest === 0 ? years + ' 岁' : years + ' 岁 ' + rest + ' 个月';
}

// 计算给定日期距离今天的天数（以自然日 0 点计），返回整数：今天=0，过去为正，未来为负
function daysBetween(dateStr) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    const now = new Date();
    const a = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((b.getTime() - a.getTime()) / 86400000);
}

// 相对今天的可读描述：今天 / 昨天 / N天前 / 明天 / 还有N天
function relativeDays(dateStr) {
    const diff = daysBetween(dateStr);
    if (diff === null) {
        return dateStr;
    }
    if (diff === 0) {
        return '今天';
    }
    if (diff === 1) {
        return '昨天';
    }
    if (diff > 1) {
        return diff + '天前';
    }
    if (diff === -1) {
        return '明天';
    }
    return '还有' + (-diff) + '天';
}

// 在指定日期上加减天数，返回 YYYY-MM-DD（用于提醒完成后顺延下次日期）
function addDays(dateStr, days) {
    const base = dateStr ? new Date(dateStr) : new Date();
    const date = Number.isNaN(base.getTime()) ? new Date() : base;
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + Number(days || 0));
    return formatDate(next);
}

module.exports = {
    formatDate,
    today,
    ageText,
    relativeDays,
    daysBetween,
    addDays,
    pad,
};
