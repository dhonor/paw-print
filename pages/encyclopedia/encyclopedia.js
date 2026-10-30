// pages/encyclopedia/encyclopedia.js
// 宠物百科：内置常见宠物资料，支持搜索、分类筛选与详情查看。

// 详情弹窗头像：异宠按具体物种，猫狗按大类
const AVATAR_BY_ID = {
    hamster: 'avatar-hamster',
    rabbit: 'avatar-rabbit',
    cockatiel: 'avatar-bird',
};

const AVATAR_BY_CATEGORY = {
    dog: 'avatar-dog',
    cat: 'avatar-cat',
};

const CATEGORIES = [
    { key: 'all', text: '全部' },
    { key: 'dog', text: '狗狗' },
    { key: 'cat', text: '猫咪' },
    { key: 'exotic', text: '异宠' },
];

const PETS = [
    {
        id: 'tianyuan',
        name: '中华田园犬',
        category: 'dog',
        categoryText: '狗狗',
        icon: 'paw',
        personality: '忠诚护主、适应力强、看家好手',
        lifespan: '12-20 年',
        size: '中小型',
        difficulty: '低',
        diet: '杂食偏肉，注意控制盐分',
        intro: '本土犬种，体质强健、不易生病，适合新手与有庭院的家庭。',
    },
    {
        id: 'golden',
        name: '金毛寻回犬',
        category: 'dog',
        categoryText: '狗狗',
        icon: 'paw',
        personality: '温顺友善、易训练、亲人',
        lifespan: '10-12 年',
        size: '中大型',
        difficulty: '中',
        diet: '高蛋白犬粮，需充足运动',
        intro: '经典家庭伴侣犬，对孩子友好，掉毛较多需常梳理。',
    },
    {
        id: 'corgi',
        name: '柯基犬',
        category: 'dog',
        categoryText: '狗狗',
        icon: 'paw',
        personality: '活泼机警、短腿萌、爱叫',
        lifespan: '12-15 年',
        size: '小型',
        difficulty: '中',
        diet: '易胖，需控食与运动',
        intro: '牧牛犬出身、精力旺盛，注意保护腰椎，避免频繁上下楼。',
    },
    {
        id: 'poodle',
        name: '泰迪 / 贵宾',
        category: 'dog',
        categoryText: '狗狗',
        icon: 'paw',
        personality: '聪明、少掉毛、黏人',
        lifespan: '12-15 年',
        size: '小型',
        difficulty: '低',
        diet: '注意泪痕与牙齿护理',
        intro: '卷毛不掉毛，适合易过敏人群，造型多变、体味小。',
    },
    {
        id: 'labrador',
        name: '拉布拉多',
        category: 'dog',
        categoryText: '狗狗',
        icon: 'paw',
        personality: '友善、易训练、贪吃',
        lifespan: '10-12 年',
        size: '大型',
        difficulty: '中',
        diet: '极易发胖，严格控量',
        intro: '常见导盲犬，性格稳定，运动量需求大。',
    },
    {
        id: 'border-collie',
        name: '边境牧羊犬',
        category: 'dog',
        categoryText: '狗狗',
        icon: 'paw',
        personality: '极聪明、精力旺盛、敏感',
        lifespan: '12-15 年',
        size: '中大型',
        difficulty: '高',
        diet: '需大量运动与智力游戏',
        intro: '智商最高的犬种，适合有训练经验的主人。',
    },
    {
        id: 'british-shorthair',
        name: '英国短毛猫',
        category: 'cat',
        categoryText: '猫咪',
        icon: 'paw',
        personality: '温厚安静、圆脸易养',
        lifespan: '12-17 年',
        size: '中型',
        difficulty: '低',
        diet: '易胖，需控食',
        intro: '脾气好、适应力强，适合上班族与家庭。',
    },
    {
        id: 'american-shorthair',
        name: '美国短毛猫',
        category: 'cat',
        categoryText: '猫咪',
        icon: 'paw',
        personality: '健壮活泼、少病',
        lifespan: '15-20 年',
        size: '中型',
        difficulty: '低',
        diet: '普通猫粮即可',
        intro: '体质强健，性格温和，是省心的陪伴型选手。',
    },
    {
        id: 'ragdoll',
        name: '布偶猫',
        category: 'cat',
        categoryText: '猫咪',
        icon: 'paw',
        personality: '黏人温顺、忍痛性高',
        lifespan: '12-15 年',
        size: '大型',
        difficulty: '中',
        diet: '长毛需每日梳理',
        intro: '亲人被称为“小狗猫”，抱起来软绵绵，适合居家陪伴。',
    },
    {
        id: 'local-cat',
        name: '中华田园猫',
        category: 'cat',
        categoryText: '猫咪',
        icon: 'paw',
        personality: '独立强健、好养活',
        lifespan: '15-20 年',
        size: '中型',
        difficulty: '低',
        diet: '不挑食、少病',
        intro: '本土猫，捕猎能力强、生存力高，是省心之选。',
    },
    {
        id: 'hamster',
        name: '仓鼠',
        category: 'exotic',
        categoryText: '异宠',
        icon: 'paw',
        personality: '小巧可爱、夜行、独居',
        lifespan: '2-3 年',
        size: '微型',
        difficulty: '中',
        diet: '专用粮 + 磨牙玩具',
        intro: '适合儿童入门的小宠，需要安静环境与跑轮。',
    },
    {
        id: 'rabbit',
        name: '垂耳兔',
        category: 'exotic',
        categoryText: '异宠',
        icon: 'paw',
        personality: '温顺亲人、胆小',
        lifespan: '8-12 年',
        size: '小型',
        difficulty: '中',
        diet: '以牧草为主，忌水洗',
        intro: '需要陪伴与活动空间，牙齿终身生长要磨牙。',
    },
    {
        id: 'cockatiel',
        name: '玄凤鹦鹉',
        category: 'exotic',
        categoryText: '异宠',
        icon: 'paw',
        personality: '聪明、长寿、需互动',
        lifespan: '15-25 年',
        size: '小型',
        difficulty: '高',
        diet: '种子谷物 + 新鲜蔬果',
        intro: '能学哨音，需要大量陪伴与精神刺激，饲养前请三思。',
    },
];

Page({
    data: {
        keyword: '',
        categories: CATEGORIES,
        activeCategory: 'all',
        list: PETS,
        showDetail: false,
        detail: null,
    },

    onLoad() {
        this.setData({ list: PETS });
    },

    onSearch(event) {
        const keyword = (event.detail.value || '').trim();
        this.setData({ keyword });
        this.applyFilter(keyword, this.data.activeCategory);
    },

    onCategory(event) {
        const key = event.currentTarget.dataset.key;
        this.setData({ activeCategory: key });
        this.applyFilter(this.data.keyword, key);
    },

    applyFilter(keyword, category) {
        const kw = (keyword || '').toLowerCase();
        const list = PETS.filter(pet => {
            const matchCat = category === 'all' || pet.category === category;
            const matchKw = kw === ''
                || pet.name.toLowerCase().indexOf(kw) > -1
                || pet.personality.toLowerCase().indexOf(kw) > -1
                || pet.categoryText.toLowerCase().indexOf(kw) > -1;
            return matchCat && matchKw;
        });
        this.setData({ list });
    },

    openDetail(event) {
        const id = event.currentTarget.dataset.id;
        const detail = PETS.find(pet => pet.id === id) || null;
        if (!detail) {
            return;
        }
        // 详情头部用「动物类型的 3D 头像」，而不是品种图标
        const avatarIcon = AVATAR_BY_ID[detail.id] || AVATAR_BY_CATEGORY[detail.category] || 'avatar-rabbit';
        this.setData({
            detail: Object.assign({}, detail, { avatarIcon }),
            showDetail: true,
        });
    },

    closeDetail() {
        this.setData({ showDetail: false });
    },
});
