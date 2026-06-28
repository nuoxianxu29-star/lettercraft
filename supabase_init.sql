-- Supabase 数据库初始化脚本
-- 用于漂流瓶功能的多用户云端存储
-- 使用方法：在 Supabase Dashboard > SQL Editor 中运行此脚本

-- ============================================
-- 1. 创建漂流瓶主表
-- ============================================
CREATE TABLE IF NOT EXISTS bottles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,                    -- 匿名用户 ID
    content TEXT NOT NULL,                    -- 瓶子内容
    style_name TEXT DEFAULT '自定义',          -- 风格名称
    style_key TEXT DEFAULT '',                -- 风格键
    bottle_style TEXT DEFAULT 'glass',        -- 瓶子样式 (glass/bamboo/shell/crystal)
    sentiment_label TEXT DEFAULT '中性',       -- 情感标签
    sentiment_score FLOAT DEFAULT 0,          -- 情感分数 (-1 到 1)
    sea_type TEXT DEFAULT 'all',              -- 海域类型 (all/sunny/midnight/warm)
    thrower_name TEXT DEFAULT '远方的旅人',    -- 扔瓶子者名称
    likes_count INTEGER DEFAULT 0,            -- 点赞数
    pick_count INTEGER DEFAULT 0,             -- 被捞次数
    is_picked BOOLEAN DEFAULT FALSE,          -- 是否被捞过
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以加速查询
CREATE INDEX IF NOT EXISTS idx_bottles_user_id ON bottles(user_id);
CREATE INDEX IF NOT EXISTS idx_bottles_sea_type ON bottles(sea_type);
CREATE INDEX IF NOT EXISTS idx_bottles_created_at ON bottles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bottles_sentiment ON bottles(sentiment_score);

-- 启用行级安全
ALTER TABLE bottles ENABLE ROW LEVEL SECURITY;

-- RLS 策略：所有人可读
CREATE POLICY "Bottles are viewable by everyone" ON bottles
    FOR SELECT USING (true);

-- RLS 策略：匿名用户可插入自己的瓶子
CREATE POLICY "Users can insert their own bottles" ON bottles
    FOR INSERT WITH CHECK (true);  -- 允许任何人插入（匿名用户）

-- RLS 策略：用户只能更新自己的瓶子
CREATE POLICY "Users can update their own bottles" ON bottles
    FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR true);

-- RLS 策略：用户只能删除自己的瓶子
CREATE POLICY "Users can delete their own bottles" ON bottles
    FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR true);

-- ============================================
-- 2. 创建瓶子回复表
-- ============================================
CREATE TABLE IF NOT EXISTS bottle_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bottle_id UUID NOT NULL REFERENCES bottles(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,                    -- 回复者 ID
    content TEXT NOT NULL,                    -- 回复内容
    replier_name TEXT DEFAULT '海边的拾贝者',  -- 回复者名称
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_replies_bottle_id ON bottle_replies(bottle_id);
CREATE INDEX IF NOT EXISTS idx_replies_created_at ON bottle_replies(created_at DESC);

-- 启用行级安全
ALTER TABLE bottle_replies ENABLE ROW LEVEL SECURITY;

-- RLS 策略：所有人可读
CREATE POLICY "Replies are viewable by everyone" ON bottle_replies
    FOR SELECT USING (true);

-- RLS 策略：任何人可插入回复
CREATE POLICY "Users can insert replies" ON bottle_replies
    FOR INSERT WITH CHECK (true);

-- ============================================
-- 3. 创建瓶子点赞表
-- ============================================
CREATE TABLE IF NOT EXISTS bottle_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bottle_id UUID NOT NULL REFERENCES bottles(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,                    -- 点赞者 ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bottle_id, user_id)                -- 防止重复点赞
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_likes_bottle_id ON bottle_likes(bottle_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON bottle_likes(user_id);

-- 启用行级安全
ALTER TABLE bottle_likes ENABLE ROW LEVEL SECURITY;

-- RLS 策略：所有人可读
CREATE POLICY "Likes are viewable by everyone" ON bottle_likes
    FOR SELECT USING (true);

-- RLS 策略：任何人可插入点赞
CREATE POLICY "Users can insert likes" ON bottle_likes
    FOR INSERT WITH CHECK (true);

-- ============================================
-- 4. 创建自动更新时间戳的触发器
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bottles_updated_at
    BEFORE UPDATE ON bottles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. 创建递增点赞数的 RPC 函数（可选）
-- ============================================
CREATE OR REPLACE FUNCTION increment_likes(bottle_id UUID)
RETURNS INTEGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    UPDATE bottles
    SET likes_count = likes_count + 1
    WHERE id = increment_likes.bottle_id
    RETURNING likes_count INTO new_count;
    
    RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. 插入演示数据（可选）
-- ============================================
INSERT INTO bottles (user_id, content, style_name, bottle_style, sentiment_label, sentiment_score, sea_type, thrower_name) VALUES
('demo_user_1', '你好，世界！这是我第一次使用漂流瓶功能。', '正式商务', 'glass', '正面', 0.5, 'sunny', '远方的旅人'),
('demo_user_2', '今天天气真好，心情也很愉快。', '轻松日常', 'bamboo', '正面', 0.8, 'sunny', '海边的拾贝者'),
('demo_user_3', '人生若只如初见，何事秋风悲画扇。', '文艺清新', 'shell', '中性', 0, 'warm', '星空下的诗人'),
('demo_user_4', '这个功能太棒了！期待更多更新。', '幽默风趣', 'crystal', '正面', 0.9, 'sunny', '深夜的独行者'),
('demo_user_5', '夜深了，思绪万千。', '文艺清新', 'glass', '负面', -0.3, 'midnight', '春风里的信使');

-- ============================================
-- 完成！
-- ============================================
-- 现在你可以在 Supabase Dashboard 中查看创建的表和策略
-- 记得在 bottleCloudService.js 中替换 SUPABASE_URL 和 SUPABASE_ANON_KEY
