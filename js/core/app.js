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

// ==================== 信件查看模式（路由优先处理） ====================
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
            document.addEventListener('DOMContentLoaded', () => {
                const cssClass = letter.styleKey || '';
                document.getElementById('app').innerHTML = `
                    <div class="letter-view-page" data-style="${cssClass}">
                        <div class="letter-view-container">
                            <div class="letter-view-card ${cssClass}">
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
                    </div>
                `;
            });
            window._letterViewMode = true;
        } else {
            throw new Error('Invalid letter data');
        }
    } catch (e) {
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
        window._letterViewMode = true;
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
                                <span>⚡</span>
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
    },
    emits: ['nav-change', 'toggle-collapse', 'login', 'logout', 'user'],
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
            const icons = {
                edit: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
                documents: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
                history: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>',
                template: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
                settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
                collapse: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11,17 6,12 11,7"/><polyline points="18,17 13,12 18,7"/></svg>',
                expand: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13,17 18,12 13,7"/><polyline points="6,17 11,12 6,7"/></svg>',
            };
            return icons[name] || '';
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
                    <span v-html="collapsed ? getIcon('expand') : getIcon('collapse')"></span>
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
                    <span class="sidebar-nav-icon" v-html="getIcon(item.icon)"></span>
                    <span v-show="!collapsed" class="sidebar-nav-label">{{ item.name }}</span>
                    <span v-if="item.key === 'history' && historyCount > 0" v-show="!collapsed" class="sidebar-nav-badge">{{ historyCount }}</span>
                </button>
            </nav>
            <div class="sidebar-footer">
                <button v-if="!isLoggedIn" class="sidebar-login-btn" @click="$emit('login')">
                    <span v-html="getIcon('edit')"></span>
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

// 编辑器面板组件
const EditorPanelComponent = {
    props: {
        content: String,
        wordCount: Number,
        wordCountStatus: String,
        autoSaveStatus: String,
        autoSaveStatusShow: Boolean,
        userName: String,
        isListening: Boolean,
    },
    emits: ['update:content', 'clear', 'template', 'history', 'user', 'voice-input'],
    methods: {
        onInput(event) {
            this.$emit('update:content', event.target.value);
        }
    },
    template: `
        <section class="write-panel" aria-label="输入区域">
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
            <div class="editor-wrapper">
                <div class="letter-paper">
                    <div class="paper-lines" aria-hidden="true"></div>
                    <textarea 
                        :value="content"
                        @input="onInput"
                        placeholder="输入文本内容...&#10;&#10;支持：信件、邮件、通知、创意写作等&#10;选择下方处理风格，一键转换"
                        aria-label="文本输入框"
                        maxlength="5000"
                        spellcheck="true"
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

// 预览面板组件（含 AI 模式切换）
const PreviewPanelComponent = {
    props: {
        currentStyle: String,
        currentTransformed: String,
        styles: Array,
        processingMode: { type: String, default: 'style' },
        aiTasks: { type: Array, default: () => [] },
        currentAITask: { type: String, default: '' },
        aiProcessing: { type: Boolean, default: false },
        isReading: { type: Boolean, default: false },
    },
    emits: ['select-style', 'generate', 'copy', 'print', 'export-pdf', 'export-image', 'export-html', 'update:processing-mode', 'ai-task', 'read-aloud'],
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
        }
    },
    methods: {
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
        switchMode(mode) {
            this.$emit('update:processing-mode', mode);
        }
    },
    template: `
        <section class="preview-panel" aria-label="输出区域">
            <div class="panel-header">
                <h2>处理风格</h2>
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
                        <div class="preview-letter-content" v-html="escapeHtml(currentTransformed).replace(/\\n/g, '<br>')"></div>
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
        'envelope': EnvelopeComponent,
        'toast': ToastComponent
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
        const currentAITask = ref('');
        const aiProcessing = ref(false);

        // 语音相关状态
        const isListening = ref(false);
        const isReading = ref(false);
        let recognition = null;
        let speechSynth = null;

        // Timers
        let autoSaveTimer = null;
        let toastTimer = null;
        let statusTimer = null;

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
                if (recognition) { try { recognition.stop(); } catch(e) {} }
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

        // ===== 监听 =====
        watch(content, () => { debouncedAutoSave(); });

        // ===== 快捷键 =====
        function handleKeydown(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); onSave(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); onClear(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); onPrint(); }
            if (e.key === 'Escape') {
                showLinkModal.value = false;
                showTemplateModal.value = false;
                showHistoryModal.value = false;
                showUserModal.value = false;
            }
        }

        // ===== 生命周期 =====
        onMounted(() => {
            document.addEventListener('keydown', handleKeydown);
        });

        onUnmounted(() => {
            document.removeEventListener('keydown', handleKeydown);
            clearTimeout(autoSaveTimer);
            clearTimeout(toastTimer);
            clearTimeout(statusTimer);
            clearTimeout(envelopeTimer);
            // 停止语音识别
            if (recognition) { try { recognition.stop(); } catch(e) {} }
            // 停止朗读
            window.speechSynthesis && window.speechSynthesis.cancel();
        });

        return {
            content, currentStyle, currentTransformed, currentOriginal, myLetters, userName,
            showLinkModal, showTemplateModal, showHistoryModal, showUserModal, showSettingsModal, showToast, toastMessage, toastType,
            generatedLink, autoSaveStatus, autoSaveStatusShow,
            processingMode, aiTasks, currentAITask, aiProcessing,
            isListening, isReading,
            showEnvelope, envelopePhase,
            activeNav, sidebarCollapsed,
            styles, wordCount, wordCountStatus, isLoggedIn,
            onClear, onStyleSelect, onGenerateLink, onCopyLink, onOpenLink, onCopyText,
            onPrint, onExportJSON, onExportText, onExportImage, onExportHTML,
            onAITask, onVoiceInput, onReadAloud, onLogin, onLogout,
            playEnvelopeAnimation, closeEnvelope,
            onNavChange, toggleSidebar,
            documents, currentDocId, currentDoc, showDocManager, favorites,
            onCreateDocument, onSwitchDocument, onDeleteDocument, onRenameDocument, onSaveDocument,
            useTemplate, useHistoryItem, generateLinkFromHistory, deleteHistoryItem, onClearHistory
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
                @nav-change="onNavChange"
                @toggle-collapse="toggleSidebar"
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
                    @clear="onClear"
                    @voice-input="onVoiceInput"
                />
                <preview-panel
                    :current-style="currentStyle"
                    :current-transformed="currentTransformed"
                    :styles="styles"
                    :processing-mode="processingMode"
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
            <envelope
                :show="showEnvelope"
                :style-key="currentStyle"
                :style-name="styles.find(s => s.key === currentStyle)?.name || ''"
                :content="currentTransformed"
                :animation-phase="envelopePhase"
                @close="closeEnvelope"
            />
            <toast :show="showToast" :message="toastMessage" :type="toastType" />
        </div>
    `
});

// 挂载
if (!window._letterViewMode) {
    app.mount('#app');
}
