// utils/health-score.js
// 健康初筛：纯本地规则打分，不依赖外部服务，也不构成医疗诊断。
//
// 规则刻意保守：只在「近期异常多、体重波动大、疫苗/驱虫过期」时提示关注，
// 目的是让用户去看记录，而不是替代医生。

const { daysBetween } = require('./date');

const LEVELS = [
    { min: 90, level: 'good', text: '状态良好', color: '#2fa97c' },
    { min: 75, level: 'warn', text: '建议关注', color: '#e6a23c' },
    { min: 60, level: 'alert', text: '需要留意', color: '#e6a23c' },
    { min: 0, level: 'danger', text: '建议就医', color: '#e2574c' },
];

// records: [{ type, date, value, anomaly }]，只传当前宠物的记录
function evaluate(records) {
    const list = Array.isArray(records) ? records : [];
    let score = 100;
    const items = [];
    const advice = [];

    const anomaly30 = countWithin(list, '异常', 30);
    score -= Math.min(24, anomaly30 * 8);
    items.push({
        label: '近 30 天异常',
        value: anomaly30 + ' 条',
        status: anomaly30 === 0 ? 'good' : (anomaly30 < 3 ? 'warn' : 'bad'),
    });
    if (anomaly30 >= 2) {
        advice.push('近 30 天有 ' + anomaly30 + ' 次异常记录，若持续出现建议就医检查');
    }

    const weightDelta = latestWeightDelta(list);
    if (weightDelta !== null && Math.abs(weightDelta) >= 6) {
        score -= 10;
        items.push({
            label: '体重变化',
            value: (weightDelta > 0 ? '+' : '') + weightDelta.toFixed(1) + '%',
            status: 'warn',
        });
        advice.push('体重较上次变化较大，注意饮食与运动是否同步调整');
    } else if (weightDelta !== null) {
        items.push({
            label: '体重变化',
            value: (weightDelta > 0 ? '+' : '') + weightDelta.toFixed(1) + '%',
            status: 'good',
        });
    }

    const vaccineDays = daysSinceLast(list, '疫苗');
    if (vaccineDays === null) {
        score -= 8;
        items.push({ label: '疫苗', value: '无记录', status: 'warn' });
    } else if (vaccineDays > 365) {
        score -= 10;
        items.push({ label: '疫苗', value: vaccineDays + ' 天前', status: 'warn' });
        advice.push('距离上次疫苗已超过一年，记得核对免疫计划');
    } else {
        items.push({ label: '疫苗', value: vaccineDays + ' 天前', status: 'good' });
    }

    const dewormDays = daysSinceLast(list, '驱虫');
    if (dewormDays !== null && dewormDays > 90) {
        score -= 6;
        items.push({ label: '驱虫', value: dewormDays + ' 天前', status: 'warn' });
        advice.push('距上次驱虫已超过 3 个月，建议按周期补做');
    } else if (dewormDays !== null) {
        items.push({ label: '驱虫', value: dewormDays + ' 天前', status: 'good' });
    }

    const lastAny = daysSinceLast(list, null);
    if (lastAny === null || lastAny > 30) {
        score -= 5;
        items.push({ label: '记录活跃度', value: lastAny === null ? '暂无记录' : lastAny + ' 天前', status: 'warn' });
        advice.push('最近记录较少，持续记录才能看出变化');
    } else {
        items.push({ label: '记录活跃度', value: lastAny + ' 天前', status: 'good' });
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    const level = LEVELS.find(item => score >= item.min) || LEVELS[LEVELS.length - 1];
    if (advice.length === 0) {
        advice.push('各项指标平稳，保持现有照护节奏即可');
    }

    return {
        score,
        level: level.level,
        levelText: level.text,
        color: level.color,
        items,
        advice,
    };
}

function countWithin(records, type, days) {
    let count = 0;
    for (let i = 0; i < records.length; i += 1) {
        const record = records[i];
        if (type && record.type !== type) {
            continue;
        }
        const diff = daysBetween(record.date);
        if (diff !== null && diff >= 0 && diff <= days) {
            count += 1;
        }
    }
    return count;
}

function daysSinceLast(records, type) {
    let min = null;
    for (let i = 0; i < records.length; i += 1) {
        const record = records[i];
        if (type && record.type !== type) {
            continue;
        }
        const diff = daysBetween(record.date);
        if (diff !== null && diff >= 0 && (min === null || diff < min)) {
            min = diff;
        }
    }
    return min;
}

// 最近两次体重的变化百分比
function latestWeightDelta(records) {
    const weights = [];
    for (let i = 0; i < records.length; i += 1) {
        const record = records[i];
        if (record.type !== '体重') {
            continue;
        }
        const matched = String(record.value || '').match(/(\d+(\.\d+)?)/);
        if (!matched) {
            continue;
        }
        const value = Number(matched[1]);
        if (Number.isFinite(value) && value > 0) {
            weights.push({ date: record.date, value });
        }
    }
    if (weights.length < 2) {
        return null;
    }
    weights.sort((a, b) => new Date(a.date) - new Date(b.date));
    const last = weights[weights.length - 1].value;
    const prev = weights[weights.length - 2].value;
    if (prev === 0) {
        return null;
    }
    return ((last - prev) / prev) * 100;
}

module.exports = {
    evaluate,
};
