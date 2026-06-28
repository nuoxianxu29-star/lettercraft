/**
 * 智能文本生成与转换系统 v9.0 - AI-Powered Text Processing System
 * 架构：Vue 3 + 模块化前端架构
 * 模块：Store / Services / Router / UI / Components
 * 
 * 功能：
 * - 多模板智能文本生成（多平台模式）
 * - 基于规则的语义转换引擎（可扩展 AI）
 * - AI 任务切换（润色/摘要/扩写/翻译等）
 * - 用户级历史记录系统（localStorage 模拟）
 * - 分享链接生成与解析
 * - 导出 PDF / 图片 / HTML / JSON
 */

// ==================== 信件查看模式（路由优先处理，含信封动画） ====================
// 全局信封配置（供 Vue EnvelopeComponent 和 initLetterView 共用）
window.getEnvelopeConfig = function getEnvelopeConfig(styleKey) {
    const configs = {
        formal: { envelopeColor: '#d4c8b8', sealType: 'stamp', sealColor: '#8b5e3c', decoration: '' },
        casual: { envelopeColor: '#f5e0d0', sealType: 'heart', sealColor: '#d4856a', decoration: 'flower-watermark' },
        literary: { envelopeColor: '#e8dcc8', sealType: 'wax', sealColor: '#7b68a8', decoration: 'flower-watermark' },
        concise: { envelopeColor: '#d0dce0', sealType: 'stamp', sealColor: '#4a7c8f', decoration: '' },
        warm: { envelopeColor: '#f0d8c8', sealType: 'heart', sealColor: '#c47a5a', decoration: 'flower-watermark' },
        classical: { envelopeColor: '#f0e4c0', sealType: 'chinese-wax', sealColor: '#8b6914', decoration: 'dragon-cloud' },
        humorous: { envelopeColor: '#f0e0c8', sealType: 'sticker', sealColor: '#e8734a', decoration: '' },
        academic: { envelopeColor: '#d0d8e0', sealType: 'stamp', sealColor: '#3a506b', decoration: '' },
        cute: { envelopeColor: '#ffe0ec', sealType: 'heart', sealColor: '#ff69b4', decoration: '' },
        cyberpunk: { envelopeColor: '#1a1a2e', sealType: 'wax', sealColor: '#00ff88', decoration: '' },
        classicalTrans: { envelopeColor: '#f0e4c0', sealType: 'chinese-wax', sealColor: '#8b6914', decoration: 'dragon-cloud' },
    };
    return configs[styleKey] || { envelopeColor: '#f5f5f5', sealType: 'wax', sealColor: '#c41e3a', decoration: '' };
};

// 实际解析和执行分享视图
(function initLetterView() {
    const params = new URLSearchParams(window.location.search);
    const letterData = params.get('letter');
    if (!letterData) return;

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    try {
        const base64 = letterData.replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(escape(atob(base64)));
        const letter = JSON.parse(json);

        if (letter && letter.content && letter.styleName) {
            window._letterViewMode = true;

            document.addEventListener('DOMContentLoaded', () => {
                const styleKey = letter.styleKey || '';
                const cfg = window.getEnvelopeConfig(styleKey);

                document.getElementById('app').innerHTML = `
                    <div class="letter-view-page">
                        <div class="letter-view-envelope-wrapper" id="letter-wrapper">
                            <div class="envelope" id="share-envelope" data-style="${styleKey}"
                                 style="--envelope-color: ${cfg.envelopeColor}; --seal-color: ${cfg.sealColor}; cursor: pointer;"
                                 title="点击打开">
                                <div class="envelope-front">
                                    <div class="envelope-flap"></div>
                                    <div class="envelope-seal ${cfg.sealType}"></div>
                                </div>
                                <div class="envelope-back"></div>
                            </div>
                        </div>
                    </div>
                `;

                const envelopeEl = document.getElementById('share-envelope');
                const wrapper = document.getElementById('letter-wrapper');
                if (!envelopeEl || !wrapper) return;

                // 信封飞入动画
                envelopeEl.classList.add('phase-1');
                setTimeout(() => {
                    envelopeEl.classList.remove('phase-1');
                    envelopeEl.classList.add('phase-2');
                }, 700);

                // 点击信封 → 信封消失，展示信纸
                envelopeEl.addEventListener('click', () => {
                    wrapper.innerHTML = `
                        <div class="letter-view-container">
                            <div class="letter-view-card ${styleKey}">
                                <div class="letter-view-header">
                                    <div class="letter-view-logo">
                                        <span class="logo-icon">✉</span>
                                        <span>TextCraft</span>
                                    </div>
                                    <span class="letter-view-style-badge">${escapeHtml(letter.styleName)}</span>
                                </div>
                                <div class="letter-view-content">
                                    ${escapeHtml(letter.content).replace(/\n/g, '<br>')}
                                </div>
                                <div class="letter-view-footer">
                                    <div class="letter-view-time">${letter.time || ''}</div>
                                    <a href="${window.location.pathname}" class="letter-view-cta">我也要生成</a>
                                </div>
                            </div>
                            <div class="letter-view-watermark">由 TextCraft 智能文本处理系统生成</div>
                        </div>
                    `;
                });
            });
        } else {
            throw new Error('Invalid letter data');
        }
    } catch (e) {
        window._letterViewMode = true;
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('app').innerHTML = `
                <div class="letter-view-page">
                    <div class="letter-view-container">
                        <div class="letter-view-card" style="text-align: center; padding: 60px 40px;">
                            <p style="font-size: 18px; color: #9a9a9a; margin-bottom: 8px;">链接无效或已过期</p>
                            <p style="font-size: 14px;"><a href="${window.location.pathname}" style="color: #8b5e3c; text-decoration: none;">去生成文本</a></p>
                        </div>
                    </div>
                </div>
            `;
        });
    }
})();

// ==================== Vue 组件定义 ====================

// Toast 组件
const ToastComponent = {
    props: { show: Boolean, message: String, type: { type: String, default: 'info' } },
    template: `
        <div class="toast" :class="{ show: show, 'toast-success': type === 'success', 'toast-error': type === 'error', 'toast-warning': type === 'warning' }" role="status" aria-live="polite">
            {{ message }}
        </div>
    `
};

// 信封动画组件
const EnvelopeComponent = {
    props: {
        show: Boolean,
        styleKey: String,
        styleName: String,
        content: String,
        animationPhase: { type: Number, default: 0 },
    },
    emits: ['close', 'complete'],
    computed: {
        envelopeConfig() {
            if (typeof getEnvelopeConfig !== 'undefined') {
                return getEnvelopeConfig(this.styleKey);
            }
            return { sealType: 'wax', sealColor: '#c41e3a' };
        },
        sealClass() {
            return this.envelopeConfig.sealType || 'wax';
        },
        sealColor() {
            return this.envelopeConfig.sealColor || '#c41e3a';
        },
        decorationClass() {
            return this.envelopeConfig.decoration || '';
        },
    },
    methods: {
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
    },
    template: `
        <div class="envelope-overlay" v-if="show" @click.self="$emit('close')">
            <!-- 关闭按钮 -->
            <button class="envelope-close-btn" @click="$emit('close')" title="关闭 (Esc)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <div class="envelope" :class="[styleKey, { 'phase-1': animationPhase >= 1, 'phase-2': animationPhase >= 2, 'phase-3': animationPhase >= 3, 'phase-4': animationPhase >= 4, 'final': animationPhase >= 5 }]" :style="{ '--envelope-color': envelopeConfig.envelopeColor, '--seal-color': sealColor }">
                <!-- 信封正面 -->
                <div class="envelope-front">
                    <div class="envelope-flap" :class="{ 'open': animationPhase >= 3 }"></div>
                    <div class="envelope-seal" :class="sealClass"></div>
                    <div class="envelope-decoration" :class="decorationClass"></div>
                </div>
                <!-- 信封背面 -->
                <div class="envelope-back">
                    <!-- 信纸 -->
                    <div class="envelope-letter" :class="{ 'slide-out': animationPhase >= 4 }">
                        <div class="envelope-letter-header">
                            <div class="envelope-letter-logo">
                                <span></span>
                                <span>TextCraft</span>
                            </div>
                            <span class="envelope-letter-badge">{{ styleName }}</span>
                        </div>
                        <div class="envelope-letter-content">{{ escapeHtml(content) }}</div>
                        <div class="envelope-letter-footer">由 TextCraft 智能文本处理系统生成</div>
                    </div>
                </div>
            </div>
        </div>
    `
};

// 左侧栏组件
const SidebarComponent = {
    props: {
        activeNav: String,
        collapsed: Boolean,
        userName: String,
        isLoggedIn: Boolean,
        historyCount: Number,
        isDarkTheme: Boolean,
    },
    emits: ['nav-change', 'toggle-collapse', 'login', 'logout', 'user', 'toggle-dark-theme'],
    data() {
        return {
            navItems: [
                { key: 'editor', name: '编辑器', icon: 'edit' },
                { key: 'documents', name: '文档管理', icon: 'documents' },
                { key: 'history', name: '历史记录', icon: 'history' },
                { key: 'templates', name: '模板库', icon: 'template' },
                { key: 'settings', name: '设置', icon: 'settings' },
            ]
        };
    },
    methods: {
        getIcon(name) {
            return '';
        }
    },
    template: `
        <aside class="sidebar" :class="{ collapsed: collapsed }">
            <div class="sidebar-header">
                <div class="sidebar-logo">
                    <span class="logo-icon">⚡</span>
                    <span v-show="!collapsed" class="logo-text">TextCraft</span>
                </div>
                <button class="btn-icon sidebar-collapse-btn" @click="$emit('toggle-collapse')" :title="collapsed ? '展开' : '收起'">
                    <svg v-if="collapsed" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13,17 18,12 13,7"/><polyline points="6,17 11,12 6,7"/></svg>
                    <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11,17 6,12 11,7"/><polyline points="18,17 13,12 18,7"/></svg>
                </button>
            </div>
            <nav class="sidebar-nav">
                <button 
                    v-for="item in navItems" 
                    :key="item.key"
                    class="sidebar-nav-item" 
                    :class="{ active: activeNav === item.key }"
                    @click="$emit('nav-change', item.key)"
                >
                    <span class="sidebar-nav-icon">
                        <svg v-if="item.key === 'editor'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        <svg v-else-if="item.key === 'documents'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        <svg v-else-if="item.key === 'history'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                        <svg v-else-if="item.key === 'templates'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                        <svg v-else-if="item.key === 'settings'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                    </span>
                    <span v-show="!collapsed" class="sidebar-nav-label">{{ item.name }}</span>
                    <span v-if="item.key === 'history' && historyCount > 0" v-show="!collapsed" class="sidebar-nav-badge">{{ historyCount }}</span>
                </button>
            </nav>
            <div class="sidebar-footer">
                <button class="sidebar-theme-btn" @click="$emit('toggle-dark-theme')" :title="isDarkTheme ? '切换到亮色主题' : '切换到暗色主题'">
                    <span class="theme-icon">{{ isDarkTheme ? '☀️' : '🌙' }}</span>
                    <span v-show="!collapsed">{{ isDarkTheme ? '亮色' : '暗色' }}</span>
                </button>
                <button v-if="!isLoggedIn" class="sidebar-login-btn" @click="$emit('login')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    <span v-show="!collapsed">登录</span>
                </button>
                <button v-else class="sidebar-user-btn" @click="$emit('user')">
                    <span class="sidebar-user-avatar">{{ userName ? userName[0] : 'U' }}</span>
                    <span v-show="!collapsed">{{ userName }}</span>
                </button>
            </div>
        </aside>
    `
};

// 文档管理弹窗组件
const DocManagerComponent = {
    props: { show: Boolean, documents: Array, currentDocId: String },
    emits: ['close', 'create', 'switch', 'delete', 'rename'],
    methods: {
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
        formatDate(iso) {
            if (!iso) return '';
            const d = new Date(iso);
            return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
    },
    template: `
        <div class="modal-overlay" :class="{ show: show }" role="dialog" aria-modal="true" @click.self="$emit('close')">
            <div class="modal doc-manager-modal">
                <div class="modal-header">
                    <h3>📄 文档管理</h3>
                    <div class="modal-header-actions">
                        <button class="btn-primary btn-new-doc" @click="$emit('create')">+ 新建文档</button>
                        <button class="btn-icon modal-close" aria-label="关闭" @click="$emit('close')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="doc-list">
                        <template v-if="documents.length === 0">
                            <div class="doc-empty">
                                <p>暂无文档</p>
                                <button class="btn-primary" @click="$emit('create')">创建第一个文档</button>
                            </div>
                        </template>
                        <template v-else>
                            <div v-for="doc in documents" :key="doc.id" class="doc-item" :class="{ active: doc.id === currentDocId }">
                                <div class="doc-item-info" @click="$emit('switch', doc.id)">
                                    <div class="doc-item-name">
                                        <span class="doc-item-icon">📝</span>
                                        <span>{{ escapeHtml(doc.name) }}</span>
                                    </div>
                                    <div class="doc-item-meta">{{ formatDate(doc.updatedAt) }} · {{ (doc.content || '').length }} 字</div>
                                </div>
                                <div class="doc-item-actions">
                                    <button class="btn-icon" title="重命名" @click="$emit('rename', doc.id)">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                    </button>
                                    <button class="btn-icon btn-danger-icon" title="删除" @click="$emit('delete', doc.id)">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                    </button>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    `
};

// 链接弹窗组件
const LinkModalComponent = {
    props: { show: Boolean, link: String },
    emits: ['close', 'copy', 'open', 'export-json', 'export-text'],
    template: `
        <div class="modal-overlay" :class="{ show: show }" role="dialog" aria-modal="true" @click.self="$emit('close')">
            <div class="modal">
                <div class="modal-header">
                    <h3>✨ 分享链接已生成</h3>
                    <button class="btn-icon modal-close" aria-label="关闭" @click="$emit('close')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="link-info"><p>把链接发给对方，ta 就能看到处理结果了</p></div>
                    <div class="link-input-group">
                        <input type="text" :value="link" readonly aria-label="分享链接">
                        <button class="btn-primary" @click="$emit('copy')">复制</button>
                    </div>
                    <div class="link-actions-row">
                        <button class="btn-secondary" @click="$emit('open')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            预览
                        </button>
                        <button class="btn-secondary" @click="$emit('export-json')">导出 JSON</button>
                        <button class="btn-secondary" @click="$emit('export-text')">导出文本</button>
                    </div>
                    <div class="link-tips"><p>💡 链接包含完整数据，对方打开即可查看</p></div>
                </div>
            </div>
        </div>
    `
};

// 用户弹窗组件
const UserModalComponent = {
    props: { show: Boolean, userName: String, isLoggedIn: Boolean },
    emits: ['close', 'login', 'logout'],
    data() {
        return {
            loginName: ''
        };
    },
    methods: {
        onLogin() {
            const name = this.loginName.trim();
            if (!name) return;
            this.$emit('login', name);
            this.loginName = '';
        }
    },
    template: `
        <div class="modal-overlay" :class="{ show: show }" role="dialog" aria-modal="true" @click.self="$emit('close')">
            <div class="modal user-modal">
                <div class="modal-header">
                    <h3>👤 用户中心</h3>
                    <button class="btn-icon modal-close" aria-label="关闭" @click="$emit('close')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="modal-body">
                    <template v-if="isLoggedIn">
                        <div class="user-info">
                            <div class="user-avatar">{{ userName.charAt(0).toUpperCase() }}</div>
                            <div class="user-detail">
                                <div class="user-name">{{ userName }}</div>
                                <div class="user-status">已登录</div>
                            </div>
                        </div>
                        <div class="user-tip">
                            <p>💡 历史记录与当前用户关联，切换用户将查看不同的历史记录</p>
                        </div>
                        <button class="btn-secondary btn-logout" @click="$emit('logout')">退出登录</button>
                    </template>
                    <template v-else>
                        <div class="user-login-form">
                            <p class="user-login-hint">输入用户名即可登录（数据保存在本地）</p>
                            <div class="user-input-group">
                                <input 
                                    v-model="loginName" 
                                    type="text" 
                                    placeholder="请输入用户名" 
                                    aria-label="用户名"
                                    maxlength="20"
                                    @keydown.enter="onLogin"
                                >
                                <button class="btn-primary" :disabled="!loginName.trim()" @click="onLogin">登录</button>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    `
};

// 模板弹窗组件（多平台模式升级）
const TemplateModalComponent = {
    props: { show: Boolean },
    emits: ['close', 'use'],
    data() {
        return {
            activePlatform: 'text-gen',
            activeCategory: 'all',
            // 平台模式定义
            platforms: [
                { key: 'text-gen', name: '文本生成', icon: '📝' },
                { key: 'email-gen', name: '邮件生成', icon: '📧' },
                { key: 'text-polish', name: '文本润色', icon: '✨' },
                { key: 'academic-summary', name: '学术摘要', icon: '📚' },
                { key: 'creative-writing', name: '创意写作', icon: '🎨' },
            ],
            // 平台模式与模板分类映射
            platformCategoryMap: {
                'text-gen': ['business', 'personal', 'social'],
                'email-gen': ['business', 'notice'],
                'text-polish': ['business', 'academic', 'personal'],
                'academic-summary': ['academic'],
                'creative-writing': ['personal', 'social', 'creative'],
            },
            // 平台模式对应的分类筛选
            platformCategories: {
                'text-gen': [
                    { key: 'all', name: '全部' },
                    { key: 'business', name: '商务' },
                    { key: 'personal', name: '个人' },
                    { key: 'social', name: '社交' },
                ],
                'email-gen': [
                    { key: 'all', name: '全部' },
                    { key: 'business', name: '商务' },
                    { key: 'notice', name: '通知' },
                ],
                'text-polish': [
                    { key: 'all', name: '全部' },
                    { key: 'business', name: '商务' },
                    { key: 'academic', name: '学术' },
                    { key: 'personal', name: '个人' },
                ],
                'academic-summary': [
                    { key: 'all', name: '全部' },
                    { key: 'academic', name: '学术' },
                ],
                'creative-writing': [
                    { key: 'all', name: '全部' },
                    { key: 'personal', name: '个人' },
                    { key: 'social', name: '社交' },
                    { key: 'creative', name: '创意' },
                ],
            }
        };
    },
    computed: {
        categories() {
            return this.platformCategories[this.activePlatform] || [{ key: 'all', name: '全部' }];
        },
        templates() {
            if (typeof getTemplates === 'undefined') return [];
            // 先根据平台过滤
            const platformCats = this.platformCategoryMap[this.activePlatform] || [];
            let filtered = LETTER_TEMPLATES.filter(t => platformCats.includes(t.category));
            // 再根据分类过滤
            if (this.activeCategory !== 'all') {
                filtered = filtered.filter(t => t.category === this.activeCategory);
            }
            return filtered;
        }
    },
    watch: {
        activePlatform() {
            // 切换平台时重置分类
            this.activeCategory = 'all';
        }
    },
    methods: {
        getCategoryName(cat) {
            const names = { letter: '信件', email: '邮件', notice: '通知', creative: '创意', business: '商务', personal: '个人', social: '社交', academic: '学术' };
            return names[cat] || cat;
        },
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    },
    template: `
        <div class="modal-overlay" :class="{ show: show }" role="dialog" aria-modal="true" @click.self="$emit('close')">
            <div class="modal template-modal">
                <div class="modal-header">
                    <h3>选择模板</h3>
                    <button class="btn-icon modal-close" aria-label="关闭" @click="$emit('close')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="template-platforms">
                        <button v-for="p in platforms" :key="p.key" class="template-platform-btn" :class="{ active: p.key === activePlatform }" @click="activePlatform = p.key">
                            <span class="platform-icon">{{ p.icon }}</span>
                            <span class="platform-name">{{ p.name }}</span>
                        </button>
                    </div>
                    <div class="template-categories">
                        <button v-for="c in categories" :key="c.key" class="template-category-btn" :class="{ active: c.key === activeCategory }" @click="activeCategory = c.key">{{ c.name }}</button>
                    </div>
                    <div class="template-grid">
                        <template v-if="templates.length === 0">
                            <div class="template-empty">
                                <p>当前平台模式暂无模板</p>
                            </div>
                        </template>
                        <template v-else>
                            <div v-for="t in templates" :key="t.id" class="template-card" @click="$emit('use', t.id)">
                                <div class="template-card-header">
                                    <span class="template-card-title">{{ t.title }}</span>
                                    <span class="template-card-cat">{{ getCategoryName(t.category) }}</span>
                                </div>
                                <div class="template-card-preview">{{ escapeHtml(t.preview) }}</div>
                                <div class="template-card-footer">点击使用 →</div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    `
};

// 历史记录弹窗组件
const HistoryModalComponent = {
    props: { show: Boolean, history: Array },
    emits: ['close', 'use', 'link', 'delete', 'clear'],
    methods: {
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    },
    template: `
        <div class="modal-overlay" :class="{ show: show }" role="dialog" aria-modal="true" @click.self="$emit('close')">
            <div class="modal history-modal">
                <div class="modal-header">
                    <h3>历史记录</h3>
                    <div class="modal-header-actions">
                        <button class="btn-secondary btn-clear-history" @click="$emit('clear')">清空</button>
                        <button class="btn-icon modal-close" aria-label="关闭" @click="$emit('close')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="history-list">
                        <template v-if="history.length === 0">
                            <div class="history-empty">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                                <p>暂无历史记录</p>
                            </div>
                        </template>
                        <template v-else>
                            <div v-for="item in history" :key="item.id" class="history-item">
                                <div class="history-item-header">
                                    <span class="history-item-style">{{ escapeHtml(item.styleName) }}</span>
                                    <span class="history-item-time">{{ item.time || '' }}</span>
                                </div>
                                <div class="history-item-preview">{{ escapeHtml(item.content) }}</div>
                                <div class="history-item-actions">
                                    <button class="btn-secondary" @click="$emit('use', item.id)">使用</button>
                                    <button class="btn-secondary" @click="$emit('link', item.id)">生成链接</button>
                                    <button class="btn-secondary btn-danger" @click="$emit('delete', item.id)">删除</button>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    `
};

// 编辑器面板组件（含工具栏 v53.0）
const EditorPanelComponent = {
    props: {
        content: String,
        wordCount: Number,
        wordCountStatus: String,
        autoSaveStatus: String,
        autoSaveStatusShow: Boolean,
        userName: String,
        isListening: Boolean,
        canUndo: Boolean,
        canRedo: Boolean,
        editorFontSize: Number,
        lineHeight: Number,
        textIndent: Number,
        textAlign: String,
        showFindReplace: Boolean,
        isFocusMode: Boolean,
        showWatermark: Boolean,
    },
    emits: ['update:content', 'clear', 'template', 'history', 'user', 'voice-input',
        'undo', 'redo', 'phrase', 'versions', 'shortcuts', 'find-replace',
        'reading-mode', 'focus-mode', 'diff', 'font-size-change', 'line-height-change',
        'text-indent-change', 'text-align-change', 'watermark-toggle', 'tools', 'analysis'],
    methods: {
        onInput(event) {
            this.$emit('update:content', event.target.value);
        }
    },
    template: `
        <section class="write-panel" :class="{ 'focus-mode': isFocusMode }" aria-label="输入区域">
            <div class="panel-header">
                <div class="logo">
                    <span class="logo-icon" aria-hidden="true">⚡</span>
                    <div>
                        <h1>TextCraft</h1>
                        <span class="logo-subtitle">智能文本处理系统</span>
                    </div>
                </div>
                <div class="header-actions">
                    <button class="btn-icon" :class="{ listening: isListening }" title="语音输入" aria-label="语音输入" @click="$emit('voice-input')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
                    </button>
                    <button class="btn-icon" title="撤销 (Ctrl+Z)" :disabled="!canUndo" @click="$emit('undo')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 105.64-9.36L1 10"/></svg>
                    </button>
                    <button class="btn-icon" title="重做 (Ctrl+Y)" :disabled="!canRedo" @click="$emit('redo')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 11-5.64-9.36L23 10"/></svg>
                    </button>
                    <button class="btn-icon" title="用户" aria-label="用户设置" @click="$emit('user')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </button>
                    <button class="btn-icon" title="历史记录" aria-label="历史记录" @click="$emit('history')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                    </button>
                    <button class="btn-icon" title="模板库" aria-label="模板库" @click="$emit('template')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                    </button>
                    <button class="btn-icon" title="清空" aria-label="清空" @click="$emit('clear')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                </div>
            </div>
            <!-- v53.0: 编辑工具栏 -->
            <div class="editor-toolbar">
                <button class="toolbar-btn" title="撤销" @click="$emit('undo')" :disabled="!canUndo">↩</button>
                <button class="toolbar-btn" title="重做" @click="$emit('redo')" :disabled="!canRedo">↪</button>
                <div class="toolbar-divider"></div>
                <!-- v45.0: 字体大小 -->
                <div class="font-size-control">
                    <button class="font-size-btn" title="减小字体" @click="$emit('font-size-change', -1)">A-</button>
                    <span class="font-size-value">{{ editorFontSize }}</span>
                    <button class="font-size-btn" title="增大字体" @click="$emit('font-size-change', 1)">A+</button>
                </div>
                <div class="toolbar-divider"></div>
                <!-- v46.0: 行距 -->
                <button class="toolbar-btn" title="减小行距" @click="$emit('line-height-change', -0.2)">≡-</button>
                <span class="font-size-value">{{ lineHeight.toFixed(1) }}</span>
                <button class="toolbar-btn" title="增大行距" @click="$emit('line-height-change', 0.2)">≡+</button>
                <div class="toolbar-divider"></div>
                <!-- v47.0: 段落缩进 -->
                <button class="toolbar-btn" title="减少缩进" @click="$emit('text-indent-change', -2)">⇤</button>
                <button class="toolbar-btn" title="增加缩进" @click="$emit('text-indent-change', 2)">⇥</button>
                <div class="toolbar-divider"></div>
                <!-- v48.0: 文本对齐 -->
                <button class="toolbar-btn" :class="{ active: textAlign === 'left' }" title="左对齐" @click="$emit('text-align-change', 'left')">☰</button>
                <button class="toolbar-btn" :class="{ active: textAlign === 'center' }" title="居中" @click="$emit('text-align-change', 'center')">☷</button>
                <button class="toolbar-btn" :class="{ active: textAlign === 'right' }" title="右对齐" @click="$emit('text-align-change', 'right')">☶</button>
                <div class="toolbar-divider"></div>
                <!-- v49.0: 查找替换 -->
                <button class="toolbar-btn" title="查找替换 (Ctrl+F)" @click="$emit('find-replace')">🔍</button>
                <!-- v33.0: 快捷短语 -->
                <button class="toolbar-btn" title="快捷短语" @click="$emit('phrase')">💬</button>
                <!-- v30.0: 版本历史 -->
                <button class="toolbar-btn" title="版本历史" @click="$emit('versions')">📜</button>
                <!-- v29.0: 文本对比 -->
                <button class="toolbar-btn" title="文本对比" @click="$emit('diff')">📊</button>
                <!-- v23.0: 阅读模式 -->
                <button class="toolbar-btn" title="阅读模式" @click="$emit('reading-mode')">📖</button>
                <!-- v24.0: 全屏专注 -->
                <button class="toolbar-btn" :class="{ active: isFocusMode }" title="全屏专注" @click="$emit('focus-mode')">🎯</button>
                <!-- v52.0: 水印 -->
                <button class="toolbar-btn" title="水印" @click="$emit('watermark-toggle')">💧</button>
                <!-- v54-v100: 工具箱 & 分析 -->
                <button class="toolbar-btn" title="工具箱" @click="$emit('tools')">🛠️</button>
                <button class="toolbar-btn" title="文本分析" @click="$emit('analysis')">📊</button>
                <!-- v21.0: 快捷键 -->
                <button class="toolbar-btn" title="快捷键" @click="$emit('shortcuts')">⌨</button>
            </div>
            <!-- v49.0: 查找替换栏 -->
            <find-replace-bar :show="showFindReplace" :content="content" @close="$emit('find-replace')" @replace="$emit('replace', $event)" @replaceall="$emit('replaceall', $event)"></find-replace-bar>
            <div class="editor-wrapper">
                <div class="letter-paper" :style="{ '--editor-font-size': editorFontSize + 'px', '--editor-line-height': lineHeight, '--editor-text-indent': textIndent + 'em', '--editor-text-align': textAlign }">
                    <div class="paper-lines" aria-hidden="true"></div>
                    <!-- v52.0: 水印 -->
                    <div class="watermark-overlay" v-if="showWatermark">
                        <div class="watermark-text" style="top:20%;left:10%">TextCraft</div>
                        <div class="watermark-text" style="top:50%;left:40%">TextCraft</div>
                        <div class="watermark-text" style="top:80%;left:70%">TextCraft</div>
                    </div>
                    <textarea 
                        :value="content"
                        @input="onInput"
                        placeholder="输入文本内容...&#10;&#10;支持：信件、邮件、通知、创意写作等&#10;选择下方处理风格，一键转换"
                        aria-label="文本输入框"
                        maxlength="5000"
                        spellcheck="true"
                        :style="{ fontSize: editorFontSize + 'px', lineHeight: lineHeight, textIndent: textIndent + 'em', textAlign: textAlign }"
                    ></textarea>
                </div>
            </div>
            <div class="editor-footer">
                <span class="word-count" :class="wordCountStatus" aria-live="polite">{{ wordCount }} 字</span>
                <span class="auto-save-status" :class="{ show: autoSaveStatusShow }" aria-live="polite">{{ autoSaveStatus }}</span>
            </div>
        </section>
    `
};

// 预览面板组件（含 AI 模式切换 + 平台模式）
const PreviewPanelComponent = {
    props: {
        currentStyle: String,
        currentTransformed: String,
        styles: Array,
        processingMode: { type: String, default: 'style' },
        platformMode: { type: String, default: 'text-gen' },
        aiTasks: { type: Array, default: () => [] },
        currentAITask: { type: String, default: '' },
        aiProcessing: { type: Boolean, default: false },
        isReading: { type: Boolean, default: false },
    },
    emits: ['select-style', 'generate', 'copy', 'print', 'export-pdf', 'export-image', 'export-html', 'update:processing-mode', 'update:platform-mode', 'ai-task', 'read-aloud'],
    data() {
        return {
            platforms: [
                { key: 'text-gen', name: '文本生成', icon: '📝' },
                { key: 'email-gen', name: '邮件生成', icon: '📧' },
                { key: 'text-polish', name: '文本润色', icon: '✨' },
                { key: 'academic-summary', name: '学术摘要', icon: '📚' },
                { key: 'creative-writing', name: '创意写作', icon: '🎨' },
            ],
        };
    },
    computed: {
        styleName() {
            const style = this.styles.find(s => s.key === this.currentStyle);
            return style ? style.name : this.currentStyle;
        },
        cssClass() {
            const style = this.styles.find(s => s.key === this.currentStyle);
            return style ? style.cssClass : '';
        },
        hasContent() {
            return !!this.currentTransformed;
        },
        currentTime() {
            return new Date().toLocaleString('zh-CN');
        },
        // 当前 AI 任务名称
        currentAITaskName() {
            if (!this.currentAITask) return '';
            const task = this.aiTasks.find(t => t.key === this.currentAITask);
            return task ? task.name : this.currentAITask;
        },
        currentPlatformName() {
            const p = this.platforms.find(p => p.key === this.platformMode);
            return p ? p.name : '文本生成';
        }
    },
    methods: {
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
        renderMarkdown(text) {
            if (typeof marked !== 'undefined') {
                // 先提取 Mermaid 代码块
                const mermaidBlocks = [];
                let processedText = text.replace(/```mermaid\n([\s\S]+?)```/g, (match, code) => {
                    const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    mermaidBlocks.push({ id, code: code.trim() });
                    return `<div class="mermaid-block" data-mermaid-id="${id}"></div>`;
                });

                let html = marked.parse(processedText);

                // 处理 LaTeX 公式
                html = html.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
                    try {
                        if (typeof katex !== 'undefined') {
                            return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
                        }
                    } catch (e) { return match; }
                    return match;
                });
                html = html.replace(/\$([^\$]+?)\$/g, (match, formula) => {
                    try {
                        if (typeof katex !== 'undefined') {
                            return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
                        }
                    } catch (e) { return match; }
                    return match;
                });

                // 渲染 Mermaid 图表
                if (mermaidBlocks.length > 0 && typeof mermaid !== 'undefined') {
                    setTimeout(() => {
                        mermaidBlocks.forEach(async ({ id, code }) => {
                            const container = document.querySelector(`[data-mermaid-id="${id}"]`);
                            if (container) {
                                try {
                                    const { svg } = await mermaid.render(`mermaid-svg-${id}`, code);
                                    container.innerHTML = svg;
                                } catch (e) {
                                    container.innerHTML = `<pre class="mermaid-error">Mermaid 渲染失败: ${e.message}</pre>`;
                                }
                            }
                        });
                    }, 100);
                }

                return html;
            }
            return text.replace(/\n/g, '<br>');
        },
        switchMode(mode) {
            this.$emit('update:processing-mode', mode);
        },
        switchPlatform(key) {
            this.$emit('update:platform-mode', key);
        }
    },
    template: `
        <section class="preview-panel" aria-label="输出区域">
            <!-- 平台模式 Tab 导航 -->
            <div class="platform-tabs">
                <button v-for="p in platforms" :key="p.key" class="platform-tab-btn" :class="{ active: p.key === platformMode }" @click="switchPlatform(p.key)">
                    <span class="platform-tab-icon">{{ p.icon }}</span>
                    <span class="platform-tab-name">{{ p.name }}</span>
                </button>
            </div>
            <div class="panel-header">
                <h2>{{ currentPlatformName }}</h2>
                <div class="panel-header-actions">
                    <button class="btn-icon" title="导出 HTML" aria-label="导出 HTML" @click="$emit('export-html')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    </button>
                    <button class="btn-icon" title="导出图片" aria-label="导出图片" @click="$emit('export-image')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
                    </button>
                    <button class="btn-icon" title="打印" aria-label="打印" @click="$emit('print')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6,9 6,2 18,2 18,9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    </button>
                </div>
            </div>
            <!-- 处理模式切换 -->
            <div class="mode-switch">
                <button class="mode-switch-btn" :class="{ active: processingMode === 'style' }" @click="switchMode('style')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    风格转换
                </button>
                <button class="mode-switch-btn" :class="{ active: processingMode === 'ai' }" @click="switchMode('ai')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 014 4c0 1.95-1.4 3.58-3.25 3.93"/><path d="M12 2a4 4 0 00-4 4c0 1.95 1.4 3.58 3.25 3.93"/><line x1="12" y1="10" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
                    AI 处理
                </button>
            </div>
            <!-- 风格转换模式 -->
            <div v-if="processingMode === 'style'" class="style-grid" role="listbox" aria-label="选择处理风格">
                <button 
                    v-for="s in styles" 
                    :key="s.key"
                    class="style-card" 
                    :class="{ active: s.key === currentStyle }"
                    @click="$emit('select-style', s.key)"
                >{{ s.name }}</button>
            </div>
            <!-- AI 处理模式 -->
            <div v-if="processingMode === 'ai'" class="ai-task-grid" role="listbox" aria-label="选择 AI 任务">
                <button 
                    v-for="task in aiTasks" 
                    :key="task.key"
                    class="ai-task-card" 
                    :class="{ active: task.key === currentAITask, disabled: aiProcessing }"
                    :disabled="aiProcessing"
                    @click="$emit('ai-task', task.key)"
                >
                    <span class="ai-task-name">{{ task.name }}</span>
                    <span class="ai-task-desc">{{ task.description }}</span>
                </button>
            </div>
            <!-- AI 处理状态 -->
            <div v-if="aiProcessing" class="ai-processing-status">
                <div class="ai-processing-spinner"></div>
                <span>AI 正在处理中（{{ currentAITaskName }}）...</span>
            </div>
            <div class="preview-area" aria-live="polite">
                <template v-if="!hasContent">
                    <div class="empty-preview">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        <p>选择处理风格，预览输出效果</p>
                    </div>
                </template>
                <template v-else>
                    <div class="preview-letter-card" :class="cssClass">
                        <div class="preview-letter-header">
                            <div class="preview-letter-logo">
                                <span class="logo-icon">⚡</span>
                                <span>TextCraft</span>
                            </div>
                            <span class="preview-letter-style-badge" :class="cssClass">{{ styleName }}</span>
                        </div>
                        <div class="preview-letter-content" v-html="renderMarkdown(currentTransformed)"></div>
                        <div class="preview-letter-footer">
                            <div class="preview-letter-time">{{ currentTime }}</div>
                        </div>
                        <div class="preview-letter-watermark">由 TextCraft 智能文本处理系统生成</div>
                    </div>
                </template>
            </div>
            <div class="preview-actions" v-show="hasContent">
                <button class="btn-primary btn-generate" aria-label="生成分享链接" @click="$emit('generate')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                    生成分享链接
                </button>
                <button class="btn-secondary btn-copy" aria-label="复制文字" @click="$emit('copy')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    复制
                </button>
                <button class="btn-secondary btn-read-aloud" :class="{ reading: isReading }" aria-label="朗读" @click="$emit('read-aloud')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>
                    朗读
                </button>
            </div>
        </section>
    `
};

// 快捷键面板组件 (v21.0)
const ShortcutsModalComponent = {
    props: { show: Boolean },
    emits: ['close'],
    data() {
        return {
            shortcuts: [
                { key: 'Ctrl+S', desc: '保存' },
                { key: 'Ctrl+D', desc: '清空' },
                { key: 'Ctrl+P', desc: '打印' },
                { key: 'Ctrl+T', desc: '切换主题' },
                { key: 'Ctrl+Z', desc: '撤销' },
                { key: 'Ctrl+Y', desc: '重做' },
                { key: 'Ctrl+F', desc: '查找替换' },
                { key: 'Ctrl+Shift+R', desc: '阅读模式' },
                { key: 'Ctrl+Shift+F', desc: '全屏专注' },
                { key: 'Ctrl+Shift+V', desc: '版本历史' },
                { key: 'Ctrl+Shift+K', desc: '快捷键面板' },
                { key: 'Esc', desc: '关闭弹窗' },
            ]
        };
    },
    template: `
        <div class="modal-overlay" :class="{ show: show }" role="dialog" aria-modal="true" @click.self="$emit('close')">
            <div class="modal">
                <div class="modal-header">
                    <h3>⌨️ 快捷键</h3>
                    <button class="btn-icon modal-close" aria-label="关闭" @click="$emit('close')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="shortcut-grid">
                        <div v-for="s in shortcuts" :key="s.key" class="shortcut-item">
                            <span>{{ s.desc }}</span>
                            <span class="shortcut-keys"><span class="shortcut-key">{{ s.key }}</span></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};

// 版本历史弹窗组件 (v30.0)
const VersionHistoryModalComponent = {
    props: { show: Boolean, versions: Array },
    emits: ['close', 'restore', 'delete', 'save'],
    methods: {
        escapeHtml(text) { return text ? text.replace(/</g, '&lt;') : ''; },
        formatTime(iso) {
            if (!iso) return '';
            const d = new Date(iso);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
    },
    template: `
        <div class="modal-overlay" :class="{ show: show }" role="dialog" aria-modal="true" @click.self="$emit('close')">
            <div class="modal" style="max-width:560px">
                <div class="modal-header">
                    <h3>📜 版本历史</h3>
                    <div class="modal-header-actions">
                        <button class="btn-primary btn-new-doc" @click="$emit('save')">保存当前版本</button>
                        <button class="btn-icon modal-close" aria-label="关闭" @click="$emit('close')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                    <template v-if="versions.length === 0">
                        <div class="history-empty"><p>暂无版本历史</p></div>
                    </template>
                    <template v-else>
                        <div v-for="v in versions" :key="v.id" class="version-item">
                            <div class="version-info">
                                <div class="version-note">{{ v.note || '自动保存' }}</div>
                                <div class="version-time">{{ formatTime(v.timestamp) }} · {{ v.wordCount || 0 }} 字</div>
                            </div>
                            <div class="version-actions">
                                <button class="btn-secondary" @click="$emit('restore', v.id)">恢复</button>
                                <button class="btn-secondary btn-danger" @click="$emit('delete', v.id)">删除</button>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    `
};

// 查找替换栏组件 (v49.0)
const FindReplaceBarComponent = {
    props: { show: Boolean, content: String },
    emits: ['close', 'replace', 'replaceAll'],
    data() {
        return { findText: '', replaceText: '', matchCount: 0 };
    },
    watch: {
        findText() { this.updateCount(); },
        content() { this.updateCount(); }
    },
    methods: {
        updateCount() {
            if (!this.findText) { this.matchCount = 0; return; }
            const regex = new RegExp(this.findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            this.matchCount = (this.content.match(regex) || []).length;
        },
        onReplace() {
            if (!this.findText || !this.content) return;
            this.$emit('replace', { find: this.findText, replace: this.replaceText });
        },
        onReplaceAll() {
            if (!this.findText || !this.content) return;
            this.$emit('replaceAll', { find: this.findText, replace: this.replaceText });
        }
    },
    template: `
        <div class="find-replace-bar" v-if="show">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input v-model="findText" placeholder="查找..." @keydown.enter="onReplace">
            <input v-model="replaceText" placeholder="替换为..." @keydown.enter="onReplaceAll">
            <span class="find-count">{{ matchCount }} 处匹配</span>
            <button @click="onReplace">替换</button>
            <button @click="onReplaceAll">全部替换</button>
            <button class="btn-icon" style="width:24px;height:24px" @click="$emit('close')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </div>
    `
};

// 阅读模式组件 (v23.0)
const ReadingModeComponent = {
    props: { show: Boolean, content: String, styleName: String },
    emits: ['close'],
    methods: {
        escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }
    },
    template: `
        <div class="reading-mode-overlay" v-if="show" @click.self="$emit('close')">
            <button class="btn-icon reading-mode-close" @click="$emit('close')" title="退出阅读模式">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div class="reading-mode-content">
                <h1 v-if="styleName">{{ escapeHtml(styleName) }}</h1>
                <div style="white-space:pre-wrap;font-size:18px;line-height:2">{{ escapeHtml(content) }}</div>
            </div>
        </div>
    `
};

// 导出菜单组件 (v36/37/39/40.0)
const ExportMenuComponent = {
    props: { show: Boolean },
    emits: ['close', 'export-word', 'export-markdown', 'export-share-card', 'export-qr-code'],
    template: `
        <div class="export-dropdown" v-if="show">
            <div class="export-menu">
                <button class="export-menu-item" @click="$emit('export-word')">📄 导出 Word</button>
                <button class="export-menu-item" @click="$emit('export-markdown')">📝 导出 Markdown</button>
                <button class="export-menu-item" @click="$emit('export-share-card')">🖼️ 生成分享卡片</button>
                <button class="export-menu-item" @click="$emit('export-qr-code')">📱 生成二维码</button>
            </div>
        </div>
    `
};

// QR Code 弹窗
const QRCodeModalComponent = {
    props: { show: Boolean, qrUrl: String },
    emits: ['close'],
    template: `
        <div class="modal-overlay" :class="{ show: show }" role="dialog" aria-modal="true" @click.self="$emit('close')">
            <div class="modal" style="max-width:320px">
                <div class="modal-header">
                    <h3>📱 二维码分享</h3>
                    <button class="btn-icon modal-close" @click="$emit('close')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="modal-body" style="text-align:center">
                    <img v-if="qrUrl" :src="qrUrl" alt="QR Code" style="max-width:200px;border-radius:8px">
                    <p style="margin-top:12px;font-size:13px;color:var(--color-text-muted)">扫描二维码查看内容</p>
                </div>
            </div>
        </div>
    `
};

// ==================== v54-v100: 工具箱弹窗组件 ====================
const ToolsModalComponent = {
    props: { show: Boolean },
    emits: ['close', 'apply-tool'],
    data() {
        return {
            activeTab: 'encode',
            tabs: [
                { key: 'encode', name: '编码/解码', icon: '🔐' },
                { key: 'format', name: '格式化', icon: '📋' },
                { key: 'convert', name: '转换工具', icon: '🔄' },
                { key: 'generate', name: '生成器', icon: '🎲' },
                { key: 'regex', name: '正则测试', icon: '🔍' },
                { key: 'crypto', name: '加密/哈希', icon: '🔒' },
            ],
            // encode
            encodeInput: '',
            encodeOutput: '',
            encodeType: 'base64-encode',
            // format
            formatInput: '',
            formatOutput: '',
            formatType: 'json',
            // convert
            convertInput: '',
            convertOutput: '',
            convertType: 'upper',
            // generate
            genType: 'password',
            genOutput: '',
            genLength: 16,
            genCount: 1,
            // regex
            regexText: '',
            regexPattern: '',
            regexFlags: 'g',
            regexResult: null,
            // crypto
            cryptoInput: '',
            cryptoOutput: '',
            cryptoType: 'hash-sha256',
            cryptoPassword: '',
        };
    },
    watch: {
        encodeInput() { this.runEncode(); },
        encodeType() { this.runEncode(); },
        formatInput() { this.runFormat(); },
        formatType() { this.runFormat(); },
        convertInput() { this.runConvert(); },
        convertType() { this.runConvert(); },
        regexText() { this.runRegex(); },
        regexPattern() { this.runRegex(); },
        cryptoInput() { this.runCrypto(); },
        cryptoType() { this.runCrypto(); },
    },
    methods: {
        escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; },
        runEncode() {
            if (!this.encodeInput) { this.encodeOutput = ''; return; }
            const s = ExportService;
            switch (this.encodeType) {
                case 'base64-encode': this.encodeOutput = s.base64Encode(this.encodeInput); break;
                case 'base64-decode': this.encodeOutput = s.base64Decode(this.encodeInput); break;
                case 'url-encode': this.encodeOutput = s.urlEncode(this.encodeInput); break;
                case 'url-decode': this.encodeOutput = s.urlDecode(this.encodeInput); break;
            }
        },
        runFormat() {
            if (!this.formatInput) { this.formatOutput = ''; return; }
            const s = ExportService;
            switch (this.formatType) {
                case 'json': this.formatOutput = s.formatJSON(this.formatInput); break;
                case 'xml': this.formatOutput = s.formatXML(this.formatInput); break;
                case 'sql': this.formatOutput = s.formatSQL(this.formatInput); break;
                case 'csv': this.formatOutput = JSON.stringify(s.parseCSV(this.formatInput), null, 2); break;
            }
        },
        runConvert() {
            if (!this.convertInput) { this.convertOutput = ''; return; }
            const s = ExportService;
            switch (this.convertType) {
                case 'upper': this.convertOutput = s.caseConvert(this.convertInput, 'upper'); break;
                case 'lower': this.convertOutput = s.caseConvert(this.convertInput, 'lower'); break;
                case 'title': this.convertOutput = s.caseConvert(this.convertInput, 'title'); break;
                case 'reverse': this.convertOutput = s.reverseText(this.convertInput); break;
                case 'fullwidth': this.convertOutput = s.fullWidthConvert(this.convertInput, true); break;
                case 'halfwidth': this.convertOutput = s.fullWidthConvert(this.convertInput, false); break;
                case 'traditional': this.convertOutput = s.traditionalConvert(this.convertInput, true); break;
                case 'simplified': this.convertOutput = s.traditionalConvert(this.convertInput, false); break;
                case 'pinyin': this.convertOutput = s.toPinyin(this.convertInput); break;
                case 'html2text': this.convertOutput = s.htmlToText(this.convertInput); break;
                case 'text2html': this.convertOutput = s.textToHTML(this.convertInput); break;
                case 'clean': this.convertOutput = s.cleanFormat(this.convertInput); break;
                case 'dedup-line': this.convertOutput = s.deduplicateText(this.convertInput, 'line'); break;
                case 'dedup-para': this.convertOutput = s.deduplicateText(this.convertInput, 'paragraph'); break;
                case 'smart-split': this.convertOutput = s.smartSplit(this.convertInput); break;
            }
        },
        runGenerate() {
            const s = ExportService;
            switch (this.genType) {
                case 'password':
                    this.genOutput = Array.from({ length: this.genCount }, () => s.generatePassword(this.genLength)).join('\n');
                    break;
                case 'uuid':
                    this.genOutput = s.generateUUID(this.genCount).join('\n');
                    break;
                case 'lorem':
                    this.genOutput = s.generateLoremIpsum(this.genCount);
                    break;
                case 'random-text':
                    this.genOutput = s.generateRandomText('chinese', this.genLength);
                    break;
            }
        },
        runRegex() {
            if (!this.regexText || !this.regexPattern) { this.regexResult = null; return; }
            this.regexResult = ExportService.testRegex(this.regexText, this.regexPattern, this.regexFlags);
        },
        async runCrypto() {
            if (!this.cryptoInput) { this.cryptoOutput = ''; return; }
            const s = ExportService;
            if (this.cryptoType === 'hash-sha256') {
                this.cryptoOutput = await s.calculateHash(this.cryptoInput, 'SHA-256');
            } else if (this.cryptoType === 'hash-md5') {
                this.cryptoOutput = await s.calculateHash(this.cryptoInput, 'SHA-1');
            } else if (this.cryptoType === 'encrypt') {
                if (this.cryptoPassword) this.cryptoOutput = s.encryptText(this.cryptoInput, this.cryptoPassword);
            } else if (this.cryptoType === 'decrypt') {
                if (this.cryptoPassword) this.cryptoOutput = s.decryptText(this.cryptoInput, this.cryptoPassword);
            }
        },
        copyOutput(text) {
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText(text);
            }
        },
        applyToEditor() {
            const outputs = { encode: this.encodeOutput, format: this.formatOutput, convert: this.convertOutput };
            const out = outputs[this.activeTab] || '';
            if (out) this.$emit('apply-tool', out);
        },
    },
    template: `
        <div class="modal-overlay" :class="{ show: show }" role="dialog" aria-modal="true" @click.self="$emit('close')">
            <div class="modal tools-modal">
                <div class="modal-header">
                    <h3>🛠️ 文本工具箱</h3>
                    <button class="btn-icon modal-close" @click="$emit('close')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="tools-tabs">
                        <button v-for="t in tabs" :key="t.key" class="tools-tab-btn" :class="{ active: t.key === activeTab }" @click="activeTab = t.key">
                            <span class="tools-tab-icon">{{ t.icon }}</span>
                            <span>{{ t.name }}</span>
                        </button>
                    </div>
                    <div class="tools-content">
                        <!-- 编码/解码 -->
                        <div v-if="activeTab === 'encode'" class="tools-panel">
                            <div class="tools-options">
                                <select v-model="encodeType">
                                    <option value="base64-encode">Base64 编码</option>
                                    <option value="base64-decode">Base64 解码</option>
                                    <option value="url-encode">URL 编码</option>
                                    <option value="url-decode">URL 解码</option>
                                </select>
                            </div>
                            <div class="tools-io">
                                <textarea v-model="encodeInput" placeholder="输入文本..."></textarea>
                                <div class="tools-arrow">↓</div>
                                <textarea :value="encodeOutput" readonly placeholder="结果..."></textarea>
                            </div>
                            <div class="tools-actions">
                                <button class="btn-secondary" @click="copyOutput(encodeOutput)">复制结果</button>
                                <button class="btn-primary" @click="applyToEditor">应用到编辑器</button>
                            </div>
                        </div>
                        <!-- 格式化 -->
                        <div v-if="activeTab === 'format'" class="tools-panel">
                            <div class="tools-options">
                                <select v-model="formatType">
                                    <option value="json">JSON 格式化</option>
                                    <option value="xml">XML 格式化</option>
                                    <option value="sql">SQL 格式化</option>
                                    <option value="csv">CSV 解析</option>
                                </select>
                            </div>
                            <div class="tools-io">
                                <textarea v-model="formatInput" placeholder="输入文本..."></textarea>
                                <div class="tools-arrow">↓</div>
                                <textarea :value="formatOutput" readonly placeholder="结果..."></textarea>
                            </div>
                            <div class="tools-actions">
                                <button class="btn-secondary" @click="copyOutput(formatOutput)">复制结果</button>
                                <button class="btn-primary" @click="applyToEditor">应用到编辑器</button>
                            </div>
                        </div>
                        <!-- 转换工具 -->
                        <div v-if="activeTab === 'convert'" class="tools-panel">
                            <div class="tools-options">
                                <select v-model="convertType">
                                    <option value="upper">转大写</option>
                                    <option value="lower">转小写</option>
                                    <option value="title">标题大小写</option>
                                    <option value="reverse">文本反转</option>
                                    <option value="fullwidth">转全角</option>
                                    <option value="halfwidth">转半角</option>
                                    <option value="traditional">简体→繁体</option>
                                    <option value="simplified">繁体→简体</option>
                                    <option value="pinyin">转拼音</option>
                                    <option value="html2text">HTML→文本</option>
                                    <option value="text2html">文本→HTML</option>
                                    <option value="clean">格式清理</option>
                                    <option value="dedup-line">行去重</option>
                                    <option value="dedup-para">段落去重</option>
                                    <option value="smart-split">智能分段</option>
                                </select>
                            </div>
                            <div class="tools-io">
                                <textarea v-model="convertInput" placeholder="输入文本..."></textarea>
                                <div class="tools-arrow">↓</div>
                                <textarea :value="convertOutput" readonly placeholder="结果..."></textarea>
                            </div>
                            <div class="tools-actions">
                                <button class="btn-secondary" @click="copyOutput(convertOutput)">复制结果</button>
                                <button class="btn-primary" @click="applyToEditor">应用到编辑器</button>
                            </div>
                        </div>
                        <!-- 生成器 -->
                        <div v-if="activeTab === 'generate'" class="tools-panel">
                            <div class="tools-options">
                                <select v-model="genType">
                                    <option value="password">密码生成</option>
                                    <option value="uuid">UUID 生成</option>
                                    <option value="lorem">Lorem Ipsum</option>
                                    <option value="random-text">随机中文</option>
                                </select>
                                <div class="tools-gen-opts">
                                    <label>长度: <input type="number" v-model.number="genLength" min="1" max="1000"></label>
                                    <label>数量: <input type="number" v-model.number="genCount" min="1" max="20"></label>
                                </div>
                                <button class="btn-primary" @click="runGenerate">生成</button>
                            </div>
                            <div class="tools-io">
                                <textarea :value="genOutput" readonly placeholder="生成结果..."></textarea>
                            </div>
                            <div class="tools-actions">
                                <button class="btn-secondary" @click="copyOutput(genOutput)">复制结果</button>
                                <button class="btn-primary" @click="applyToEditor">应用到编辑器</button>
                            </div>
                        </div>
                        <!-- 正则测试 -->
                        <div v-if="activeTab === 'regex'" class="tools-panel">
                            <div class="tools-options">
                                <input v-model="regexPattern" placeholder="正则表达式...">
                                <input v-model="regexFlags" placeholder="标志 (g)" style="width:60px">
                            </div>
                            <textarea v-model="regexText" placeholder="测试文本..." style="width:100%;min-height:100px;margin-bottom:8px"></textarea>
                            <div v-if="regexResult" class="tools-regex-result">
                                <p>匹配数: <strong>{{ regexResult.count }}</strong></p>
                                <p v-if="regexResult.valid">匹配: <code>{{ escapeHtml(JSON.stringify(regexResult.matches.slice(0, 20))) }}</code></p>
                                <p v-if="!regexResult.valid" style="color:var(--color-danger)">错误: {{ regexResult.error }}</p>
                            </div>
                        </div>
                        <!-- 加密/哈希 -->
                        <div v-if="activeTab === 'crypto'" class="tools-panel">
                            <div class="tools-options">
                                <select v-model="cryptoType">
                                    <option value="hash-sha256">SHA-256 哈希</option>
                                    <option value="hash-md5">SHA-1 哈希</option>
                                    <option value="encrypt">XOR 加密</option>
                                    <option value="decrypt">XOR 解密</option>
                                </select>
                                <input v-if="cryptoType === 'encrypt' || cryptoType === 'decrypt'" v-model="cryptoPassword" placeholder="密码/密钥">
                            </div>
                            <div class="tools-io">
                                <textarea v-model="cryptoInput" placeholder="输入文本..."></textarea>
                                <div class="tools-arrow">↓</div>
                                <textarea :value="cryptoOutput" readonly placeholder="结果..."></textarea>
                            </div>
                            <div class="tools-actions">
                                <button class="btn-secondary" @click="copyOutput(cryptoOutput)">复制结果</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};

// ==================== v54-v100: 文本分析面板组件 ====================
const TextAnalysisPanelComponent = {
    props: { show: Boolean, content: String },
    emits: ['close'],
    computed: {
        stats() {
            if (!this.content) return null;
            return ExportService.getTextStats(this.content);
        },
        readingTime() {
            if (!this.content) return '';
            return ExportService.estimateReadingTime(this.content);
        },
        density() {
            if (!this.content) return null;
            return ExportService.analyzeTextDensity(this.content);
        },
        keywords() {
            if (!this.content) return [];
            return ExportService.extractKeywords(this.content, 15);
        },
        sentiment() {
            if (!this.content) return null;
            return ExportService.analyzeSentiment(this.content);
        },
        difficulty() {
            if (!this.content) return null;
            return ExportService.assessTextDifficulty(this.content);
        },
        grammarIssues() {
            if (!this.content) return [];
            return ExportService.checkGrammar(this.content);
        },
        duplicateLines() {
            if (!this.content) return [];
            return ExportService.findDuplicateLines(this.content);
        },
        charFreq() {
            if (!this.content) return [];
            return ExportService.analyzeCharFrequency(this.content, 20);
        },
        sentenceLen() {
            if (!this.content) return null;
            return ExportService.analyzeSentenceLength(this.content);
        },
        wordFreq() {
            if (!this.content) return [];
            return ExportService.wordFrequency(this.content, 15);
        },
    },
    template: `
        <div class="modal-overlay" :class="{ show: show }" role="dialog" aria-modal="true" @click.self="$emit('close')">
            <div class="modal analysis-modal">
                <div class="modal-header">
                    <h3>📊 文本分析面板</h3>
                    <button class="btn-icon modal-close" @click="$emit('close')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="modal-body">
                    <template v-if="!content">
                        <div class="analysis-empty"><p>请先输入文本内容</p></div>
                    </template>
                    <template v-else>
                        <div class="analysis-grid">
                            <!-- 基础统计 -->
                            <div class="analysis-card">
                                <h4>📈 基础统计</h4>
                                <div class="analysis-stats">
                                    <div class="stat-item"><span class="stat-label">总字符</span><span class="stat-value">{{ stats.chars }}</span></div>
                                    <div class="stat-item"><span class="stat-label">不含空格</span><span class="stat-value">{{ stats.charsNoSpace }}</span></div>
                                    <div class="stat-item"><span class="stat-label">英文单词</span><span class="stat-value">{{ stats.words }}</span></div>
                                    <div class="stat-item"><span class="stat-label">中文字符</span><span class="stat-value">{{ stats.chineseChars }}</span></div>
                                    <div class="stat-item"><span class="stat-label">句子数</span><span class="stat-value">{{ stats.sentences }}</span></div>
                                    <div class="stat-item"><span class="stat-label">段落数</span><span class="stat-value">{{ stats.paragraphs }}</span></div>
                                    <div class="stat-item"><span class="stat-label">行数</span><span class="stat-value">{{ stats.lines }}</span></div>
                                    <div class="stat-item"><span class="stat-label">阅读时间</span><span class="stat-value">{{ readingTime }}</span></div>
                                </div>
                            </div>
                            <!-- 文本密度 -->
                            <div class="analysis-card">
                                <h4>🔬 文本密度</h4>
                                <div class="density-bars">
                                    <div class="density-bar"><span>中文</span><div class="bar-bg"><div class="bar-fill" :style="{ width: density.chineseRatio + '%' }"></div></div><span>{{ density.chineseRatio }}%</span></div>
                                    <div class="density-bar"><span>英文</span><div class="bar-bg"><div class="bar-fill" :style="{ width: density.englishRatio + '%' }"></div></div><span>{{ density.englishRatio }}%</span></div>
                                    <div class="density-bar"><span>数字</span><div class="bar-bg"><div class="bar-fill" :style="{ width: density.numberRatio + '%' }"></div></div><span>{{ density.numberRatio }}%</span></div>
                                    <div class="density-bar"><span>标点</span><div class="bar-bg"><div class="bar-fill" :style="{ width: density.punctuationRatio + '%' }"></div></div><span>{{ density.punctuationRatio }}%</span></div>
                                    <div class="density-bar"><span>空格</span><div class="bar-bg"><div class="bar-fill" :style="{ width: density.spaceRatio + '%' }"></div></div><span>{{ density.spaceRatio }}%</span></div>
                                </div>
                            </div>
                            <!-- 情感分析 -->
                            <div class="analysis-card">
                                <h4>💭 情感分析</h4>
                                <div class="sentiment-display">
                                    <div class="sentiment-label" :class="sentiment.label">{{ sentiment.label }}</div>
                                    <div class="sentiment-score">得分: {{ sentiment.score }}</div>
                                    <div class="sentiment-detail">正面: {{ sentiment.positive }} | 负面: {{ sentiment.negative }}</div>
                                </div>
                            </div>
                            <!-- 文本难度 -->
                            <div class="analysis-card">
                                <h4>📚 文本难度</h4>
                                <div class="difficulty-display">
                                    <div class="difficulty-level">{{ difficulty.level }}</div>
                                    <div class="difficulty-detail">平均句长: {{ difficulty.avgSentenceLen }} 字</div>
                                </div>
                            </div>
                            <!-- 关键词 -->
                            <div class="analysis-card">
                                <h4>🔑 关键词提取</h4>
                                <div class="keyword-cloud">
                                    <span v-for="kw in keywords" :key="kw.word" class="keyword-tag" :style="{ fontSize: Math.max(12, kw.count * 4) + 'px' }">{{ kw.word }} ({{ kw.count }})</span>
                                </div>
                            </div>
                            <!-- 词频统计 -->
                            <div class="analysis-card">
                                <h4>📝 词频统计</h4>
                                <div class="word-freq-list">
                                    <div v-for="w in wordFreq" :key="w.word" class="freq-item">
                                        <span>{{ w.word }}</span>
                                        <div class="freq-bar-bg"><div class="freq-bar-fill" :style="{ width: Math.min(100, w.count * 10) + '%' }"></div></div>
                                        <span>{{ w.count }}</span>
                                    </div>
                                </div>
                            </div>
                            <!-- 语法检查 -->
                            <div class="analysis-card" v-if="grammarIssues.length">
                                <h4>⚠️ 语法检查</h4>
                                <div class="grammar-issues">
                                    <div v-for="issue in grammarIssues" :key="issue.message" class="grammar-issue" :class="issue.type">
                                        <span>{{ issue.message }}</span><span class="issue-count">×{{ issue.count }}</span>
                                    </div>
                                </div>
                            </div>
                            <!-- 重复行 -->
                            <div class="analysis-card" v-if="duplicateLines.length">
                                <h4>🔁 重复行检测</h4>
                                <div class="duplicate-list">
                                    <div v-for="d in duplicateLines.slice(0, 10)" :key="d.line" class="duplicate-item">
                                        <span class="dup-line">{{ d.line }}</span>
                                        <span class="dup-info">第{{ d.firstOccurrence }}行、第{{ d.currentLine }}行</span>
                                    </div>
                                </div>
                            </div>
                            <!-- 字符频率 -->
                            <div class="analysis-card">
                                <h4>🔤 字符频率 TOP10</h4>
                                <div class="char-freq-list">
                                    <div v-for="c in charFreq.slice(0, 10)" :key="c.char" class="char-freq-item">
                                        <span class="char">{{ c.char }}</span>
                                        <div class="char-bar-bg"><div class="char-bar-fill" :style="{ width: Math.min(100, c.count * 5) + '%' }"></div></div>
                                        <span>{{ c.count }}</span>
                                    </div>
                                </div>
                            </div>
                            <!-- 句子长度 -->
                            <div class="analysis-card">
                                <h4>📏 句子长度</h4>
                                <div class="sentence-stats">
                                    <div class="stat-item"><span>平均</span><span>{{ sentenceLen.avg }} 字</span></div>
                                    <div class="stat-item"><span>最短</span><span>{{ sentenceLen.min }} 字</span></div>
                                    <div class="stat-item"><span>最长</span><span>{{ sentenceLen.max }} 字</span></div>
                                    <div class="stat-item"><span>总句数</span><span>{{ sentenceLen.total }}</span></div>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    `
};

// 分享卡片弹窗
const ShareCardModalComponent = {
    props: { show: Boolean, cardUrl: String },
    emits: ['close', 'download'],
    template: `
        <div class="modal-overlay" :class="{ show: show }" role="dialog" aria-modal="true" @click.self="$emit('close')">
            <div class="modal" style="max-width:400px">
                <div class="modal-header">
                    <h3>🖼️ 分享卡片</h3>
                    <div class="modal-header-actions">
                        <button class="btn-primary" @click="$emit('download')">下载</button>
                        <button class="btn-icon modal-close" @click="$emit('close')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                </div>
                <div class="modal-body" style="text-align:center">
                    <img v-if="cardUrl" :src="cardUrl" alt="Share Card" style="max-width:100%;border-radius:8px">
                </div>
            </div>
        </div>
    `
};

// 文本对比组件 (v29.0)
const TextDiffComponent = {
    props: { show: Boolean, original: String, transformed: String },
    emits: ['close'],
    methods: {
        escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }
    },
    template: `
        <div class="modal-overlay" :class="{ show: show }" role="dialog" aria-modal="true" @click.self="$emit('close')">
            <div class="modal" style="max-width:800px">
                <div class="modal-header">
                    <h3>📊 文本对比</h3>
                    <button class="btn-icon modal-close" @click="$emit('close')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="diff-view">
                        <div class="diff-panel">
                            <div class="diff-header">原文</div>
                            <pre style="white-space:pre-wrap">{{ escapeHtml(original) }}</pre>
                        </div>
                        <div class="diff-panel">
                            <div class="diff-header">转换后</div>
                            <pre style="white-space:pre-wrap">{{ escapeHtml(transformed) }}</pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};

// 快捷短语面板组件 (v33.0)
const PhrasePanelComponent = {
    props: { show: Boolean, phrases: Array },
    emits: ['close', 'insert'],
    methods: {
        escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }
    },
    template: `
        <div class="modal-overlay" :class="{ show: show }" role="dialog" aria-modal="true" @click.self="$emit('close')">
            <div class="modal" style="max-width:400px">
                <div class="modal-header">
                    <h3>💬 快捷短语</h3>
                    <button class="btn-icon modal-close" @click="$emit('close')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="phrase-panel">
                        <div v-for="p in phrases" :key="p.id" class="phrase-item" @click="$emit('insert', p.text)" :title="p.category">
                            {{ escapeHtml(p.text) }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};

// 设置弹窗组件（AI 模型选择）
const SettingsModalComponent = {
    props: { show: Boolean },
    emits: ['close', 'save'],
    data() {
        return {
            mode: 'local',
            apiKey: '',
            apiEndpoint: 'https://api.openai.com/v1/chat/completions',
            model: 'gpt-4o-mini',
            temperature: 0.7,
            maxTokens: 2000,
            models: [],
        };
    },
    mounted() {
        const config = AIService.getConfig();
        Object.assign(this, config);
        this.models = AIService.getAvailableModels();
        AIService._loadConfig();
        const savedConfig = AIService.getConfig();
        Object.assign(this, savedConfig);
    },
    methods: {
        onSave() {
            AIService.updateConfig({
                mode: this.mode,
                apiKey: this.apiKey,
                apiEndpoint: this.apiEndpoint,
                model: this.model,
                temperature: this.temperature,
                maxTokens: this.maxTokens,
            });
            this.$emit('save');
            this.$emit('close');
        }
    },
    template: `
        <div class="modal-overlay" :class="{ show: show }" role="dialog" aria-modal="true" @click.self="$emit('close')">
            <div class="modal settings-modal">
                <div class="modal-header">
                    <h3>⚙️ AI 模型设置</h3>
                    <button class="btn-icon modal-close" aria-label="关闭" @click="$emit('close')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="modal-body settings-body">
                    <div class="settings-section">
                        <h4>运行模式</h4>
                        <div class="mode-selector">
                            <label class="mode-option" :class="{ active: mode === 'local' }">
                                <input type="radio" v-model="mode" value="local">
                                <span class="mode-radio"></span>
                                <span class="mode-label">本地模式</span>
                                <span class="mode-desc">使用内置规则引擎，无需 API</span>
                            </label>
                            <label class="mode-option" :class="{ active: mode === 'api' }">
                                <input type="radio" v-model="mode" value="api">
                                <span class="mode-radio"></span>
                                <span class="mode-label">API 模式</span>
                                <span class="mode-desc">调用大模型 API，支持多种模型</span>
                            </label>
                        </div>
                    </div>
                    <template v-if="mode === 'api'">
                        <div class="settings-section">
                            <h4>选择模型</h4>
                            <select v-model="model" class="model-select">
                                <option v-for="m in models" :key="m.id" :value="m.id">
                                    {{ m.icon }} {{ m.name }} ({{ m.provider }})
                                </option>
                            </select>
                        </div>
                        <div class="settings-section">
                            <h4>API 配置</h4>
                            <div class="form-group">
                                <label>API Key</label>
                                <input type="password" v-model="apiKey" placeholder="sk-..." class="form-input">
                            </div>
                            <div class="form-group">
                                <label>API Endpoint</label>
                                <input type="text" v-model="apiEndpoint" placeholder="https://api.openai.com/v1/chat/completions" class="form-input">
                            </div>
                        </div>
                        <div class="settings-section">
                            <h4>生成参数</h4>
                            <div class="form-group">
                                <label>Temperature: {{ temperature }}</label>
                                <input type="range" v-model.number="temperature" min="0" max="2" step="0.1" class="range-input">
                            </div>
                            <div class="form-group">
                                <label>Max Tokens: {{ maxTokens }}</label>
                                <input type="range" v-model.number="maxTokens" min="256" max="4096" step="256" class="range-input">
                            </div>
                        </div>
                    </template>
                    <div class="settings-footer">
                        <button class="btn-secondary" @click="$emit('close')">取消</button>
                        <button class="btn-primary" @click="onSave">保存</button>
                    </div>
                </div>
            </div>
        </div>
    `
};

// ==================== v103.0: 漂流瓶组件 ====================
const BottlePageComponent = {
    props: { show: Boolean, editorContent: String, currentStyle: String, currentStyleName: String },
    emits: ['close', 'throw-success'],
    data() {
        return {
            activeView: 'main', // main | throw | pick | my-bottles | stats | travel | notifications
            currentSea: 'all',
            throwContent: '',
            throwStyle: 'glass',
            isPicking: false,
            pickPhase: 'idle', // idle | casting | waiting | pulling | rising | opened
            pickedBottle: null,
            showPicked: false,
            replyText: '',
            showThrowSuccess: false,
            throwPhase: 'idle', // idle | throwing | flying | splashing | done
            floatingBottles: [],
            stars: [],
            fireflies: [],
            seagulls: [],
            isDaytime: true,
            searchQuery: '',
            selectedBottleTravel: null,
        };
    },
    computed: {
        seaTypes() {
            return typeof BottleService !== 'undefined' ? BottleService.seaTypes : {};
        },
        bottleStyles() {
            return typeof BottleService !== 'undefined' ? BottleService.bottleStyles : [];
        },
        stats() {
            return typeof BottleService !== 'undefined' ? BottleService.getStats() : {};
        },
        myBottles() {
            return typeof BottleService !== 'undefined' ? BottleService.getMyBottles() : [];
        },
        pickedBottleStyle() {
            if (!this.pickedBottle) return {};
            const style = this.bottleStyles.find(s => s.key === this.pickedBottle.bottleStyle);
            return style || this.bottleStyles[0];
        },
        favorites() {
            return typeof BottleService !== 'undefined' ? BottleService.getFavorites() : [];
        },
        isPickedFavorite() {
            if (!this.pickedBottle) return false;
            return typeof BottleService !== 'undefined' ? BottleService.isFavorite(this.pickedBottle.id) : false;
        },
        travelRecords() {
            return typeof BottleService !== 'undefined' ? BottleService.getTravelRecords() : [];
        },
        notifications() {
            return typeof BottleService !== 'undefined' ? BottleService.getNotifications() : [];
        },
        unreadNotificationCount() {
            return typeof BottleService !== 'undefined' ? BottleService.getUnreadNotificationCount() : 0;
        },
        filteredMyBottles() {
            if (!this.searchQuery.trim()) return this.myBottles;
            const q = this.searchQuery.toLowerCase();
            return this.myBottles.filter(b =>
                (b.content || '').toLowerCase().includes(q) ||
                (b.styleName || '').toLowerCase().includes(q) ||
                (b.thrower || '').toLowerCase().includes(q)
            );
        },
        selectedBottleTravelHistory() {
            if (!this.selectedBottleTravel) return [];
            return typeof BottleService !== 'undefined' ? BottleService.getBottleTravel(this.selectedBottleTravel) : [];
        },
    },
    watch: {
        show(val) {
            if (val) {
                this.generateStars();
                this.generateFloatingBottles();
                this.generateFireflies();
                this.generateSeagulls();
                this.updateDaytime();
            }
        },
    },
    methods: {
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
        formatDate(iso) {
            if (!iso) return '';
            const d = new Date(iso);
            return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
        },
        updateDaytime() {
            const hour = new Date().getHours();
            this.isDaytime = hour >= 6 && hour < 18;
        },
        generateStars() {
            this.stars = Array.from({ length: 120 }, () => ({
                left: Math.random() * 100 + '%',
                top: (Math.random() * 55) + '%',
                delay: Math.random() * 3 + 's',
                duration: (2 + Math.random() * 4) + 's',
                size: Math.random() * 2 + 1 + 'px',
                bright: Math.random() > 0.85,
            }));
        },
        generateFireflies() {
            this.fireflies = Array.from({ length: 15 }, () => ({
                left: Math.random() * 100 + '%',
                top: (30 + Math.random() * 40) + '%',
                delay: Math.random() * 5 + 's',
                duration: (3 + Math.random() * 4) + 's',
                size: Math.random() * 4 + 2 + 'px',
            }));
        },
        generateSeagulls() {
            this.seagulls = Array.from({ length: 3 }, (_, i) => ({
                top: (10 + i * 8 + Math.random() * 5) + '%',
                delay: (i * 3 + Math.random() * 2) + 's',
                duration: (15 + Math.random() * 10) + 's',
            }));
        },
        generateFloatingBottles() {
            const allBottles = typeof BottleService !== 'undefined' ? BottleService.getAllBottles() : [];
            const bottleEmojis = { glass: '🫙', bamboo: '🎋', shell: '🐚', crystal: '💎' };
            this.floatingBottles = allBottles.slice(0, 8).map((b, i) => ({
                ...b,
                emoji: bottleEmojis[b.bottleStyle] || '🫙',
                left: (5 + Math.random() * 90) + '%',
                bottom: (5 + Math.random() * 25) + '%',
                delay: (Math.random() * 6) + 's',
                duration: (4 + Math.random() * 4) + 's',
            }));
        },
        openThrowForm() {
            this.activeView = 'throw';
            this.throwContent = this.editorContent || '';
        },
        async submitBottle() {
            if (!this.throwContent.trim()) return;
            this.throwPhase = 'throwing';
            setTimeout(() => { this.throwPhase = 'flying'; }, 500);
            setTimeout(() => { this.throwPhase = 'splashing'; }, 1500);
            setTimeout(async () => {
                this.throwPhase = 'done';
                const sentiment = typeof ExportService !== 'undefined' ? ExportService.analyzeSentiment(this.throwContent) : { label: '中性', score: 0 };
                const result = await BottleService.throwBottle({
                    content: this.throwContent,
                    styleName: this.currentStyleName || '自定义',
                    styleKey: this.currentStyle || '',
                    bottleStyle: this.throwStyle,
                    sentiment,
                });
                if (result.success) {
                    setTimeout(() => {
                        this.throwPhase = 'idle';
                        this.showThrowSuccess = true;
                        setTimeout(() => {
                            this.showThrowSuccess = false;
                            this.activeView = 'main';
                            this.throwContent = '';
                            this.generateFloatingBottles();
                            this.$emit('throw-success');
                        }, 1500);
                    }, 500);
                }
            }, 2500);
        },
        async pickBottle() {
            if (this.isPicking) return;
            this.isPicking = true;
            this.pickPhase = 'casting';
            await this._delay(800);
            if (!this.isPicking) return;
            this.pickPhase = 'waiting';
            await this._delay(1200);
            if (!this.isPicking) return;
            this.pickPhase = 'pulling';
            await this._delay(1500);
            if (!this.isPicking) return;
            this.pickPhase = 'rising';
            const result = await BottleService.pickBottle(true, this.currentSea);
            if (!result.success) {
                this.isPicking = false;
                this.pickPhase = 'idle';
                this.$emit('close');
                setTimeout(() => alert(result.error), 100);
                return;
            }
            this.pickedBottle = result.bottle;
            await this._delay(1000);
            if (!this.isPicking) return;
            this.pickPhase = 'opened';
            this.isPicking = false;
            this.showPicked = true;
        },
        async smartPickBottle() {
            if (this.isPicking) return;
            this.isPicking = true;
            this.pickPhase = 'casting';
            await this._delay(800);
            if (!this.isPicking) return;
            this.pickPhase = 'waiting';
            await this._delay(1200);
            if (!this.isPicking) return;
            this.pickPhase = 'pulling';
            await this._delay(1500);
            if (!this.isPicking) return;
            this.pickPhase = 'rising';
            const result = await BottleService.smartPickBottle(true, this.currentSea);
            if (!result.success) {
                this.isPicking = false;
                this.pickPhase = 'idle';
                this.$emit('close');
                setTimeout(() => alert(result.error), 100);
                return;
            }
            this.pickedBottle = result.bottle;
            this.pickedBottle.matchScore = result.matchScore;
            await this._delay(1000);
            if (!this.isPicking) return;
            this.pickPhase = 'opened';
            this.isPicking = false;
            this.showPicked = true;
        },
        _delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },
        async likeBottle() {
            if (!this.pickedBottle) return;
            const result = await BottleService.likeBottle(this.pickedBottle.id);
            if (result.success) {
                this.pickedBottle.likes = result.likes;
            }
        },
        async replyBottle() {
            if (!this.pickedBottle || !this.replyText.trim()) return;
            const result = await BottleService.replyBottle(this.pickedBottle.id, this.replyText);
            if (result.success) {
                this.pickedBottle.replies = result.replies;
                this.replyText = '';
            }
        },
        async deleteBottle(id) {
            if (!confirm('确定要删除这个瓶子吗？此操作不可恢复。')) return;
            await BottleService.deleteMyBottle(id);
            this.generateFloatingBottles();
        },
        closePicked() {
            this.showPicked = false;
            this.pickedBottle = null;
            this.replyText = '';
            this.pickPhase = 'idle';
        },
        toggleFavorite() {
            if (!this.pickedBottle) return;
            if (this.isPickedFavorite) {
                BottleService.unfavoriteBottle(this.pickedBottle.id);
            } else {
                BottleService.favoriteBottle(this.pickedBottle);
            }
        },
        shareBottle() {
            if (!this.pickedBottle) return;
            const shareText = BottleService.generateShareText(this.pickedBottle);
            if (navigator.clipboard) {
                navigator.clipboard.writeText(shareText).then(() => {
                    this.$emit('throw-success');
                }).catch(() => {
                    this.fallbackCopy(shareText);
                });
            } else {
                this.fallbackCopy(shareText);
            }
        },
        fallbackCopy(text) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            this.$emit('throw-success');
        },
        viewBottleTravel(bottleId) {
            this.selectedBottleTravel = bottleId;
            this.activeView = 'travel';
        },
        closeTravel() {
            this.selectedBottleTravel = null;
            this.activeView = 'my-bottles';
        },
        getTravelEventLabel(eventType) {
            const labels = {
                thrown: '🍾 扔出',
                picked: '🎣 被捞起',
                smart_picked: '✨ 智能匹配捞起',
                liked: '❤️ 被点赞',
                replied: '💬 被回复',
            };
            return labels[eventType] || eventType;
        },
        markAllNotificationsRead() {
            BottleService.markAllNotificationsRead();
        },
    },
    template: `
        <div class="bottle-page" v-if="show">
            <!-- 海洋场景 -->
            <div class="ocean-scene">
                <!-- 星空 -->
                <div class="stars">
                    <div class="star" v-for="(star, i) in stars" :key="i"
                         :class="{ bright: star.bright }"
                         :style="{ left: star.left, top: star.top, animationDelay: star.delay, animationDuration: star.duration, width: star.size, height: star.size }">
                    </div>
                </div>
                <!-- 月亮 -->
                <div class="moon"></div>
                <!-- 月光水面倒影 -->
                <div class="moon-reflection"></div>
                <!-- 波浪 -->
                <div class="waves">
                    <div class="wave"></div>
                    <div class="wave"></div>
                    <div class="wave"></div>
                </div>
                <!-- 漂浮的瓶子 -->
                <div class="floating-bottles">
                    <div class="floating-bottle" v-for="(bottle, i) in floatingBottles" :key="bottle.id || i"
                         :style="{ left: bottle.left, bottom: bottle.bottom, animationDelay: bottle.delay, animationDuration: bottle.duration }"
                         :title="bottle.styleName" @click="pickBottle">
                        {{ bottle.emoji }}
                    </div>
                </div>
                <!-- 萤火虫 -->
                <div class="fireflies">
                    <div class="firefly" v-for="(ff, i) in fireflies" :key="'ff'+i"
                         :style="{ left: ff.left, top: ff.top, animationDelay: ff.delay, animationDuration: ff.duration, width: ff.size, height: ff.size }">
                    </div>
                </div>
                <!-- 海鸥 -->
                <div class="seagulls">
                    <div class="seagull" v-for="(sg, i) in seagulls" :key="'sg'+i"
                         :style="{ top: sg.top, animationDelay: sg.delay, animationDuration: sg.duration }">
                        
                    </div>
                </div>
            </div>

            <!-- 操作面板 -->
            <div class="bottle-panel">
                <button class="bottle-close-btn" @click="$emit('close')" title="关闭 (Esc)">
                    ✕ 关闭
                </button>

                <!-- 主视图 -->
                <div v-if="activeView === 'main'">
                    <div class="bottle-stats-panel">
                        <div class="stat-card">
                            <div class="stat-number">{{ stats.totalBottles || 0 }}</div>
                            <div class="stat-label">海里瓶子</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">{{ stats.myBottles || 0 }}</div>
                            <div class="stat-label">我的瓶子</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">{{ stats.totalPicks || 0 }}</div>
                            <div class="stat-label">被捞次数</div>
                        </div>
                    </div>

                    <div class="bottle-actions">
                        <button class="bottle-action-btn" @click="openThrowForm">
                            <span class="action-icon">🍾</span>
                            <span class="action-label">扔一个</span>
                            <span class="action-desc">写下你的心情</span>
                        </button>
                        <button class="bottle-action-btn" @click="pickBottle">
                            <span class="action-icon">🎣</span>
                            <span class="action-label">捞一个</span>
                            <span class="action-desc">遇见未知的惊喜</span>
                        </button>
                        <button class="bottle-action-btn" @click="smartPickBottle">
                            <span class="action-icon sparkle">✨</span>
                            <span class="action-label">智能捞</span>
                            <span class="action-desc">情感匹配推荐</span>
                        </button>
                        <button class="bottle-action-btn" @click="activeView = 'my-bottles'">
                            <span class="action-icon">📦</span>
                            <span class="action-label">我的瓶子</span>
                            <span class="action-desc">查看扔出的瓶子</span>
                        </button>
                        <button class="bottle-action-btn" @click="activeView = 'notifications'">
                            <span class="action-icon">🔔</span>
                            <span class="action-label">通知</span>
                            <span class="action-desc">{{ unreadNotificationCount > 0 ? unreadNotificationCount + '条未读' : '暂无新通知' }}</span>
                        </button>
                        <button class="bottle-action-btn" @click="activeView = 'stats'">
                            <span class="action-icon">📊</span>
                            <span class="action-label">统计</span>
                            <span class="action-desc">查看数据统计</span>
                        </button>
                    </div>

                    <!-- 海域切换 -->
                    <div class="sea-tabs">
                        <button class="sea-tab" v-for="(sea, key) in seaTypes" :key="key"
                                :class="{ active: currentSea === key }" @click="currentSea = key">
                            <span class="sea-tab-emoji">{{ sea.emoji }}</span>
                            <span>{{ sea.name }}</span>
                        </button>
                    </div>
                </div>

                <!-- 扔瓶子表单 -->
                <div v-if="activeView === 'throw'">
                    <h3 style="margin: 0 0 16px; font-size: 18px; color: var(--color-primary-dark);">🍾 扔一个漂流瓶</h3>
                    <div class="throw-bottle-form">
                        <div class="form-group">
                            <label>瓶中信</label>
                            <textarea v-model="throwContent" rows="4" placeholder="写下你想说的话..."></textarea>
                        </div>
                        <div class="form-group">
                            <label>选择瓶子样式</label>
                            <div class="bottle-style-selector">
                                <div class="bottle-style-option" v-for="style in bottleStyles" :key="style.key"
                                     :class="{ selected: throwStyle === style.key }" @click="throwStyle = style.key">
                                    <span class="style-icon">{{ style.icon }}</span>
                                    <span class="style-name">{{ style.name }}</span>
                                </div>
                            </div>
                        </div>
                        <button class="submit-bottle-btn" @click="submitBottle" :disabled="!throwContent.trim()">
                            扔进大海 🌊
                        </button>
                        <button class="bottle-action-btn" style="flex: none; padding: 8px;" @click="activeView = 'main'">
                            返回
                        </button>
                    </div>
                </div>

                <!-- 我的瓶子列表 -->
                <div v-if="activeView === 'my-bottles'">
                    <h3 style="margin: 0 0 16px; font-size: 18px; color: var(--color-primary-dark);"> 我的瓶子</h3>
                    <div class="search-bar" style="margin-bottom: 12px;">
                        <input type="text" v-model="searchQuery" placeholder="🔍 搜索瓶子内容、风格或发送者..." class="bottle-search-input" />
                    </div>
                    <div class="my-bottles-list" v-if="filteredMyBottles.length > 0">
                        <div class="my-bottle-item" v-for="bottle in filteredMyBottles" :key="bottle.id">
                            <span class="my-bottle-icon">{{ bottleStyles.find(s => s.key === bottle.bottleStyle)?.icon || '🫙' }}</span>
                            <div class="my-bottle-content">
                                <p>{{ escapeHtml(bottle.content) }}</p>
                                <div class="my-bottle-stats">
                                    <span>👍 {{ bottle.likes || 0 }}</span>
                                    <span>👁 {{ bottle.pickCount || 0 }}</span>
                                    <span>💬 {{ bottle.replies ? bottle.replies.length : 0 }}</span>
                                    <span>{{ formatDate(bottle.throwTime) }}</span>
                                </div>
                            </div>
                            <div class="my-bottle-actions">
                                <button class="my-bottle-action" @click="viewBottleTravel(bottle.id)" title="旅行记录">🗺️</button>
                                <button class="my-bottle-action delete" @click="deleteBottle(bottle.id)">删除</button>
                            </div>
                        </div>
                    </div>
                    <div v-else style="text-align: center; padding: 40px; color: var(--color-text-muted);">
                        {{ searchQuery ? '没有找到匹配的瓶子' : '还没有扔过瓶子，去扔一个吧！' }}
                    </div>
                    <button class="bottle-action-btn" style="flex: none; padding: 8px; margin-top: 12px;" @click="activeView = 'main'">
                        返回
                    </button>
                </div>

                <!-- 旅行记录视图 -->
                <div v-if="activeView === 'travel'">
                    <h3 style="margin: 0 0 16px; font-size: 18px; color: var(--color-primary-dark);">️ 瓶子旅行记录</h3>
                    <div class="travel-timeline" v-if="selectedBottleTravelHistory.length > 0">
                        <div class="travel-event" v-for="(record, i) in selectedBottleTravelHistory" :key="record.id">
                            <div class="travel-dot"></div>
                            <div class="travel-content">
                                <div class="travel-label">{{ getTravelEventLabel(record.eventType) }}</div>
                                <div class="travel-meta">
                                    <span>{{ record.actor }}</span>
                                    <span>{{ formatDate(record.timestamp) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else style="text-align: center; padding: 40px; color: var(--color-text-muted);">
                        暂无旅行记录
                    </div>
                    <button class="bottle-action-btn" style="flex: none; padding: 8px; margin-top: 12px;" @click="closeTravel">
                        返回
                    </button>
                </div>

                <!-- 通知视图 -->
                <div v-if="activeView === 'notifications'">
                    <h3 style="margin: 0 0 16px; font-size: 18px; color: var(--color-primary-dark);"> 通知中心</h3>
                    <div class="notification-list" v-if="notifications.length > 0">
                        <div class="notification-item" v-for="notif in notifications" :key="notif.id"
                             :class="{ unread: !notif.read }" @click="BottleService.markNotificationRead(notif.id)">
                            <div class="notification-icon">{{ notif.type === 'like' ? '❤️' : notif.type === 'reply' ? '💬' : '🔔' }}</div>
                            <div class="notification-content">
                                <p>{{ notif.message }}</p>
                                <span class="notification-time">{{ formatDate(notif.timestamp) }}</span>
                            </div>
                        </div>
                    </div>
                    <div v-else style="text-align: center; padding: 40px; color: var(--color-text-muted);">
                        暂无通知
                    </div>
                    <button class="bottle-action-btn" style="flex: none; padding: 8px; margin-top: 12px;" @click="activeView = 'main'">
                        返回
                    </button>
                </div>

                <!-- 统计视图 -->
                <div v-if="activeView === 'stats'">
                    <h3 style="margin: 0 0 16px; font-size: 18px; color: var(--color-primary-dark);"> 数据统计</h3>
                    <div class="stats-detail">
                        <div class="stat-detail-item">
                            <span class="stat-detail-label">海里瓶子总数</span>
                            <span class="stat-detail-value">{{ stats.totalBottles || 0 }}</span>
                        </div>
                        <div class="stat-detail-item">
                            <span class="stat-detail-label">我的瓶子</span>
                            <span class="stat-detail-value">{{ stats.myBottles || 0 }}</span>
                        </div>
                        <div class="stat-detail-item">
                            <span class="stat-detail-label">总被捞次数</span>
                            <span class="stat-detail-value">{{ stats.totalPicks || 0 }}</span>
                        </div>
                        <div class="stat-detail-item">
                            <span class="stat-detail-label">总点赞数</span>
                            <span class="stat-detail-value">{{ stats.totalLikes || 0 }}</span>
                        </div>
                        <div class="stat-detail-item">
                            <span class="stat-detail-label">总回复数</span>
                            <span class="stat-detail-value">{{ stats.totalReplies || 0 }}</span>
                        </div>
                        <div class="stat-detail-item" v-if="stats.seaDistribution">
                            <span class="stat-detail-label">海域分布</span>
                            <div class="sea-dist">
                                <span v-for="(count, sea) in stats.seaDistribution" :key="sea" class="sea-dist-item">
                                    {{ seaTypes[sea]?.emoji || '' }} {{ count }}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button class="bottle-action-btn" style="flex: none; padding: 8px; margin-top: 12px;" @click="activeView = 'main'">
                        返回
                    </button>
                </div>
            </div>

            <!-- 捞瓶子多阶段动画 -->
            <div class="pick-bottle-animation" v-if="isPicking">
                <div class="pick-bottle-scene">
                    <!-- 抛竿阶段 -->
                    <div class="pick-phase" v-if="pickPhase === 'casting'">
                        <div class="pick-icon">🎣</div>
                        <div class="pick-text">抛竿入海...</div>
                    </div>
                    <!-- 等待阶段 -->
                    <div class="pick-phase" v-if="pickPhase === 'waiting'">
                        <div class="pick-icon">⏳</div>
                        <div class="pick-text">静静等待...</div>
                        <div class="waiting-dots">
                            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                        </div>
                    </div>
                    <!-- 拉线阶段 -->
                    <div class="pick-phase" v-if="pickPhase === 'pulling'">
                        <div class="pick-icon pulling">🎣</div>
                        <div class="pick-text">有东西上钩了！</div>
                    </div>
                    <!-- 升起阶段 -->
                    <div class="pick-phase" v-if="pickPhase === 'rising'">
                        <div class="rising-bottle">{{ pickedBottle ? bottleStyles.find(s => s.key === pickedBottle.bottleStyle)?.icon || '🫙' : '🫙' }}</div>
                        <div class="pick-text">瓶子浮出水面...</div>
                    </div>
                </div>
            </div>

            <!-- 展示捞到的瓶子 -->
            <div class="picked-bottle-display" v-if="showPicked && pickedBottle" @click.self="closePicked">
                <div class="picked-bottle-card">
                    <button class="bottle-close-btn" @click="closePicked" style="position: absolute; top: 12px; right: 12px;">✕</button>
                    <div class="picked-bottle-header">
                        <span class="picked-bottle-icon">{{ pickedBottleStyle.icon }}</span>
                        <div class="picked-bottle-info">
                            <h3>{{ escapeHtml(pickedBottle.styleName) }}</h3>
                            <div class="thrower">来自 {{ escapeHtml(pickedBottle.thrower) }} · {{ formatDate(pickedBottle.throwTime) }}</div>
                        </div>
                    </div>
                    <div class="picked-bottle-content">{{ escapeHtml(pickedBottle.content) }}</div>
                    <div class="picked-bottle-meta">
                        <span class="meta-tag"> {{ seaTypes[pickedBottle.seaType]?.name || '未知海域' }}</span>
                        <span class="meta-tag">💭 {{ pickedBottle.sentiment?.label || '中性' }}</span>
                        <span class="meta-tag">👍 {{ pickedBottle.likes || 0 }}</span>
                        <span class="meta-tag">👁 {{ pickedBottle.pickCount || 0 }}</span>
                        <span class="meta-tag" v-if="pickedBottle.matchScore">✨ 匹配度 {{ Math.round(pickedBottle.matchScore * 100) }}%</span>
                    </div>
                    <div class="picked-bottle-actions">
                        <button class="picked-action-btn" @click="likeBottle">👍 点赞</button>
                        <button class="picked-action-btn" :class="{ favorited: isPickedFavorite }" @click="toggleFavorite">{{ isPickedFavorite ? '❤️ 已收藏' : '🤍 收藏' }}</button>
                        <button class="picked-action-btn" @click="shareBottle">📤 分享</button>
                        <button class="picked-action-btn primary" @click="pickBottle"> 再捞一个</button>
                    </div>
                    <!-- 回复区域 -->
                    <div v-if="pickedBottle.replies && pickedBottle.replies.length > 0" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-border);">
                        <div v-for="reply in pickedBottle.replies" :key="reply.id" style="margin-bottom: 8px; font-size: 13px;">
                            <strong>{{ escapeHtml(reply.replier) }}</strong>
                            <span style="color: var(--color-text-muted); margin: 0 4px;">{{ formatDate(reply.replyTime) }}</span>
                            <p style="margin: 4px 0 0; color: var(--color-text-light);">{{ escapeHtml(reply.content) }}</p>
                        </div>
                    </div>
                    <div class="reply-input-group">
                        <input v-model="replyText" placeholder="回复这个瓶子..." @keyup.enter="replyBottle" />
                        <button class="reply-submit-btn" @click="replyBottle">回复</button>
                    </div>
                </div>
            </div>

            <!-- 扔瓶子动画 -->
            <div class="throw-bottle-animation" v-if="throwPhase !== 'idle'">
                <div class="throw-scene">
                    <!-- 投掷阶段 -->
                    <div class="throw-phase" v-if="throwPhase === 'throwing'">
                        <div class="throw-icon">🍾</div>
                        <div class="throw-text">用力扔出！</div>
                    </div>
                    <!-- 飞行阶段 -->
                    <div class="throw-phase" v-if="throwPhase === 'flying'">
                        <div class="flying-bottle">{{ bottleStyles.find(s => s.key === throwStyle)?.icon || '🫙' }}</div>
                        <div class="throw-text">瓶子在空中飞翔...</div>
                    </div>
                    <!-- 入水阶段 -->
                    <div class="throw-phase" v-if="throwPhase === 'splashing'">
                        <div class="splash-effect">💦</div>
                        <div class="throw-text">扑通！瓶子入水啦~</div>
                    </div>
                    <!-- 完成阶段 -->
                    <div class="throw-phase" v-if="throwPhase === 'done'">
                        <div class="throw-icon">✨</div>
                        <div class="throw-text">瓶子已经漂远啦~</div>
                    </div>
                </div>
            </div>

            <!-- 扔瓶子成功动画 -->
            <div class="throw-success" v-if="showThrowSuccess">
                <div class="throw-success-content">
                    <div class="throw-success-icon">🍾</div>
                    <div class="throw-success-text">瓶子已经漂远啦~</div>
                    <button class="bottle-action-btn" style="margin-top: 16px; padding: 10px 24px;" @click="$emit('close')">返回主界面</button>
                </div>
            </div>

            <!-- 底部关闭栏 -->
            <div class="bottle-bottom-bar">
                <button class="bottle-bottom-close" @click="$emit('close')">← 返回</button>
            </div>
        </div>
    `
};

// ==================== 主 Vue 应用 ====================
const { createApp, ref, computed, watch, onMounted, onUnmounted } = Vue;

const app = createApp({
    components: {
        'sidebar': SidebarComponent,
        'editor-panel': EditorPanelComponent,
        'preview-panel': PreviewPanelComponent,
        'link-modal': LinkModalComponent,
        'template-modal': TemplateModalComponent,
        'history-modal': HistoryModalComponent,
        'user-modal': UserModalComponent,
        'doc-manager': DocManagerComponent,
        'settings-modal': SettingsModalComponent,
        'envelope': EnvelopeComponent,
        'toast': ToastComponent,
        'shortcuts-modal': ShortcutsModalComponent,
        'version-history-modal': VersionHistoryModalComponent,
        'find-replace-bar': FindReplaceBarComponent,
        'reading-mode': ReadingModeComponent,
        'qr-code-modal': QRCodeModalComponent,
        'share-card-modal': ShareCardModalComponent,
        'text-diff': TextDiffComponent,
        'phrase-panel': PhrasePanelComponent,
        'tools-modal': ToolsModalComponent,
        'text-analysis-panel': TextAnalysisPanelComponent,
        'bottle-page': BottlePageComponent,
    },
    setup() {
        // ===== 状态管理 =====
        const store = window.StateStore;
        store.init();
        const state = store.getState();

        // Vue 响应式状态
        const content = ref(state.editor.content);
        const currentStyle = ref(state.transformer.currentStyle);
        const currentTransformed = ref(state.transformer.currentTransformed);
        const currentOriginal = ref(state.transformer.currentOriginal);
        const myLetters = ref(state.history);
        const userName = ref(state.user.name || '');

        // UI 状态
        const showLinkModal = ref(false);
        const showTemplateModal = ref(false);
        const showHistoryModal = ref(false);
        const showUserModal = ref(false);
        const showSettingsModal = ref(false);
        const showToast = ref(false);
        const toastMessage = ref('');
        const toastType = ref('info');
        const generatedLink = ref('');
        const autoSaveStatus = ref('');
        const autoSaveStatusShow = ref(false);

        // 侧边栏状态
        const activeNav = ref('editor'); // editor | history | templates | settings
        const sidebarCollapsed = ref(false);

        // 文档管理状态
        const documents = computed(() => store.get('documents') || []);
        const currentDocId = computed(() => store.get('editor.currentDocId'));
        const currentDoc = computed(() => {
            const docs = documents.value;
            const id = currentDocId.value;
            return docs.find(d => d.id === id) || null;
        });
        const showDocManager = ref(false);

        // 收藏夹
        const favorites = computed(() => store.get('favorites') || []);

        // 信封动画状态
        const showEnvelope = ref(false);
        const envelopePhase = ref(0);
        let envelopeTimer = null;

        // AI 处理相关状态
        const processingMode = ref('style');
        const platformMode = ref('text-gen');
        const currentAITask = ref('');
        const aiProcessing = ref(false);

        // 语音相关状态
        const isListening = ref(false);
        const isReading = ref(false);
        let recognition = null;
        let speechSynth = null;

        // 暗色主题状态
        const isDarkTheme = ref(localStorage.getItem('textcraft_dark_theme') === 'true');

        // Timers
        let autoSaveTimer = null;
        let toastTimer = null;
        let statusTimer = null;

        // ===== v21-v53: 新增状态 =====
        // v21.0: 快捷键面板
        const showShortcuts = ref(false);
        // v23.0: 阅读模式
        const isReadingMode = ref(false);
        // v24.0: 全屏专注
        const isFocusMode = ref(false);
        // v26.0: 撤销/重做
        const canUndo = computed(() => store.getState().undoStack.length > 1);
        const canRedo = computed(() => store.getState().redoStack.length > 0);
        // v29.0: 文本对比
        const showDiff = ref(false);
        // v30.0: 版本历史
        const showVersions = ref(false);
        const versions = computed(() => store.getState().versions || []);
        // v33.0: 快捷短语
        const showPhrasePanel = ref(false);
        const phrases = computed(() => store.getState().phrases || []);
        // v45.0: 字体大小
        const editorFontSize = computed(() => store.getState().settings.editorFontSize || 18);
        // v46.0: 行距
        const lineHeight = computed(() => store.getState().settings.lineHeight || 2);
        // v47.0: 段落缩进
        const textIndent = computed(() => store.getState().settings.textIndent || 0);
        // v48.0: 文本对齐
        const textAlign = computed(() => store.getState().settings.textAlign || 'left');
        // v49.0: 查找替换
        const showFindReplace = ref(false);
        // v52.0: 水印
        const showWatermark = computed(() => store.getState().settings.watermark?.enabled || false);
        // v39.0: 分享卡片
        const showShareCard = ref(false);
        const shareCardUrl = ref('');
        // v40.0: 二维码
        const showQRCode = ref(false);
        const qrUrl = ref('');

        // v54-v100: 工具箱 & 分析面板
        const showToolsModal = ref(false);
        const showAnalysisPanel = ref(false);

        // v103.0: 漂流瓶
        const showBottlePage = ref(false);

        // ===== 计算属性 =====
        const styles = computed(() => {
            if (typeof TransformerService !== 'undefined') {
                return TransformerService.getAvailableStyles();
            }
            if (typeof getAllStyles !== 'undefined') return getAllStyles();
            return [];
        });

        const wordCount = computed(() => content.value.replace(/\s/g, '').length);

        const wordCountStatus = computed(() => {
            const count = wordCount.value;
            if (count > 4500) return 'error';
            if (count > 3000) return 'warn';
            return '';
        });

        // 用户登录状态
        const isLoggedIn = computed(() => !!userName.value);

        // AI 任务列表
        const aiTasks = computed(() => {
            if (typeof AIService !== 'undefined') {
                return AIService.getAvailableTasks();
            }
            return [];
        });

        // ===== 工具方法 =====
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function copyToClipboard(text) {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
            } else {
                fallbackCopy(text);
            }
        }

        function fallbackCopy(text) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            try { document.execCommand('copy'); } catch (e) { showToastMsg('复制失败', 'error'); }
            document.body.removeChild(textarea);
        }

        function showToastMsg(message, type = 'info') {
            toastMessage.value = message;
            toastType.value = type;
            showToast.value = true;
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => { showToast.value = false; }, 2500);
        }

        function showAutoSaveStatusFn(msg) {
            autoSaveStatus.value = msg;
            autoSaveStatusShow.value = true;
            clearTimeout(statusTimer);
            statusTimer = setTimeout(() => { autoSaveStatusShow.value = false; }, 2000);
        }

        // ===== 语音输入 (Web Speech API) =====
        function onVoiceInput() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                showToastMsg('当前浏览器不支持语音输入', 'error');
                return;
            }

            if (isListening.value) {
                // 停止监听
                if (recognition) { try { recognition.stop(); } catch (e) { } }
                isListening.value = false;
                return;
            }

            try {
                recognition = new SpeechRecognition();
                recognition.lang = 'zh-CN';
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.maxAlternatives = 1;

                recognition.onresult = (event) => {
                    let transcript = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        transcript += event.results[i][0].transcript;
                    }
                    if (transcript) {
                        content.value = (content.value + transcript).trim();
                    }
                };

                recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    isListening.value = false;
                    if (event.error !== 'no-speech') {
                        showToastMsg('语音识别错误: ' + event.error, 'error');
                    }
                };

                recognition.onend = () => {
                    isListening.value = false;
                };

                recognition.start();
                isListening.value = true;
                showToastMsg('语音输入已启动，请说话...', 'success');
            } catch (e) {
                console.error('Speech recognition failed:', e);
                showToastMsg('语音识别启动失败', 'error');
            }
        }

        // ===== 文本朗读 (Web Speech API) =====
        function onReadAloud() {
            if (!currentTransformed.value) {
                showToastMsg('没有可朗读的内容', 'warning');
                return;
            }

            if (isReading.value) {
                // 停止朗读
                window.speechSynthesis && window.speechSynthesis.cancel();
                isReading.value = false;
                return;
            }

            try {
                speechSynth = new SpeechSynthesisUtterance(currentTransformed.value);
                speechSynth.lang = 'zh-CN';
                speechSynth.rate = 1.0;
                speechSynth.pitch = 1.0;

                speechSynth.onend = () => { isReading.value = false; };
                speechSynth.onerror = () => {
                    isReading.value = false;
                    showToastMsg('朗读出错', 'error');
                };

                window.speechSynthesis.speak(speechSynth);
                isReading.value = true;
                showToastMsg('正在朗读...', 'success');
            } catch (e) {
                console.error('Speech synthesis failed:', e);
                showToastMsg('朗读启动失败', 'error');
            }
        }

        // ===== AI 打字机流式效果 =====
        function typewriterEffect(text, delay = 30) {
            return new Promise((resolve) => {
                let index = 0;
                currentTransformed.value = '';

                function type() {
                    if (index < text.length) {
                        currentTransformed.value += text[index];
                        index++;
                        setTimeout(type, delay);
                    } else {
                        currentTransformed.value = text;
                        resolve();
                    }
                }
                type();
            });
        }

        // ===== 用户系统逻辑 =====
        function onLogin(name) {
            userName.value = name;
            localStorage.setItem('textcraft_user', name);
            store.updateUser(name);
            // 切换用户后重新加载历史记录
            myLetters.value = [...store.getState().history];
            showUserModal.value = false;
            showToastMsg(`欢迎，${name}！`, 'success');
        }

        function onLogout() {
            userName.value = '';
            localStorage.removeItem('textcraft_user');
            store.updateUser('');
            myLetters.value = [...store.getState().history];
            showUserModal.value = false;
            showToastMsg('已退出登录', 'success');
        }

        // ===== 业务逻辑 =====
        function onSave() {
            const text = content.value.trim();
            if (!text) return;
            localStorage.setItem('textcraft_draft', text);
            store.updateContent(text);
            showAutoSaveStatusFn('已保存');
        }

        function debouncedAutoSave() {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(() => onSave(), 1000);
        }

        function onClear() {
            if (content.value.trim() && !confirm('确定要清空吗？')) return;
            content.value = '';
            currentStyle.value = null;
            currentTransformed.value = '';
            currentOriginal.value = '';
            store.resetEditor();
            showToastMsg('已清空', 'success');
        }

        function onStyleSelect(styleKey) {
            const text = content.value.trim();
            if (!text) { showToastMsg('请先输入文本', 'warning'); return; }

            currentStyle.value = styleKey;
            currentOriginal.value = text;

            // 使用 TransformerService 进行转换
            if (typeof TransformerService !== 'undefined') {
                currentTransformed.value = TransformerService.transform(text, styleKey);
            } else if (typeof transformer !== 'undefined') {
                currentTransformed.value = transformer.transform(text, styleKey);
            }

            // 触发信封动画
            playEnvelopeAnimation();

            store.updateTransform(styleKey, currentTransformed.value, text);
        }

        // 信封动画播放
        function playEnvelopeAnimation() {
            showEnvelope.value = true;
            envelopePhase.value = 0;

            // 动画序列：飞入(0.6s) → 翻转(0.5s) → 打开封口(0.5s) → 信纸滑出(0.8s) → 完成
            clearTimeout(envelopeTimer);

            // 阶段 1: 飞入
            envelopePhase.value = 1;
            envelopeTimer = setTimeout(() => {
                envelopePhase.value = 2; // 翻转
            }, 600);

            envelopeTimer = setTimeout(() => {
                envelopePhase.value = 3; // 打开封口
            }, 1100);

            envelopeTimer = setTimeout(() => {
                envelopePhase.value = 4; // 信纸滑出
            }, 1600);

            envelopeTimer = setTimeout(() => {
                envelopePhase.value = 5; // 完成，保持展示
            }, 2400);
        }

        function closeEnvelope() {
            showEnvelope.value = false;
            envelopePhase.value = 0;
        }

        // 侧边栏导航
        function onNavChange(navKey) {
            activeNav.value = navKey;
            if (navKey === 'documents') {
                showDocManager.value = true;
            } else if (navKey === 'history') {
                showHistoryModal.value = true;
            } else if (navKey === 'templates') {
                showTemplateModal.value = true;
            } else if (navKey === 'settings') {
                showSettingsModal.value = true;
            }
        }

        function toggleSidebar() {
            sidebarCollapsed.value = !sidebarCollapsed.value;
        }

        // 文档管理
        function onCreateDocument() {
            const doc = store.createDocument();
            content.value = '';
            currentStyle.value = null;
            currentTransformed.value = '';
            showToastMsg('新文档已创建', 'success');
        }

        function onSwitchDocument(docId) {
            store.switchDocument(docId);
            content.value = store.get('editor.content') || '';
            currentStyle.value = store.get('transformer.currentStyle');
            currentTransformed.value = store.get('transformer.currentTransformed') || '';
            showDocManager.value = false;
        }

        function onDeleteDocument(docId) {
            store.deleteDocument(docId);
            showToastMsg('文档已删除', 'success');
        }

        function onRenameDocument(docId) {
            const doc = documents.value.find(d => d.id === docId);
            if (!doc) return;
            const newName = prompt('输入新名称', doc.name);
            if (newName && newName.trim()) {
                store.renameDocument(docId, newName.trim());
                showToastMsg('已重命名', 'success');
            }
        }

        function onSaveDocument() {
            store.saveCurrentDocument();
            showToastMsg('文档已保存', 'success');
        }

        // AI 任务处理
        async function onAITask(taskKey) {
            const text = content.value.trim();
            if (!text) { showToastMsg('请先输入文本', 'warning'); return; }

            currentAITask.value = taskKey;
            aiProcessing.value = true;

            try {
                if (typeof AIService !== 'undefined') {
                    const result = await AIService.process(text, taskKey, {
                        input: text,
                        styleKey: currentStyle.value,
                        styleName: styles.value.find(s => s.key === currentStyle.value)?.name || '',
                    });
                    // 打字机效果逐字输出
                    currentOriginal.value = text;
                    await typewriterEffect(result);
                    // 同步到 store
                    store.updateTransform(currentStyle.value || 'ai', result, text);
                    showToastMsg('AI 处理完成', 'success');
                } else {
                    showToastMsg('AI 服务未加载', 'error');
                }
            } catch (e) {
                console.error('AI processing error:', e);
                showToastMsg('AI 处理失败，请重试', 'error');
            } finally {
                aiProcessing.value = false;
            }
        }

        function onGenerateLink() {
            if (!currentTransformed.value) { showToastMsg('请先选择风格并预览', 'warning'); return; }

            const style = styles.value.find(s => s.key === currentStyle.value);
            const letterObj = {
                styleKey: currentStyle.value,
                styleName: style ? style.name : currentStyle.value,
                content: currentTransformed.value,
                original: currentOriginal.value,
                time: new Date().toLocaleString('zh-CN'),
            };

            // 使用 TransformerService 生成链接
            if (typeof TransformerService !== 'undefined') {
                generatedLink.value = TransformerService.generateShareLink(letterObj);
            } else {
                const json = JSON.stringify(letterObj);
                const base64 = btoa(unescape(encodeURIComponent(json)));
                const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                generatedLink.value = `${window.location.origin}${window.location.pathname}?letter=${urlSafe}`;
            }

            store.addToHistory(letterObj);
            showLinkModal.value = true;
            showToastMsg('链接已生成', 'success');
        }

        function onCopyLink() {
            copyToClipboard(generatedLink.value);
            showToastMsg('链接已复制', 'success');
        }

        function onOpenLink() {
            window.open(generatedLink.value, '_blank');
        }

        function onCopyText() {
            if (!currentTransformed.value) return;
            copyToClipboard(currentTransformed.value);
            showToastMsg('已复制', 'success');
        }

        function onExportJSON() {
            const letterObj = {
                styleKey: currentStyle.value,
                styleName: styles.value.find(s => s.key === currentStyle.value)?.name || '',
                content: currentTransformed.value,
                original: currentOriginal.value,
                time: new Date().toLocaleString('zh-CN'),
            };
            if (typeof ExportService !== 'undefined') {
                ExportService.exportJSON(letterObj);
            } else {
                const json = typeof TransformerService !== 'undefined'
                    ? TransformerService.exportJSON(letterObj)
                    : JSON.stringify(letterObj, null, 2);
                downloadFile(json, 'textcraft-export.json', 'application/json');
            }
            showToastMsg('JSON 已导出', 'success');
        }

        function onExportText() {
            if (typeof ExportService !== 'undefined') {
                ExportService.exportText({ content: currentTransformed.value });
            } else {
                const text = typeof TransformerService !== 'undefined'
                    ? TransformerService.exportPlainText({ content: currentTransformed.value })
                    : currentTransformed.value;
                downloadFile(text, 'textcraft-export.txt', 'text/plain');
            }
            showToastMsg('文本已导出', 'success');
        }

        // 导出图片（使用 ExportService）
        async function onExportImage() {
            if (!currentTransformed.value) { showToastMsg('请先选择风格并预览', 'warning'); return; }

            const style = styles.value.find(s => s.key === currentStyle.value);
            if (typeof ExportService !== 'undefined') {
                try {
                    await ExportService.exportImage({
                        content: currentTransformed.value,
                        styleName: style ? style.name : currentStyle.value,
                    });
                    showToastMsg('图片已导出', 'success');
                } catch (e) {
                    console.error('Export image error:', e);
                    showToastMsg('图片导出失败', 'error');
                }
            } else {
                showToastMsg('导出服务未加载', 'error');
            }
        }

        // 导出 HTML（使用 ExportService）
        function onExportHTML() {
            if (!currentTransformed.value) { showToastMsg('请先选择风格并预览', 'warning'); return; }

            const style = styles.value.find(s => s.key === currentStyle.value);
            if (typeof ExportService !== 'undefined') {
                ExportService.exportHTML({
                    styleKey: currentStyle.value,
                    styleName: style ? style.name : currentStyle.value,
                    content: currentTransformed.value,
                    original: currentOriginal.value,
                    time: new Date().toLocaleString('zh-CN'),
                });
                showToastMsg('HTML 已导出', 'success');
            } else {
                showToastMsg('导出服务未加载', 'error');
            }
        }

        function downloadFile(content, filename, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        function onPrint() {
            if (!currentTransformed.value) { showToastMsg('请先选择风格并预览', 'warning'); return; }

            const style = styles.value.find(s => s.key === currentStyle.value);
            const styleName = style ? style.name : currentStyle.value;
            const cssClass = style ? style.cssClass : '';
            const time = new Date().toLocaleString('zh-CN');

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`<!DOCTYPE html><html><head><title>TextCraft - ${escapeHtml(styleName)}</title>
<link href="https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=Noto+Serif+SC:wght@300;400;500;600;700&family=ZCOOL+XiaoWei&family=ZCOOL+KuaiLe&family=Long+Cang&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Serif SC',serif;padding:40px;color:#2c2c2c;background:#fff}
.letter-card{max-width:700px;margin:0 auto;padding:48px 40px;border:1px solid #e0dcd3;border-radius:20px;position:relative}
.letter-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#d4b08a,#a67c52,#d4b08a)}
.letter-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;padding-bottom:20px;border-bottom:1px solid #e0dcd3}
.letter-logo{font-family:'ZCOOL XiaoWei',serif;font-size:20px;color:#6d4c2e}
.letter-badge{font-size:13px;padding:6px 16px;border-radius:20px;background:#f5f0e8;color:#8b5e3c;font-weight:600}
.letter-content{font-size:16px;line-height:2;white-space:pre-wrap;word-break:break-word}
.letter-time{margin-top:40px;padding-top:20px;border-top:1px solid #e0dcd3;font-size:13px;color:#9a9a9a}
.letter-card.literary{background:#fefcff;border-color:#d4c8e8}.letter-card.literary .letter-content{color:#7b68a8;font-family:'Ma Shan Zheng',cursive;font-size:18px}.letter-card.literary .letter-logo{color:#7b68a8}.letter-card.literary .letter-badge{background:#f5f0fa;color:#7b68a8}
.letter-card.classical{background:#fffdf5;border-color:#e8dcc0}.letter-card.classical .letter-content{color:#8b6914;font-family:'Long Cang',cursive;font-size:18px}.letter-card.classical .letter-logo{color:#8b6914}.letter-card.classical .letter-badge{background:#fdf8e8;color:#8b6914}
.letter-card.humorous .letter-content{color:#e8734a;font-family:'ZCOOL KuaiLe',cursive}.letter-card.humorous .letter-badge{background:#fef5f0;color:#e8734a}
.letter-card.cute{background:#fff5f9;border-color:#ffb6c1}.letter-card.cute .letter-content{color:#ff69b4;font-family:'ZCOOL KuaiLe',cursive;background:#fff0f5;padding:20px;border-radius:12px}.letter-card.cute .letter-badge{background:#fff0f5;color:#ff69b4}
.letter-card.cyberpunk{background:#0a0a1a;border-color:#00ff88}.letter-card.cyberpunk .letter-content{color:#00ff88;font-family:'Courier New',monospace;background:rgba(0,255,136,0.05);padding:20px;border-radius:8px;border-left:3px solid #00ff88}.letter-card.cyberpunk .letter-logo{color:#00ff88}.letter-card.cyberpunk .letter-badge{background:#1a1a2e;color:#00ff88}.letter-card.cyberpunk .letter-header{border-color:#1a3a2a}.letter-card.cyberpunk .letter-time{color:#5a8a6a;border-color:#1a3a2a}
.letter-card.formal .letter-content{color:#4a6741}.letter-card.formal .letter-badge{background:#f0f5ed;color:#4a6741}
.letter-card.casual .letter-content{color:#d4856a}.letter-card.casual .letter-badge{background:#fdf5f0;color:#d4856a}
.letter-card.concise .letter-content{color:#4a7c8f}.letter-card.concise .letter-badge{background:#edf5f8;color:#4a7c8f}
.letter-card.warm .letter-content{color:#c47a5a}.letter-card.warm .letter-badge{background:#fdf2ed;color:#c47a5a}
.letter-card.academic .letter-content{color:#3a506b}.letter-card.academic .letter-badge{background:#eef3f8;color:#3a506b}
.letter-card.official{background:#fafafa;border-color:#d0d0d0}.letter-card.official .letter-content{color:#333;background:#fff;padding:20px;border-radius:4px;border:1px solid #e0e0e0}.letter-card.official .letter-badge{background:#f0f0f0;color:#333}
@media print{body{padding:0}.letter-card{box-shadow:none;border:none;padding:40px}.letter-card::before{display:none}}
</style></head><body>
<div class="letter-card ${cssClass}">
    <div class="letter-header"><div class="letter-logo">⚡ TextCraft</div><span class="letter-badge">${escapeHtml(styleName)}</span></div>
    <div class="letter-content">${escapeHtml(currentTransformed.value)}</div>
    <div class="letter-time">${time}</div>
</div>
<script>window.onload=()=>window.print();<\/script>
</body></html>`);
            printWindow.document.close();
        }

        function useTemplate(templateId) {
            if (typeof getTemplateById === 'undefined') return;
            const template = getTemplateById(templateId);
            if (!template) return;
            content.value = template.content;
            showTemplateModal.value = false;
            showToastMsg('模板已加载', 'success');
        }

        function useHistoryItem(id) {
            const item = myLetters.value.find(l => l.id === id);
            if (!item) return;
            content.value = item.original || item.content;
            showHistoryModal.value = false;
            showToastMsg('已加载', 'success');
        }

        function generateLinkFromHistory(id) {
            const item = myLetters.value.find(l => l.id === id);
            if (!item) return;
            if (typeof TransformerService !== 'undefined') {
                generatedLink.value = TransformerService.generateShareLink(item);
            } else {
                const json = JSON.stringify(item);
                const base64 = btoa(unescape(encodeURIComponent(json)));
                const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                generatedLink.value = `${window.location.origin}${window.location.pathname}?letter=${urlSafe}`;
            }
            showHistoryModal.value = false;
            showLinkModal.value = true;
            showToastMsg('链接已生成', 'success');
        }

        function deleteHistoryItem(id) {
            store.deleteHistoryItem(id);
            myLetters.value = [...store.getState().history];
            showToastMsg('已删除', 'success');
        }

        function onClearHistory() {
            if (!confirm('确定要清空所有历史记录吗？')) return;
            store.clearHistory();
            myLetters.value = [];
            showToastMsg('历史记录已清空', 'success');
        }

        // ===== v21-v53: 新增功能处理 =====

        // v21.0: 快捷键面板
        function onShortcuts() { showShortcuts.value = !showShortcuts.value; }

        // v23.0: 阅读模式
        function onReadingMode() { isReadingMode.value = !isReadingMode.value; }

        // v24.0: 全屏专注
        function onFocusMode() {
            isFocusMode.value = !isFocusMode.value;
            showToastMsg(isFocusMode.value ? '已进入全屏专注模式' : '已退出全屏专注模式', 'success');
        }

        // v26.0: 撤销/重做
        function onUndo() {
            const prev = store.undo();
            if (prev !== null) {
                content.value = prev;
                showToastMsg('已撤销', 'success');
            }
        }
        function onRedo() {
            const next = store.redo();
            if (next !== null) {
                content.value = next;
                showToastMsg('已重做', 'success');
            }
        }

        // v29.0: 文本对比
        function onDiff() { showDiff.value = !showDiff.value; }

        // v30.0: 版本历史
        function onVersions() { showVersions.value = !showVersions.value; }
        function onSaveVersion() {
            store.saveVersion('手动保存');
            showToastMsg('版本已保存', 'success');
        }
        function onRestoreVersion(id) {
            store.restoreVersion(id);
            content.value = store.getState().editor.content;
            showToastMsg('版本已恢复', 'success');
        }
        function onDeleteVersion(id) {
            store.deleteVersion(id);
            showToastMsg('版本已删除', 'success');
        }

        // v33.0: 快捷短语
        function onPhrase() { showPhrasePanel.value = !showPhrasePanel.value; }
        function onInsertPhrase(text) {
            content.value += text;
            showPhrasePanel.value = false;
            showToastMsg('短语已插入', 'success');
        }

        // v45.0: 字体大小
        function onFontSizeChange(delta) {
            const settings = store.getState().settings;
            const newSize = Math.min(32, Math.max(12, settings.editorFontSize + delta));
            store.set('settings.editorFontSize', newSize);
        }

        // v46.0: 行距
        function onLineHeightChange(delta) {
            const settings = store.getState().settings;
            const newLH = Math.min(3, Math.max(1, +(settings.lineHeight + delta).toFixed(1)));
            store.set('settings.lineHeight', newLH);
        }

        // v47.0: 段落缩进
        function onTextIndentChange(delta) {
            const settings = store.getState().settings;
            const newIndent = Math.max(0, settings.textIndent + delta);
            store.set('settings.textIndent', newIndent);
        }

        // v48.0: 文本对齐
        function onTextAlignChange(align) {
            store.set('settings.textAlign', align);
        }

        // v49.0: 查找替换
        function onFindReplace() { showFindReplace.value = !showFindReplace.value; }
        function onReplace(data) {
            if (!data.find) return;
            const idx = content.value.indexOf(data.find);
            if (idx !== -1) {
                content.value = content.value.substring(0, idx) + data.replace + content.value.substring(idx + data.find.length);
                showToastMsg('已替换 1 处', 'success');
            }
        }
        function onReplaceAll(data) {
            if (!data.find) return;
            const regex = new RegExp(data.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            const count = (content.value.match(regex) || []).length;
            content.value = content.value.replace(regex, data.replace);
            showToastMsg(`已替换 ${count} 处`, 'success');
        }

        // v52.0: 水印
        function onWatermarkToggle() {
            const settings = store.getState().settings;
            store.set('settings.watermark', { enabled: !settings.watermark.enabled, text: settings.watermark.text || 'TextCraft' });
            showToastMsg(showWatermark.value ? '已关闭水印' : '已开启水印', 'success');
        }

        // v54-v100: 工具箱
        function onTools() { showToolsModal.value = !showToolsModal.value; }
        function onApplyTool(output) {
            content.value = output;
            showToolsModal.value = false;
            showToastMsg('已应用到编辑器', 'success');
        }

        // v54-v100: 文本分析面板
        function onAnalysis() { showAnalysisPanel.value = !showAnalysisPanel.value; }

        // v36.0: 导出 Word
        function onExportWord() {
            if (!currentTransformed.value) { showToastMsg('请先选择风格并预览', 'warning'); return; }
            const style = styles.value.find(s => s.key === currentStyle.value);
            ExportService.exportWord({
                styleName: style ? style.name : currentStyle.value,
                content: currentTransformed.value,
                time: new Date().toLocaleString('zh-CN'),
            });
            showToastMsg('Word 已导出', 'success');
        }

        // v37.0: 导出 Markdown
        function onExportMarkdown() {
            if (!currentTransformed.value) { showToastMsg('请先选择风格并预览', 'warning'); return; }
            const style = styles.value.find(s => s.key === currentStyle.value);
            ExportService.exportMarkdown({
                styleName: style ? style.name : currentStyle.value,
                content: currentTransformed.value,
                original: currentOriginal.value,
                time: new Date().toLocaleString('zh-CN'),
            });
            showToastMsg('Markdown 已导出', 'success');
        }

        // v39.0: 分享卡片
        async function onExportShareCard() {
            if (!currentTransformed.value) { showToastMsg('请先选择风格并预览', 'warning'); return; }
            try {
                const style = styles.value.find(s => s.key === currentStyle.value);
                const url = await ExportService.generateShareCard({
                    content: currentTransformed.value,
                    styleName: style ? style.name : currentStyle.value,
                });
                shareCardUrl.value = url;
                showShareCard.value = true;
            } catch (e) {
                console.error('Share card error:', e);
                showToastMsg('分享卡片生成失败', 'error');
            }
        }
        function onDownloadShareCard() {
            if (!shareCardUrl.value) return;
            const a = document.createElement('a');
            a.href = shareCardUrl.value;
            a.download = 'textcraft-card.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToastMsg('卡片已下载', 'success');
        }

        // v40.0: 二维码
        async function onExportQRCode() {
            if (!currentTransformed.value) { showToastMsg('请先选择风格并预览', 'warning'); return; }
            try {
                const url = await ExportService.generateQRCode(window.location.href, 200);
                qrUrl.value = url;
                showQRCode.value = true;
            } catch (e) {
                console.error('QR code error:', e);
                showToastMsg('二维码生成失败', 'error');
            }
        }

        // ===== 监听 =====
        watch(content, () => { debouncedAutoSave(); });

        // ===== 快捷键 =====
        function handleKeydown(e) {
            // 忽略输入框内的快捷键（除了 Ctrl+F 等全局快捷键）
            const tag = e.target.tagName;
            const isInput = tag === 'INPUT' || tag === 'TEXTAREA';

            if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); onSave(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); onClear(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); onPrint(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 't') { e.preventDefault(); toggleDarkTheme(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); onUndo(); }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); onRedo(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); onFindReplace(); }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') { e.preventDefault(); onReadingMode(); }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') { e.preventDefault(); onFocusMode(); }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') { e.preventDefault(); onVersions(); }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') { e.preventDefault(); onShortcuts(); }
            if (e.key === 'Escape') {
                showLinkModal.value = false;
                showTemplateModal.value = false;
                showHistoryModal.value = false;
                showUserModal.value = false;
                showShortcuts.value = false;
                showVersions.value = false;
                showDiff.value = false;
                showPhrasePanel.value = false;
                showFindReplace.value = false;
                showShareCard.value = false;
                showQRCode.value = false;
                showToolsModal.value = false;
                showAnalysisPanel.value = false;
                isReadingMode.value = false;
                showBottlePage.value = false;
            }
        }

        // ===== 暗色主题切换 =====
        function toggleDarkTheme() {
            isDarkTheme.value = !isDarkTheme.value;
            localStorage.setItem('textcraft_dark_theme', isDarkTheme.value);
            document.body.classList.toggle('dark-theme', isDarkTheme.value);
            showToastMsg(isDarkTheme.value ? '已切换到暗色主题' : '已切换到亮色主题', 'success');
        }

        // ===== 生命周期 =====
        onMounted(() => {
            document.addEventListener('keydown', handleKeydown);
            // 初始化暗色主题
            if (isDarkTheme.value) {
                document.body.classList.add('dark-theme');
            }
            // v103.0: 生成演示漂流瓶（仅首次）
            if (typeof BottleService !== 'undefined' && BottleService.getAllBottles().length === 0) {
                BottleService.generateDemoBottles();
            }
        });

        onUnmounted(() => {
            document.removeEventListener('keydown', handleKeydown);
            clearTimeout(autoSaveTimer);
            clearTimeout(toastTimer);
            clearTimeout(statusTimer);
            clearTimeout(envelopeTimer);
            // 停止语音识别
            if (recognition) { try { recognition.stop(); } catch (e) { } }
            // 停止朗读
            window.speechSynthesis && window.speechSynthesis.cancel();
        });

        return {
            content, currentStyle, currentTransformed, currentOriginal, myLetters, userName,
            showLinkModal, showTemplateModal, showHistoryModal, showUserModal, showSettingsModal, showToast, toastMessage, toastType,
            generatedLink, autoSaveStatus, autoSaveStatusShow,
            processingMode, platformMode, aiTasks, currentAITask, aiProcessing,
            isListening, isReading, isDarkTheme,
            showEnvelope, envelopePhase,
            activeNav, sidebarCollapsed,
            styles, wordCount, wordCountStatus, isLoggedIn,
            onClear, onStyleSelect, onGenerateLink, onCopyLink, onOpenLink, onCopyText,
            onPrint, onExportJSON, onExportText, onExportImage, onExportHTML,
            onAITask, onVoiceInput, onReadAloud, onLogin, onLogout,
            toggleDarkTheme,
            playEnvelopeAnimation, closeEnvelope,
            onNavChange, toggleSidebar,
            documents, currentDocId, currentDoc, showDocManager, favorites,
            onCreateDocument, onSwitchDocument, onDeleteDocument, onRenameDocument, onSaveDocument,
            useTemplate, useHistoryItem, generateLinkFromHistory, deleteHistoryItem, onClearHistory,
            // v21-v53: 新增功能
            showShortcuts, onShortcuts,
            isReadingMode, onReadingMode,
            isFocusMode, onFocusMode,
            canUndo, canRedo, onUndo, onRedo,
            showDiff, onDiff,
            showVersions, versions, onVersions, onSaveVersion, onRestoreVersion, onDeleteVersion,
            showPhrasePanel, phrases, onPhrase, onInsertPhrase,
            editorFontSize, onFontSizeChange,
            lineHeight, onLineHeightChange,
            textIndent, onTextIndentChange,
            textAlign, onTextAlignChange,
            showFindReplace, onFindReplace, onReplace, onReplaceAll,
            showWatermark, onWatermarkToggle,
            showShareCard, shareCardUrl, onExportShareCard, onDownloadShareCard,
            showQRCode, qrUrl, onExportQRCode,
            onExportWord, onExportMarkdown,
            // v54-v100: 工具箱 & 分析面板
            showToolsModal, showAnalysisPanel, onTools, onAnalysis, onApplyTool,
            // v103.0: 漂流瓶
            showBottlePage,
        };
    },
    template: `
        <div class="app-container">
            <sidebar
                :active-nav="activeNav"
                :collapsed="sidebarCollapsed"
                :user-name="userName"
                :is-logged-in="isLoggedIn"
                :history-count="myLetters.length"
                :is-dark-theme="isDarkTheme"
                @nav-change="onNavChange"
                @toggle-collapse="toggleSidebar"
                @toggle-dark-theme="toggleDarkTheme"
                @login="onLogin"
                @user="showUserModal = true"
            />
            <main class="main-content">
                <editor-panel
                    v-model:content="content"
                    :word-count="wordCount"
                    :word-count-status="wordCountStatus"
                    :auto-save-status="autoSaveStatus"
                    :auto-save-status-show="autoSaveStatusShow"
                    :user-name="userName"
                    :is-listening="isListening"
                    :can-undo="canUndo"
                    :can-redo="canRedo"
                    :editor-font-size="editorFontSize"
                    :line-height="lineHeight"
                    :text-indent="textIndent"
                    :text-align="textAlign"
                    :show-find-replace="showFindReplace"
                    :is-focus-mode="isFocusMode"
                    :show-watermark="showWatermark"
                    @clear="onClear"
                    @voice-input="onVoiceInput"
                    @undo="onUndo"
                    @redo="onRedo"
                    @phrase="onPhrase"
                    @versions="onVersions"
                    @shortcuts="onShortcuts"
                    @find-replace="onFindReplace"
                    @reading-mode="onReadingMode"
                    @focus-mode="onFocusMode"
                    @diff="onDiff"
                    @font-size-change="onFontSizeChange"
                    @line-height-change="onLineHeightChange"
                    @text-indent-change="onTextIndentChange"
                    @text-align-change="onTextAlignChange"
                    @watermark-toggle="onWatermarkToggle"
                    @tools="onTools"
                    @analysis="onAnalysis"
                    @replace="onReplace"
                    @replaceall="onReplaceAll"
                />
                <preview-panel
                    :current-style="currentStyle"
                    :current-transformed="currentTransformed"
                    :styles="styles"
                    :processing-mode="processingMode"
                    :platform-mode="platformMode"
                    :ai-tasks="aiTasks"
                    :current-ai-task="currentAITask"
                    :ai-processing="aiProcessing"
                    :is-reading="isReading"
                    @select-style="onStyleSelect"
                    @generate="onGenerateLink"
                    @copy="onCopyText"
                    @print="onPrint"
                    @export-pdf="onPrint"
                    @export-image="onExportImage"
                    @export-html="onExportHTML"
                    @update:processing-mode="processingMode = $event"
                    @update:platform-mode="platformMode = $event"
                    @ai-task="onAITask"
                    @read-aloud="onReadAloud"
                />
            </main>
            <link-modal
                :show="showLinkModal"
                :link="generatedLink"
                @close="showLinkModal = false"
                @copy="onCopyLink"
                @open="onOpenLink"
                @export-json="onExportJSON"
                @export-text="onExportText"
            />
            <template-modal
                :show="showTemplateModal"
                @close="showTemplateModal = false"
                @use="useTemplate"
            />
            <history-modal
                :show="showHistoryModal"
                :history="myLetters"
                @close="showHistoryModal = false"
                @use="useHistoryItem"
                @link="generateLinkFromHistory"
                @delete="deleteHistoryItem"
                @clear="onClearHistory"
            />
            <user-modal
                :show="showUserModal"
                :user-name="userName"
                :is-logged-in="isLoggedIn"
                @close="showUserModal = false"
                @login="onLogin"
                @logout="onLogout"
            />
            <doc-manager
                :show="showDocManager"
                :documents="documents"
                :current-doc-id="currentDocId"
                @close="showDocManager = false"
                @create="onCreateDocument"
                @switch="onSwitchDocument"
                @delete="onDeleteDocument"
                @rename="onRenameDocument"
            />
            <settings-modal
                :show="showSettingsModal"
                @close="showSettingsModal = false"
                @save="showToastMsg('AI 设置已保存', 'success')"
            />
            <envelope
                :show="showEnvelope"
                :style-key="currentStyle"
                :style-name="styles.find(s => s.key === currentStyle)?.name || ''"
                :content="currentTransformed"
                :animation-phase="envelopePhase"
                @close="closeEnvelope"
            />
            <!-- v21.0: 快捷键面板 -->
            <shortcuts-modal :show="showShortcuts" @close="showShortcuts = false" />
            <!-- v23.0: 阅读模式 -->
            <reading-mode :show="isReadingMode" :content="content" :style-name="styles.find(s => s.key === currentStyle)?.name || ''" @close="isReadingMode = false" />
            <!-- v29.0: 文本对比 -->
            <text-diff :show="showDiff" :original="currentOriginal" :transformed="currentTransformed" @close="showDiff = false" />
            <!-- v30.0: 版本历史 -->
            <version-history-modal :show="showVersions" :versions="versions" @close="showVersions = false" @restore="onRestoreVersion" @delete="onDeleteVersion" @save="onSaveVersion" />
            <!-- v33.0: 快捷短语 -->
            <phrase-panel :show="showPhrasePanel" :phrases="phrases" @close="showPhrasePanel = false" @insert="onInsertPhrase" />
            <!-- v39.0: 分享卡片 -->
            <share-card-modal :show="showShareCard" :card-url="shareCardUrl" @close="showShareCard = false" @download="onDownloadShareCard" />
            <!-- v40.0: 二维码 -->
            <qr-code-modal :show="showQRCode" :qr-url="qrUrl" @close="showQRCode = false" />
            <!-- v54-v100: 工具箱 -->
            <tools-modal :show="showToolsModal" @close="showToolsModal = false" @apply-tool="onApplyTool" />
            <!-- v54-v100: 文本分析面板 -->
            <text-analysis-panel :show="showAnalysisPanel" :content="content" @close="showAnalysisPanel = false" />
            <!-- v103.0: 漂流瓶入口按钮 -->
            <button class="bottle-entry-btn" :class="{ hidden: showBottlePage }" @click="showBottlePage = true" title="漂流瓶">🌊</button>
            <!-- v103.0: 漂流瓶页面 -->
            <bottle-page :show="showBottlePage" :editor-content="content" :current-style="currentStyle" :current-style-name="styles.find(s => s.key === currentStyle)?.name || ''" @close="showBottlePage = false" @throw-success="showToastMsg('瓶子已经出发啦~', 'success')" />
            <toast :show="showToast" :message="toastMessage" :type="toastType" />
        </div>
    `
});

// 挂载
if (!window._letterViewMode) {
    app.mount('#app');
}
