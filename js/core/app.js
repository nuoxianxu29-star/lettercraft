/**
 * 智能文本生成与转换系统 v8.0 - AI-Powered Text Processing System
 * 架构：Vue 3 + 模块化前端架构
 * 模块：Store / Services / Router / UI / Components
 * 
 * 功能：
 * - 多模板智能文本生成
 * - 基于规则的语义转换引擎（可扩展 AI）
 * - 用户级历史记录系统
 * - 分享链接生成与解析
 * - 导出 PDF / 图片 / JSON
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

// 模板弹窗组件
const TemplateModalComponent = {
    props: { show: Boolean },
    emits: ['close', 'use'],
    data() {
        return {
            activeCategory: 'all',
            categories: [
                { key: 'all', name: '全部' },
                { key: 'letter', name: '信件' },
                { key: 'email', name: '邮件' },
                { key: 'notice', name: '通知' },
                { key: 'creative', name: '创意' },
            ]
        };
    },
    computed: {
        templates() {
            if (typeof getTemplates === 'undefined') return [];
            return getTemplates(this.activeCategory);
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
                    <div class="template-categories">
                        <button v-for="c in categories" :key="c.key" class="template-category-btn" :class="{ active: c.key === activeCategory }" @click="activeCategory = c.key">{{ c.name }}</button>
                    </div>
                    <div class="template-grid">
                        <div v-for="t in templates" :key="t.id" class="template-card" @click="$emit('use', t.id)">
                            <div class="template-card-header">
                                <span class="template-card-title">{{ t.title }}</span>
                                <span class="template-card-cat">{{ getCategoryName(t.category) }}</span>
                            </div>
                            <div class="template-card-preview">{{ escapeHtml(t.preview) }}</div>
                            <div class="template-card-footer">点击使用 →</div>
                        </div>
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
    },
    emits: ['update:content', 'clear', 'template', 'history', 'user'],
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

// 预览面板组件
const PreviewPanelComponent = {
    props: {
        currentStyle: String,
        currentTransformed: String,
        styles: Array,
        processingMode: { type: String, default: 'style' } // style, ai
    },
    emits: ['select-style', 'generate', 'copy', 'print', 'export-pdf', 'export-image'],
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
        }
    },
    methods: {
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    },
    template: `
        <section class="preview-panel" aria-label="输出区域">
            <div class="panel-header">
                <h2>处理风格</h2>
                <div class="panel-header-actions">
                    <button class="btn-icon" title="导出 PDF" aria-label="导出 PDF" @click="$emit('export-pdf')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    </button>
                    <button class="btn-icon" title="打印" aria-label="打印" @click="$emit('print')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6,9 6,2 18,2 18,9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    </button>
                </div>
            </div>
            <div class="style-grid" role="listbox" aria-label="选择处理风格">
                <button 
                    v-for="s in styles" 
                    :key="s.key"
                    class="style-card" 
                    :class="{ active: s.key === currentStyle }"
                    @click="$emit('select-style', s.key)"
                >{{ s.name }}</button>
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
            </div>
        </section>
    `
};

// ==================== 主 Vue 应用 ====================
const { createApp, ref, computed, watch, onMounted, onUnmounted } = Vue;

const app = createApp({
    components: {
        'editor-panel': EditorPanelComponent,
        'preview-panel': PreviewPanelComponent,
        'link-modal': LinkModalComponent,
        'template-modal': TemplateModalComponent,
        'history-modal': HistoryModalComponent,
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
        const showToast = ref(false);
        const toastMessage = ref('');
        const toastType = ref('info');
        const generatedLink = ref('');
        const autoSaveStatus = ref('');
        const autoSaveStatusShow = ref(false);

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

            store.updateTransform(styleKey, currentTransformed.value, text);
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
            const json = typeof TransformerService !== 'undefined' 
                ? TransformerService.exportJSON(letterObj) 
                : JSON.stringify(letterObj, null, 2);
            downloadFile(json, 'textcraft-export.json', 'application/json');
            showToastMsg('JSON 已导出', 'success');
        }

        function onExportText() {
            const text = typeof TransformerService !== 'undefined'
                ? TransformerService.exportPlainText({ content: currentTransformed.value })
                : currentTransformed.value;
            downloadFile(text, 'textcraft-export.txt', 'text/plain');
            showToastMsg('文本已导出', 'success');
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
        });

        return {
            content, currentStyle, currentTransformed, currentOriginal, myLetters, userName,
            showLinkModal, showTemplateModal, showHistoryModal, showToast, toastMessage, toastType,
            generatedLink, autoSaveStatus, autoSaveStatusShow,
            styles, wordCount, wordCountStatus,
            onClear, onStyleSelect, onGenerateLink, onCopyLink, onOpenLink, onCopyText,
            onPrint, onExportJSON, onExportText,
            useTemplate, useHistoryItem, generateLinkFromHistory, deleteHistoryItem, onClearHistory
        };
    },
    template: `
        <div class="app-container">
            <editor-panel
                v-model:content="content"
                :word-count="wordCount"
                :word-count-status="wordCountStatus"
                :auto-save-status="autoSaveStatus"
                :auto-save-status-show="autoSaveStatusShow"
                :user-name="userName"
                @clear="onClear"
                @template="showTemplateModal = true"
                @history="showHistoryModal = true"
                @user="showToast = true"
            />
            <preview-panel
                :current-style="currentStyle"
                :current-transformed="currentTransformed"
                :styles="styles"
                @select-style="onStyleSelect"
                @generate="onGenerateLink"
                @copy="onCopyText"
                @print="onPrint"
                @export-pdf="onPrint"
                @export-image="onPrint"
            />
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
            <toast :show="showToast" :message="toastMessage" :type="toastType" />
        </div>
    `
});

// 挂载
if (!window._letterViewMode) {
    app.mount('#app');
}
