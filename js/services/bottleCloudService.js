/**
 * 漂流瓶云端服务 - Drift Bottle Cloud Service v104.0
 * 基于 Supabase 实现多用户漂流瓶数据同步
 * 
 * 数据库表结构：
 * - bottles: 漂流瓶主表
 * - bottle_replies: 瓶子回复表
 * - bottle_likes: 瓶子点赞表（记录谁点了赞）
 * 
 * RLS 策略（Row Level Security）：
 * - bottles: 所有人可读，匿名用户可插入自己的瓶子，只能更新自己的瓶子
 * - bottle_replies: 所有人可读，匿名用户可插入
 * - bottle_likes: 匿名用户可插入自己的点赞记录
 */

// Supabase 配置
const SUPABASE_CONFIG = {
    url: 'https://bkjrewansdmvvsoilxqv.supabase.co',
    anonKey: 'sb_publishable__z83XGHCv39DO5MAA0VX6Q_YUen6Tmz'
};

// 数据库表名
const TABLE_BOTTLES = 'bottles';
const TABLE_REPLIES = 'bottle_replies';
const TABLE_LIKES = 'bottle_likes';

const BottleCloudService = {
    supabase: null,
    userId: null,
    isOnline: navigator.onLine,
    realtimeSubscriptions: [],
    cache: {
        bottles: [],
        lastSync: 0,
    },

    // 初始化 Supabase 客户端
    init() {
        // 检查 Supabase 是否可用
        if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
            console.warn('Supabase SDK not loaded, falling back to localStorage only');
            return false;
        }

        // 检查配置是否有效
        if (SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL' || SUPABASE_CONFIG.anonKey === 'YOUR_SUPABASE_ANON_KEY') {
            console.warn('Supabase not configured, falling back to localStorage only');
            console.info('To enable cloud sync: 1) Create a Supabase project at https://supabase.com');
            console.info('2) Replace SUPABASE_CONFIG in bottleCloudService.js with your project credentials');
            return false;
        }

        try {
            this.supabase = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            this.userId = this._getOrCreateUserId();
            this._setupOnlineListener();
            console.log('BottleCloudService initialized, userId:', this.userId);
            return true;
        } catch (e) {
            console.error('Failed to initialize BottleCloudService:', e);
            return false;
        }
    },

    // 获取或创建匿名用户 ID
    _getOrCreateUserId() {
        let userId = localStorage.getItem('textcraft_user_id');
        if (!userId) {
            userId = 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
            localStorage.setItem('textcraft_user_id', userId);
        }
        return userId;
    },

    // 监听网络状态
    _setupOnlineListener() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('BottleCloudService: back online, syncing...');
            this.syncToCloud();
        });
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('BottleCloudService: offline');
        });
    },

    // 获取所有云端瓶子（带缓存）
    async fetchAllBottles(options = {}) {
        if (!this.supabase || !this.isOnline) {
            return { success: false, error: 'Cloud service not available' };
        }

        const { seaType = 'all', limit = 200, excludeUserId = false } = options;

        try {
            let query = this.supabase
                .from(TABLE_BOTTLES)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            // 过滤海域
            if (seaType !== 'all') {
                query = query.eq('sea_type', seaType);
            }

            // 排除自己的瓶子
            if (excludeUserId) {
                query = query.neq('user_id', this.userId);
            }

            const { data, error } = await query;

            if (error) throw error;

            // 更新缓存
            this.cache.bottles = data || [];
            this.cache.lastSync = Date.now();

            return { success: true, bottles: data || [] };
        } catch (e) {
            console.error('Failed to fetch bottles from cloud:', e);
            return { success: false, error: e.message };
        }
    },

    // 上传瓶子到云端
    async uploadBottle(bottleData) {
        if (!this.supabase || !this.isOnline) {
            return { success: false, error: 'Cloud service not available' };
        }

        try {
            const { content, styleName, styleKey, bottleStyle, sentiment, seaType } = bottleData;

            const bottle = {
                user_id: this.userId,
                content: content.trim(),
                style_name: styleName || '自定义',
                style_key: styleKey || '',
                bottle_style: bottleStyle || 'glass',
                sentiment_label: sentiment?.label || '中性',
                sentiment_score: sentiment?.score || 0,
                sea_type: seaType || 'all',
                thrower_name: this._getThrowerName(),
                likes_count: 0,
                pick_count: 0,
                is_picked: false,
            };

            const { data, error } = await this.supabase
                .from(TABLE_BOTTLES)
                .insert(bottle)
                .select()
                .single();

            if (error) throw error;

            return { success: true, bottle: data, cloudId: data.id };
        } catch (e) {
            console.error('Failed to upload bottle to cloud:', e);
            return { success: false, error: e.message };
        }
    },

    // 更新瓶子数据（捞取次数等）
    async updateBottle(bottleId, updates) {
        if (!this.supabase || !this.isOnline) {
            return { success: false, error: 'Cloud service not available' };
        }

        try {
            const { data, error } = await this.supabase
                .from(TABLE_BOTTLES)
                .update(updates)
                .eq('id', bottleId)
                .select()
                .single();

            if (error) throw error;

            return { success: true, bottle: data };
        } catch (e) {
            console.error('Failed to update bottle in cloud:', e);
            return { success: false, error: e.message };
        }
    },

    // 删除云端瓶子
    async deleteBottle(bottleId) {
        if (!this.supabase || !this.isOnline) {
            return { success: false, error: 'Cloud service not available' };
        }

        try {
            const { error } = await this.supabase
                .from(TABLE_BOTTLES)
                .delete()
                .eq('id', bottleId)
                .eq('user_id', this.userId); // 只能删除自己的瓶子

            if (error) throw error;

            return { success: true };
        } catch (e) {
            console.error('Failed to delete bottle from cloud:', e);
            return { success: false, error: e.message };
        }
    },

    // 点赞瓶子
    async likeBottle(bottleId) {
        if (!this.supabase || !this.isOnline) {
            return { success: false, error: 'Cloud service not available' };
        }

        const cloudId = this._toCloudId(bottleId);

        try {
            // 检查是否已点赞
            const { data: existingLike } = await this.supabase
                .from(TABLE_LIKES)
                .select('id')
                .eq('bottle_id', cloudId)
                .eq('user_id', this.userId)
                .single();

            if (existingLike) {
                return { success: false, error: 'Already liked' };
            }

            // 插入点赞记录
            const { error: likeError } = await this.supabase
                .from(TABLE_LIKES)
                .insert({ bottle_id: cloudId, user_id: this.userId });

            if (likeError) throw likeError;

            // 更新瓶子点赞数（简单更新）
            const { data: currentBottle } = await this.supabase
                .from(TABLE_BOTTLES)
                .select('likes_count')
                .eq('id', cloudId)
                .single();

            await this.supabase
                .from(TABLE_BOTTLES)
                .update({ likes_count: (currentBottle?.likes_count || 0) + 1 })
                .eq('id', cloudId);

            return { success: true };
        } catch (e) {
            console.error('Failed to like bottle in cloud:', e);
            return { success: false, error: e.message };
        }
    },

    // 回复瓶子
    async replyBottle(bottleId, replyContent) {
        if (!this.supabase || !this.isOnline) {
            return { success: false, error: 'Cloud service not available' };
        }

        const cloudId = this._toCloudId(bottleId);

        try {
            const reply = {
                bottle_id: cloudId,
                user_id: this.userId,
                content: replyContent.trim(),
                replier_name: this._getThrowerName(),
            };

            const { data, error } = await this.supabase
                .from(TABLE_REPLIES)
                .insert(reply)
                .select()
                .single();

            if (error) throw error;

            return { success: true, reply: data };
        } catch (e) {
            console.error('Failed to reply bottle in cloud:', e);
            return { success: false, error: e.message };
        }
    },

    // 将本地瓶子 ID 转换为云端 UUID
    _toCloudId(localId) {
        return localId.replace('bottle_', '');
    },

    // 将云端 UUID 转换为本地瓶子 ID
    _toLocalId(cloudId) {
        return cloudId.startsWith('bottle_') ? cloudId : 'bottle_' + cloudId;
    },

    // 获取瓶子的回复
    async getBottleReplies(bottleId) {
        if (!this.supabase || !this.isOnline) {
            return { success: false, error: 'Cloud service not available' };
        }

        const cloudId = this._toCloudId(bottleId);

        try {
            const { data, error } = await this.supabase
                .from(TABLE_REPLIES)
                .select('*')
                .eq('bottle_id', cloudId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            return { success: true, replies: data || [] };
        } catch (e) {
            console.error('Failed to fetch replies from cloud:', e);
            return { success: false, error: e.message };
        }
    },

    // 获取我的瓶子
    async getMyBottles() {
        if (!this.supabase || !this.isOnline) {
            return { success: false, error: 'Cloud service not available' };
        }

        try {
            const { data, error } = await this.supabase
                .from(TABLE_BOTTLES)
                .select('*')
                .eq('user_id', this.userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return { success: true, bottles: data || [] };
        } catch (e) {
            console.error('Failed to fetch my bottles from cloud:', e);
            return { success: false, error: e.message };
        }
    },

    // 实时订阅新瓶子
    subscribeToNewBottles(callback) {
        if (!this.supabase) return null;

        const subscription = this.supabase
            .channel('bottles_changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: TABLE_BOTTLES },
                (payload) => {
                    console.log('New bottle arrived:', payload.new);
                    if (callback) callback(payload.new);
                }
            )
            .subscribe();

        this.realtimeSubscriptions.push(subscription);
        return subscription;
    },

    // 实时订阅瓶子回复
    subscribeToReplies(bottleId, callback) {
        if (!this.supabase) return null;

        const subscription = this.supabase
            .channel(`replies_${bottleId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: TABLE_REPLIES, filter: `bottle_id=eq.${bottleId}` },
                (payload) => {
                    console.log('New reply:', payload.new);
                    if (callback) callback(payload.new);
                }
            )
            .subscribe();

        this.realtimeSubscriptions.push(subscription);
        return subscription;
    },

    // 取消所有订阅
    unsubscribeAll() {
        this.realtimeSubscriptions.forEach(sub => sub.unsubscribe());
        this.realtimeSubscriptions = [];
    },

    // 同步本地数据到云端（离线恢复后调用）
    async syncToCloud() {
        if (!this.supabase || !this.isOnline) return;

        console.log('Syncing local bottles to cloud...');
        // 这里可以实现更复杂的同步逻辑
        // 例如：比较本地和云端数据，上传本地新增的瓶子等
    },

    // 获取瓶子统计
    async getStats() {
        if (!this.supabase || !this.isOnline) {
            return { success: false, error: 'Cloud service not available' };
        }

        try {
            const { count: totalBottles, error: countError } = await this.supabase
                .from(TABLE_BOTTLES)
                .select('*', { count: 'exact', head: true });

            if (countError) throw countError;

            return { success: true, totalBottles: totalBottles || 0 };
        } catch (e) {
            console.error('Failed to fetch stats from cloud:', e);
            return { success: false, error: e.message };
        }
    },

    // 获取随机瓶子（用于捞瓶子）
    async getRandomBottle(options = {}) {
        if (!this.supabase || !this.isOnline) {
            return { success: false, error: 'Cloud service not available' };
        }

        const { seaType = 'all', excludeMyBottles = true } = options;

        try {
            let query = this.supabase
                .from(TABLE_BOTTLES)
                .select('*');

            if (seaType !== 'all') {
                query = query.eq('sea_type', seaType);
            }

            if (excludeMyBottles) {
                query = query.neq('user_id', this.userId);
            }

            const { data, error } = await query;

            if (error) throw error;
            if (!data || data.length === 0) {
                return { success: false, error: '海里还没有瓶子' };
            }

            // 随机选择一个
            const randomIndex = Math.floor(Math.random() * data.length);
            return { success: true, bottle: data[randomIndex] };
        } catch (e) {
            console.error('Failed to get random bottle from cloud:', e);
            return { success: false, error: e.message };
        }
    },

    // 智能捞瓶（云端版）
    async smartPickBottle(options = {}) {
        if (!this.supabase || !this.isOnline) {
            return { success: false, error: 'Cloud service not available' };
        }

        const { seaType = 'all' } = options;

        try {
            // 获取我的瓶子用于情感匹配
            const myBottlesResult = await this.getMyBottles();
            const myBottles = myBottlesResult.success ? myBottlesResult.bottles : [];
            const mySentiments = myBottles.map(b => b.sentiment_score || 0);
            const avgMySentiment = mySentiments.length > 0
                ? mySentiments.reduce((a, b) => a + b, 0) / mySentiments.length
                : 0;

            // 获取候选瓶子
            let query = this.supabase
                .from(TABLE_BOTTLES)
                .select('*')
                .neq('user_id', this.userId)
                .limit(100);

            if (seaType !== 'all') {
                query = query.eq('sea_type', seaType);
            }

            const { data, error } = await query;
            if (error) throw error;
            if (!data || data.length === 0) {
                return { success: false, error: '海里还没有瓶子' };
            }

            // 计算匹配分数
            const scoredBottles = data.map(b => {
                const bottleSentiment = b.sentiment_score || 0;
                const similarity = 1 - Math.abs(bottleSentiment - avgMySentiment) / 2;
                const recencyScore = Math.max(0, 1 - (Date.now() - new Date(b.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000));
                const pickCountPenalty = Math.min(0.5, (b.pick_count || 0) * 0.1);
                const score = similarity * 0.5 + recencyScore * 0.3 + (1 - pickCountPenalty) * 0.2;
                return { bottle: b, score };
            });

            scoredBottles.sort((a, b) => b.score - a.score);
            const topCandidates = scoredBottles.slice(0, Math.min(5, scoredBottles.length));
            const randomIndex = Math.floor(Math.random() * topCandidates.length);

            return {
                success: true,
                bottle: topCandidates[randomIndex].bottle,
                matchScore: topCandidates[randomIndex].score,
            };
        } catch (e) {
            console.error('Failed to smart pick bottle from cloud:', e);
            return { success: false, error: e.message };
        }
    },

    // 获取扔瓶子者名称（随机生成）
    _getThrowerName() {
        const names = ['远方的旅人', '海边的拾贝者', '星空下的诗人', '深夜的独行者', '春风里的信使', '秋叶中的思念', '雨后的彩虹', '冬雪里的温暖', '晨曦中的希望', '黄昏时的温柔'];
        return names[Math.floor(Math.random() * names.length)];
    },

    // 将云端瓶子格式化为 localStorage 兼容格式
    _formatBottleForLocal(cloudBottle) {
        return {
            id: this._toLocalId(cloudBottle.id),
            content: cloudBottle.content,
            styleName: cloudBottle.style_name,
            styleKey: cloudBottle.style_key,
            bottleStyle: cloudBottle.bottle_style,
            sentiment: {
                label: cloudBottle.sentiment_label,
                score: cloudBottle.sentiment_score,
            },
            seaType: cloudBottle.sea_type,
            throwTime: cloudBottle.created_at,
            thrower: cloudBottle.thrower_name,
            likes: cloudBottle.likes_count || 0,
            replies: [],
            isPicked: cloudBottle.is_picked || false,
            pickCount: cloudBottle.pick_count || 0,
            isMine: cloudBottle.user_id === this.userId,
        };
    },
};

// 导出到全局
if (typeof window !== 'undefined') {
    window.BottleCloudService = BottleCloudService;
}
