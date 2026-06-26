/**
 * 信件模板库
 */

const LETTER_TEMPLATES = [
    {
        id: 'business-thanks',
        title: '商务感谢信',
        category: 'business',
        preview: '尊敬的[姓名]：\n\n感谢贵方在[项目]中的大力支持...',
        content: `尊敬的 [姓名]：

您好！

感谢贵方在 [项目名称] 中的大力支持与配合。在双方的共同努力下，项目已顺利推进至关键阶段。

在此，本人谨代表团队向贵方表示诚挚的谢意。期待未来能有更多合作机会。

此致
敬礼！

[你的名字]
[日期]`,
    },
    {
        id: 'business-meeting',
        title: '会议邀请',
        category: 'business',
        preview: '尊敬的[姓名]：\n\n诚邀您参加[会议名称]，会议将于...',
        content: `尊敬的 [姓名]：

您好！

诚邀您参加 [会议名称]，会议将于 [日期] [时间] 在 [地点] 举行。

会议主要议题：
1. [议题一]
2. [议题二]
3. [议题三]

敬请拨冗出席。如有任何疑问，请随时联系。

此致
敬礼！

[你的名字]
[日期]`,
    },
    {
        id: 'business-resign',
        title: '辞职信',
        category: 'business',
        preview: '尊敬的领导：\n\n经过慎重考虑，本人决定辞去...',
        content: `尊敬的领导：

您好！

经过慎重考虑，本人决定辞去 [职位名称] 一职，最后工作日为 [日期]。

在任职期间，感谢公司给予的栽培与信任。本人将做好交接工作，确保平稳过渡。

祝愿公司发展蒸蒸日上！

此致
敬礼！

[你的名字]
[日期]`,
    },
    {
        id: 'personal-friend',
        title: '给朋友的信',
        category: 'personal',
        preview: '亲爱的[名字]：\n\n好久不见，最近过得怎么样？...',
        content: `亲爱的 [名字]：

你好呀！最近过得好吗？

好久没联系了，心里一直惦记着你。最近我这边 [分享近况]，想和你聊聊。

有空的话一起出来聚聚吧！

祝好

[你的名字]
[日期]`,
    },
    {
        id: 'personal-family',
        title: '给家人的信',
        category: 'personal',
        preview: '亲爱的[称呼]：\n\n见字如面，最近身体好吗？...',
        content: `亲爱的 [称呼]：

见字如面。

最近身体好吗？工作/生活还顺利吗？我在这边一切都好，不用担心。

[分享近况和感受]

天气渐凉，注意添衣保暖。照顾好自己。

想念你们。

[你的名字]
[日期]`,
    },
    {
        id: 'personal-love',
        title: '情书',
        category: 'personal',
        preview: '亲爱的[名字]：\n\n有些话一直想对你说...',
        content: `亲爱的 [名字]：

有些话一直想对你说。

认识你之后，我的世界变得不一样了。你的笑容、你的声音，都深深地印在我的心里。

[表达感情]

愿我们的故事，永远写下去。

永远爱你的
[你的名字]
[日期]`,
    },
    {
        id: 'academic-request',
        title: '学术请求信',
        category: 'academic',
        preview: '尊敬的[教授姓名]教授：\n\n您好！我是[学校]的...',
        content: `尊敬的 [教授姓名] 教授：

您好！

我是 [学校] [专业] 的 [你的姓名]。久仰您在 [研究领域] 的卓越贡献，特此致信。

[说明请求内容，如申请指导、合作研究等]

如蒙应允，不胜感激。期待您的回复。

顺颂
研安！

[你的姓名]
[日期]`,
    },
    {
        id: 'academic-recommendation',
        title: '推荐信请求',
        category: 'academic',
        preview: '尊敬的[教授姓名]教授：\n\n您好！我计划申请...',
        content: `尊敬的 [教授姓名] 教授：

您好！

我计划申请 [学校/项目] 的 [学位/职位]，恳请您为我撰写一封推荐信。

在您的 [课程名称] 课程中，我 [描述表现和收获]。相信您的推荐将对我的申请起到重要作用。

申请材料截止日期为 [日期]。如您需要更多信息，请随时告知。

深表谢忱！

[你的姓名]
[日期]`,
    },
    {
        id: 'social-birthday',
        title: '生日祝福',
        category: 'social',
        preview: '亲爱的[名字]：\n\n生日快乐！愿你...',
        content: `亲爱的 [名字]：

生日快乐！🎂

又长大了一岁，愿你在新的一岁里：
- 身体健康，万事顺意
- 工作顺利，事业有成
- 开心快乐，每天都有好心情

[个性化祝福]

生日快乐！

[你的名字]
[日期]`,
    },
    {
        id: 'social-wedding',
        title: '婚礼贺信',
        category: 'social',
        preview: '亲爱的[新人名字]：\n\n恭喜你们喜结良缘！...',
        content: `亲爱的 [新人名字]：

恭喜你们喜结良缘！🎊

看到你们幸福的样子，真心为你们感到高兴。愿你们的爱情如美酒般，越陈越香。

[个性化祝福]

祝百年好合，永结同心！

[你的名字]
[日期]`,
    },
    {
        id: 'social-condolence',
        title: '慰问信',
        category: 'social',
        preview: '亲爱的[名字]：\n\n得知[情况]，我深感...',
        content: `亲爱的 [名字]：

得知 [情况]，我深感难过。

在这个艰难的时刻，请知道你不是一个人。我和所有关心你的人都在你身边。

[表达关心和支持]

如果需要任何帮助，请随时告诉我。

保重。

[你的名字]
[日期]`,
    },
    {
        id: 'social-newyear',
        title: '新年祝福',
        category: 'social',
        preview: '亲爱的[名字]：\n\n新年快乐！回顾过去的一年...',
        content: `亲爱的 [名字]：

新年快乐！

回顾过去的一年，感谢有你相伴。[回顾共同经历]

新的一年，愿你：
- 事业更上一层楼
- 身体健康，平安喜乐
- 所有愿望都能实现

期待新的一年我们有更多美好的回忆！

新年快乐！

[你的名字]
[日期]`,
    },
];

function getTemplates(category = 'all') {
    if (category === 'all') return LETTER_TEMPLATES;
    return LETTER_TEMPLATES.filter(t => t.category === category);
}

function getTemplateById(id) {
    return LETTER_TEMPLATES.find(t => t.id === id);
}

function getCategories() {
    const cats = [...new Set(LETTER_TEMPLATES.map(t => t.category))];
    return cats;
}
