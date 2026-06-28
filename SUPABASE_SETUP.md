# Supabase 配置指南 - 漂流瓶云端数据库

## 1. 创建 Supabase 项目

1. 访问 https://supabase.com
2. 点击 **Start your project** 或 **Sign In**
3. 使用 GitHub 账号登录
4. 点击 **New Project**
5. 填写项目信息：
   - **Name**: `textcraft-bottles`（或其他你喜欢的名字）
   - **Database Password**: 设置一个密码（请妥善保存）
   - **Region**: 选择 `Southeast Asia (Singapore)`（国内访问较快）
6. 点击 **Create new project**，等待项目创建完成（约 1-2 分钟）

## 2. 获取 API 密钥

1. 进入项目后，点击左侧菜单 **Project Settings**（齿轮图标）
2. 点击 **API**
3. 复制以下信息：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 3. 运行数据库初始化脚本

1. 点击左侧菜单 **SQL Editor**
2. 点击 **New query**
3. 打开项目中的 `supabase_init.sql` 文件
4. 复制全部内容并粘贴到 SQL Editor
5. 点击 **Run** 执行
6. 确认所有表创建成功（应显示 `Success. No rows returned`）

## 4. 配置前端连接

打开 `js/services/bottleCloudService.js` 文件，修改第 17-18 行：

```javascript
const SUPABASE_CONFIG = {
    url: 'https://你的项目ID.supabase.co',      // 替换为你的 Project URL
    anonKey: '你的anon密钥'                      // 替换为你的 anon/public key
};
```

## 5. 验证配置

1. 保存文件后，在本地运行项目：
   ```bash
   python -m http.server 8080
   ```
2. 打开浏览器访问 http://localhost:8080
3. 点击右下角 🌊 按钮打开漂流瓶
4. 打开浏览器开发者工具（F12），查看 Console
5. 如果显示 `BottleCloudService initialized, userId: user_xxx`，说明配置成功
6. 如果显示 `Supabase not configured, falling back to localStorage only`，请检查配置是否正确

## 6. 部署到 GitHub Pages

配置完成后，提交并推送代码：

```bash
git add .
git commit -m "配置 Supabase 云端数据库"
git push
```

GitHub Pages 会自动部署，访问你的 GitHub Pages 网址即可使用云端漂流瓶功能。

## 7. 云端功能验证

- ✅ 扔瓶子 - 瓶子会上传到云端，其他用户可以看到
- ✅ 捞瓶子 - 可以从云端捞到其他用户的瓶子
- ✅ 智能捞瓶 - 基于情感匹配的云端推荐
- ✅ 实时订阅 - 新瓶子会自动推送（无需刷新）
- ✅ 点赞/回复 - 数据同步到云端
- ✅ 离线降级 - 网络断开时自动使用 localStorage

## 注意事项

- Supabase 免费版每月有 500MB 数据库空间和 2GB 文件存储
- 免费版项目如果 7 天不活跃会暂停，访问任意 API 即可恢复
- 所有数据都是公开的（RLS 策略允许匿名读写），适合漂流瓶场景
- 如需隐私保护，可以在 SQL 中修改 RLS 策略
