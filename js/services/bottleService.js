/**
 * 漂流瓶服务 - Drift Bottle Service v103.0
 * 支持：扔瓶子 / 捞瓶子 / 瓶子管理 / 海洋生态
 */

const BOTTLE_STORAGE_KEY = 'textcraft_bottles';
const BOTTLE_MY_KEY = 'textcraft_my_bottles';
const BOTTLE_FAVORITES_KEY = 'textcraft_bottle_favorites';
const BOTTLE_TRAVEL_KEY = 'textcraft_bottle_travel';
const MAX_BOTTLES = 200;
const MAX_MY_BOTTLES = 50;
const MAX_TRAVEL_RECORDS = 100;

const BottleService = {
    // 瓶子样式
    bottleStyles: [
        { key: 'glass', name: '玻璃瓶', icon: '🫙', color: '#a8d8ea' },
        { key: 'bamboo', name: '竹筒', icon: '🎋', color: '#8fbc8f' },
        { key: 'shell', name: '贝壳', icon: '🐚', color: '#f0c8c8' },
        { key: 'crystal', name: '水晶瓶', icon: '💎', color: '#c8c8f0' },
    ],

    // 海域类型
    seaTypes: {
        all: { name: '所有海域', color: '#1a6b8a', emoji: '🌊' },
        sunny: { name: '阳光海域', color: '#2a9d8f', emoji: '☀️' },
        midnight: { name: '深夜海域', color: '#1a1a3e', emoji: '🌙' },
        warm: { name: '温暖海域', color: '#e9c46a', emoji: '🌅' },
    },

    // 生成瓶子 ID
    _generateId() {
        return 'bottle_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
    },

    // 获取所有瓶子
    getAllBottles() {
        try {
            const data = localStorage.getItem(BOTTLE_STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.warn('Failed to load bottles:', e);
            return [];
        }
    },

    // 获取我的瓶子
    getMyBottles() {
        try {
            const data = localStorage.getItem(BOTTLE_MY_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.warn('Failed to load my bottles:', e);
            return [];
        }
    },

    // 扔瓶子
    throwBottle(bottleData) {
        const { content, styleName, styleKey, bottleStyle, sentiment } = bottleData;

        if (!content || content.trim().length === 0) {
            return { success: false, error: '内容不能为空' };
        }

        // 根据情感分析确定海域
        let seaType = 'all';
        if (sentiment) {
            if (sentiment.label === '正面') seaType = 'sunny';
            else if (sentiment.label === '负面') seaType = 'midnight';
            else seaType = 'warm';
        }

        const bottle = {
            id: this._generateId(),
            content: content.trim(),
            styleName: styleName || '未知风格',
            styleKey: styleKey || '',
            bottleStyle: bottleStyle || 'glass',
            sentiment: sentiment || { label: '中性', score: 0 },
            seaType,
            throwTime: new Date().toISOString(),
            thrower: this._getThrowerName(),
            likes: 0,
            replies: [],
            isPicked: false,
            pickCount: 0,
        };

        // 保存到公共瓶子池
        const allBottles = this.getAllBottles();
        allBottles.unshift(bottle);
        if (allBottles.length > MAX_BOTTLES) {
            allBottles.length = MAX_BOTTLES;
        }
        localStorage.setItem(BOTTLE_STORAGE_KEY, JSON.stringify(allBottles));

        // 保存到我的瓶子
        const myBottles = this.getMyBottles();
        myBottles.unshift({ ...bottle, isMine: true });
        if (myBottles.length > MAX_MY_BOTTLES) {
            myBottles.length = MAX_MY_BOTTLES;
        }
        localStorage.setItem(BOTTLE_MY_KEY, JSON.stringify(myBottles));

        // 记录旅行轨迹
        this._recordTravel(bottle.id, 'thrown');

        return { success: true, bottle };
    },

    // 捞瓶子（随机）
    pickBottle(excludeMyBottles = true, seaType = 'all') {
        let allBottles = this.getAllBottles();

        if (allBottles.length === 0) {
            return { success: false, error: '海里还没有瓶子，扔一个吧！' };
        }

        // 过滤海域
        if (seaType !== 'all') {
            allBottles = allBottles.filter(b => b.seaType === seaType);
        }

        if (allBottles.length === 0) {
            return { success: false, error: '这片海域还没有瓶子' };
        }

        // 排除自己的瓶子
        if (excludeMyBottles) {
            const myBottleIds = new Set(this.getMyBottles().map(b => b.id));
            allBottles = allBottles.filter(b => !myBottleIds.has(b.id));
        }

        if (allBottles.length === 0) {
            return { success: false, error: '捞到的都是自己的瓶子，再试试？' };
        }

        // 随机捞一个
        const randomIndex = Math.floor(Math.random() * allBottles.length);
        const pickedBottle = allBottles[randomIndex];

        // 更新捞取次数
        pickedBottle.pickCount = (pickedBottle.pickCount || 0) + 1;
        pickedBottle.isPicked = true;

        // 记录旅行轨迹
        this._recordTravel(pickedBottle.id, 'picked');

        // 保存更新
        const idx = allBottles.findIndex(b => b.id === pickedBottle.id);
        if (idx !== -1) {
            allBottles[idx] = pickedBottle;
            localStorage.setItem(BOTTLE_STORAGE_KEY, JSON.stringify(allBottles));
        }

        return { success: true, bottle: pickedBottle };
    },

    // 智能捞瓶（基于情感匹配）
    smartPickBottle(excludeMyBottles = true, seaType = 'all') {
        let allBottles = this.getAllBottles();

        if (allBottles.length === 0) {
            return { success: false, error: '海里还没有瓶子，扔一个吧！' };
        }

        // 过滤海域
        if (seaType !== 'all') {
            allBottles = allBottles.filter(b => b.seaType === seaType);
        }

        if (allBottles.length === 0) {
            return { success: false, error: '这片海域还没有瓶子' };
        }

        // 排除自己的瓶子
        if (excludeMyBottles) {
            const myBottleIds = new Set(this.getMyBottles().map(b => b.id));
            allBottles = allBottles.filter(b => !myBottleIds.has(b.id));
        }

        if (allBottles.length === 0) {
            return { success: false, error: '捞到的都是自己的瓶子，再试试？' };
        }

        // 情感匹配算法：优先捞取与当前用户情感相似的瓶子
        const myBottles = this.getMyBottles();
        const mySentiments = myBottles.map(b => b.sentiment?.score || 0);
        const avgMySentiment = mySentiments.length > 0 ? mySentiments.reduce((a, b) => a + b, 0) / mySentiments.length : 0;

        // 计算每个瓶子的情感相似度
        const scoredBottles = allBottles.map(b => {
            const bottleSentiment = b.sentiment?.score || 0;
            const similarity = 1 - Math.abs(bottleSentiment - avgMySentiment) / 2; // 0-1 范围
            const recencyScore = Math.max(0, 1 - (Date.now() - new Date(b.throwTime).getTime()) / (7 * 24 * 60 * 60 * 1000)); // 7天内新鲜度
            const pickCountPenalty = Math.min(0.5, (b.pickCount || 0) * 0.1); // 被捞多次的瓶子降低权重
            const score = similarity * 0.5 + recencyScore * 0.3 + (1 - pickCountPenalty) * 0.2;
            return { bottle: b, score };
        });

        // 按分数排序，但加入随机性增加惊喜感
        scoredBottles.sort((a, b) => b.score - a.score);
        const topCandidates = scoredBottles.slice(0, Math.min(5, scoredBottles.length));
        const randomIndex = Math.floor(Math.random() * topCandidates.length);
        const pickedBottle = topCandidates[randomIndex].bottle;

        // 更新捞取次数
        pickedBottle.pickCount = (pickedBottle.pickCount || 0) + 1;
        pickedBottle.isPicked = true;

        // 记录旅行轨迹
        this._recordTravel(pickedBottle.id, 'smart_picked');

        // 保存更新
        const idx = allBottles.findIndex(b => b.id === pickedBottle.id);
        if (idx !== -1) {
            allBottles[idx] = pickedBottle;
            localStorage.setItem(BOTTLE_STORAGE_KEY, JSON.stringify(allBottles));
        }

        return { success: true, bottle: pickedBottle, matchScore: topCandidates[randomIndex].score };
    },

    // 点赞瓶子
    likeBottle(bottleId) {
        const allBottles = this.getAllBottles();
        const bottle = allBottles.find(b => b.id === bottleId);
        if (bottle) {
            bottle.likes = (bottle.likes || 0) + 1;
            localStorage.setItem(BOTTLE_STORAGE_KEY, JSON.stringify(allBottles));

            // 同步更新我的瓶子
            const myBottles = this.getMyBottles();
            const myBottle = myBottles.find(b => b.id === bottleId);
            if (myBottle) {
                myBottle.likes = bottle.likes;
                localStorage.setItem(BOTTLE_MY_KEY, JSON.stringify(myBottles));
            }

            return { success: true, likes: bottle.likes };
        }
        return { success: false, error: '瓶子不存在' };
    },

    // 回复瓶子
    replyBottle(bottleId, replyContent) {
        const allBottles = this.getAllBottles();
        const bottle = allBottles.find(b => b.id === bottleId);
        if (bottle) {
            if (!bottle.replies) bottle.replies = [];
            bottle.replies.push({
                id: this._generateId(),
                content: replyContent.trim(),
                replyTime: new Date().toISOString(),
                replier: this._getThrowerName(),
            });
            localStorage.setItem(BOTTLE_STORAGE_KEY, JSON.stringify(allBottles));
            return { success: true, replies: bottle.replies };
        }
        return { success: false, error: '瓶子不存在' };
    },

    // 删除我的瓶子
    deleteMyBottle(bottleId) {
        // 从我的瓶子中删除
        let myBottles = this.getMyBottles();
        myBottles = myBottles.filter(b => b.id !== bottleId);
        localStorage.setItem(BOTTLE_MY_KEY, JSON.stringify(myBottles));

        // 从公共池中标记删除
        const allBottles = this.getAllBottles();
        const idx = allBottles.findIndex(b => b.id === bottleId);
        if (idx !== -1) {
            allBottles.splice(idx, 1);
            localStorage.setItem(BOTTLE_STORAGE_KEY, JSON.stringify(allBottles));
        }

        // 从收藏中删除
        let favorites = this.getFavorites();
        favorites = favorites.filter(b => b.id !== bottleId);
        localStorage.setItem(BOTTLE_FAVORITES_KEY, JSON.stringify(favorites));

        return { success: true };
    },

    // 获取收藏的瓶子
    getFavorites() {
        try {
            const data = localStorage.getItem(BOTTLE_FAVORITES_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    // 收藏瓶子
    favoriteBottle(bottle) {
        const favorites = this.getFavorites();
        const exists = favorites.find(b => b.id === bottle.id);
        if (!exists) {
            favorites.unshift({ ...bottle, favoritedAt: new Date().toISOString() });
            localStorage.setItem(BOTTLE_FAVORITES_KEY, JSON.stringify(favorites));
            return { success: true, isFavorite: true };
        }
        return { success: false, isFavorite: true };
    },

    // 取消收藏
    unfavoriteBottle(bottleId) {
        let favorites = this.getFavorites();
        favorites = favorites.filter(b => b.id !== bottleId);
        localStorage.setItem(BOTTLE_FAVORITES_KEY, JSON.stringify(favorites));
        return { success: true, isFavorite: false };
    },

    // 检查是否已收藏
    isFavorite(bottleId) {
        return this.getFavorites().some(b => b.id === bottleId);
    },

    // 生成瓶子分享文本
    generateShareText(bottle) {
        const style = this.bottleStyles.find(s => s.key === bottle.bottleStyle);
        const sea = this.seaTypes[bottle.seaType];
        return ` 我在 TextCraft 捞到一个漂流瓶！\n\n${style ? style.icon : ''} ${bottle.content}\n\n—— 来自 ${bottle.thrower} · ${sea ? sea.emoji + ' ' + sea.name : '未知海域'}`;
    },

    // 记录瓶子旅行轨迹
    _recordTravel(bottleId, eventType) {
        try {
            const travelRecords = this.getTravelRecords();
            const record = {
                id: this._generateId(),
                bottleId,
                eventType, // 'thrown' | 'picked' | 'smart_picked' | 'liked' | 'replied'
                timestamp: new Date().toISOString(),
                actor: this._getThrowerName(),
            };
            travelRecords.unshift(record);
            if (travelRecords.length > MAX_TRAVEL_RECORDS) {
                travelRecords.length = MAX_TRAVEL_RECORDS;
            }
            localStorage.setItem(BOTTLE_TRAVEL_KEY, JSON.stringify(travelRecords));
        } catch (e) {
            console.warn('Failed to record travel:', e);
        }
    },

    // 获取旅行记录
    getTravelRecords() {
        try {
            const data = localStorage.getItem(BOTTLE_TRAVEL_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    // 获取瓶子的旅行历史
    getBottleTravel(bottleId) {
        return this.getTravelRecords().filter(r => r.bottleId === bottleId);
    },

    // 获取通知
    getNotifications() {
        try {
            const data = localStorage.getItem('textcraft_bottle_notifications');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    // 添加通知
    addNotification(type, message, bottleId = null) {
        try {
            const notifications = this.getNotifications();
            notifications.unshift({
                id: this._generateId(),
                type,
                message,
                bottleId,
                timestamp: new Date().toISOString(),
                read: false,
            });
            // 只保留最近50条通知
            if (notifications.length > 50) {
                notifications.length = 50;
            }
            localStorage.setItem('textcraft_bottle_notifications', JSON.stringify(notifications));
        } catch (e) {
            console.warn('Failed to add notification:', e);
        }
    },

    // 标记通知为已读
    markNotificationRead(notificationId) {
        const notifications = this.getNotifications();
        const notif = notifications.find(n => n.id === notificationId);
        if (notif) {
            notif.read = true;
            localStorage.setItem('textcraft_bottle_notifications', JSON.stringify(notifications));
        }
    },

    // 标记所有通知为已读
    markAllNotificationsRead() {
        const notifications = this.getNotifications();
        notifications.forEach(n => n.read = true);
        localStorage.setItem('textcraft_bottle_notifications', JSON.stringify(notifications));
    },

    // 获取未读通知数量
    getUnreadNotificationCount() {
        return this.getNotifications().filter(n => !n.read).length;
    },

    // 获取瓶子统计
    getStats() {
        const allBottles = this.getAllBottles();
        const myBottles = this.getMyBottles();
        const totalPicks = allBottles.reduce((sum, b) => sum + (b.pickCount || 0), 0);
        const totalLikes = allBottles.reduce((sum, b) => sum + (b.likes || 0), 0);
        const totalReplies = allBottles.reduce((sum, b) => sum + (b.replies ? b.replies.length : 0), 0);

        return {
            totalBottles: allBottles.length,
            myBottles: myBottles.length,
            totalPicks,
            totalLikes,
            totalReplies,
            seaDistribution: this._getSeaDistribution(allBottles),
        };
    },

    // 获取海域分布
    _getSeaDistribution(bottles) {
        const dist = { all: 0, sunny: 0, midnight: 0, warm: 0 };
        bottles.forEach(b => {
            if (dist[b.seaType] !== undefined) dist[b.seaType]++;
        });
        return dist;
    },

    // 获取扔瓶子者名称
    _getThrowerName() {
        const names = ['远方的旅人', '海边的拾贝者', '星空下的诗人', '深夜的独行者', '春风里的信使', '秋叶中的思念', '雨后的彩虹', '冬雪里的温暖', '晨曦中的希望', '黄昏时的温柔'];
        return names[Math.floor(Math.random() * names.length)];
    },

    // 生成模拟瓶子（用于演示）
    generateDemoBottles() {
        const demos = [
            { content: '你好，世界！这是我第一次使用漂流瓶功能。', styleName: '正式商务', styleKey: 'formal', bottleStyle: 'glass', sentiment: { label: '正面', score: 0.5 } },
            { content: '今天天气真好，心情也很愉快。', styleName: '轻松日常', styleKey: 'casual', bottleStyle: 'bamboo', sentiment: { label: '正面', score: 0.8 } },
            { content: '人生若只如初见，何事秋风悲画扇。', styleName: '文艺清新', styleKey: 'literary', bottleStyle: 'shell', sentiment: { label: '中性', score: 0 } },
            { content: '这个功能太棒了！期待更多更新。', styleName: '幽默风趣', styleKey: 'humorous', bottleStyle: 'crystal', sentiment: { label: '正面', score: 0.9 } },
            { content: '夜深了，思绪万千。', styleName: '文艺清新', styleKey: 'literary', bottleStyle: 'glass', sentiment: { label: '负面', score: -0.3 } },
        ];

        demos.forEach(d => {
            this.throwBottle(d);
        });

        return { success: true, count: demos.length };
    },
};

if (typeof window !== 'undefined') {
    window.BottleService = BottleService;
}
