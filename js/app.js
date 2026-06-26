/**
 * LetterCraft v7.0 - Enterprise Edition
 * 核心流程：写信 → 选风格 → 预览 → 生成分享链接
 * 功能：自动保存、历史记录、模板库、打印、快捷键、响应式设计
 */

// Check for letter data in URL FIRST
(function checkLetterView() {
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
                
                document.getElementById('letter-view-root').innerHTML = `
                    <div class="letter-view-page" data-style="${cssClass}">
                        <div class="letter-view-container">
                            <div class="letter-view-card ${cssClass}">
                                <div class="letter-view-header">
                                    <div class="letter-view-logo">
                                        <span class="logo-icon">✉</span>
                                        <span>LetterCraft</span>
                                    </div>
                                    <span class="letter-view-style-badge">${escapeHtml(letter.styleName)}</span>
                                </div>
                                
                                <div class="letter-view-content">
                                    ${escapeHtml(letter.content).replace(/\n/g, '<br>')}
                                </div>
                                
                                <div class="letter-view-footer">
                                    <div class="letter-view-time">${letter.time || ''}</div>
                                    <a href="${window.location.pathname}" class="letter-view-cta">我也要写信</a>
                                </div>
                            </div>
                            
                            <div class="letter-view-watermark">
                                由 LetterCraft 生成
                            </div>
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
            document.getElementById('letter-view-root').innerHTML = `
                <div class="letter-view-page">
                    <div class="letter-view-container">
                        <div class="letter-view-card" style="text-align: center; padding: 60px 40px;">
                            <p style="font-size: 18px; color: #9a9a9a; margin-bottom: 8px;">链接无效或已过期</p>
                            <p style="font-size: 14px;"><a href="${window.location.pathname}" style="color: #8b5e3c; text-decoration: none;">去写信</a></p>
                        </div>
                    </div>
                </div>
            `;
        });
        window._letterViewMode = true;
    }
})();

// Only initialize app if not in letter view mode
if (!window._letterViewMode) {
class LetterCraftApp {
    constructor() {
        // DOM Elements
        this.appContainer = document.getElementById('app-container');
        this.letterInput = document.getElementById('letter-input');
        this.wordCount = document.getElementById('word-count');
        this.autoSaveStatus = document.getElementById('auto-save-status');
        this.btnClear = document.getElementById('btn-clear');
        this.btnTemplate = document.getElementById('btn-template');
        this.btnHistory = document.getElementById('btn-history');
        this.btnPrint = document.getElementById('btn-print');

        // Style grid
        this.styleGrid = document.getElementById('style-grid');

        // Preview
        this.previewArea = document.getElementById('preview-area');
        this.previewActions = document.getElementById('preview-actions');
        this.btnGenerate = document.getElementById('btn-generate');
        this.btnCopy = document.getElementById('btn-copy');

        // Link modal
        this.linkModal = document.getElementById('link-modal');
        this.modalClose = document.getElementById('modal-close');
        this.generatedLink = document.getElementById('generated-link');
        this.btnCopyLink = document.getElementById('btn-copy-link');
        this.btnOpenLink = document.getElementById('btn-open-link');

        // Template modal
        this.templateModal = document.getElementById('template-modal');
        this.templateClose = document.getElementById('template-close');
        this.templateCategories = document.getElementById('template-categories');
        this.templateGrid = document.getElementById('template-grid');

        // History modal
        this.historyModal = document.getElementById('history-modal');
        this.historyClose = document.getElementById('history-close');
        this.historyList = document.getElementById('history-list');
        this.btnClearHistory = document.getElementById('btn-clear-history');

        // Toast
        this.toast = document.getElementById('toast');

        // State
        this.currentStyle = null;
        this.currentTransformed = '';
        this.currentOriginal = '';
        this.myLetters = JSON.parse(localStorage.getItem('lettercraft_letters') || '[]');
        this.autoSaveTimer = null;

        this.init();
    }

    init() {
        // Show app
        this.appContainer.style.display = '';

        // Editor events
        this.letterInput.addEventListener('input', () => this.onInput());
        this.btnClear.addEventListener('click', () => this.onClear());
        this.btnTemplate.addEventListener('click', () => this.openTemplateModal());
        this.btnHistory.addEventListener('click', () => this.openHistoryModal());
        this.btnPrint.addEventListener('click', () => this.onPrint());

        // Style grid
        this.renderStyleGrid();

        // Preview actions
        this.btnGenerate.addEventListener('click', () => this.onGenerateLink());
        this.btnCopy.addEventListener('click', () => this.onCopyText());

        // Link modal
        this.modalClose.addEventListener('click', () => this.closeLinkModal());
        this.linkModal.addEventListener('click', (e) => {
            if (e.target === this.linkModal) this.closeLinkModal();
        });
        this.btnCopyLink.addEventListener('click', () => this.onCopyLink());
        this.btnOpenLink.addEventListener('click', () => this.onOpenLink());

        // Template modal
        this.templateClose.addEventListener('click', () => this.closeTemplateModal());
        this.templateModal.addEventListener('click', (e) => {
            if (e.target === this.templateModal) this.closeTemplateModal();
        });

        // History modal
        this.historyClose.addEventListener('click', () => this.closeHistoryModal());
        this.historyModal.addEventListener('click', (e) => {
            if (e.target === this.historyModal) this.closeHistoryModal();
        });
        this.btnClearHistory.addEventListener('click', () => this.onClearHistory());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S: Save draft
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.onSave();
            }
            // Ctrl/Cmd + D: Clear
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                this.onClear();
            }
            // Ctrl/Cmd + P: Print
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                this.onPrint();
            }
            // Escape: Close modals
            if (e.key === 'Escape') {
                this.closeLinkModal();
                this.closeTemplateModal();
                this.closeHistoryModal();
            }
        });

        // Load saved state
        this.loadDraft();
        this.onInput();
        this.renderTemplates('all');
    }

    // ==================== Style Grid ====================

    renderStyleGrid() {
        const styles = getAllStyles();
        this.styleGrid.innerHTML = styles.map(s => `
            <button class="style-card" data-style="${s.key}" role="option" aria-selected="false">${s.name}</button>
        `).join('');

        this.styleGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.style-card');
            if (!card) return;
            this.onStyleSelect(card.dataset.style);
        });
    }

    updateStyleGrid() {
        document.querySelectorAll('.style-card').forEach(card => {
            const isActive = card.dataset.style === this.currentStyle;
            card.classList.toggle('active', isActive);
            card.setAttribute('aria-selected', isActive);
        });
    }

    // ==================== Editor ====================

    onInput() {
        const text = this.letterInput.value;
        const count = text.replace(/\s/g, '').length;
        this.wordCount.textContent = `${count} 字`;
        
        // Word count warning
        this.wordCount.classList.toggle('warn', count > 3000 && count <= 4500);
        this.wordCount.classList.toggle('error', count > 4500);

        // Auto-save with debounce
        this.debouncedAutoSave();
    }

    debouncedAutoSave() {
        clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = setTimeout(() => this.onSave(), 1000);
    }

    onClear() {
        if (this.letterInput.value.trim() && !confirm('确定要清空吗？')) return;
        this.letterInput.value = '';
        this.onInput();
        this.previewArea.innerHTML = `
            <div class="empty-preview">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
                <p>点击上方风格按钮，预览信件效果</p>
            </div>
        `;
        this.previewActions.style.display = 'none';
        this.currentStyle = null;
        this.currentTransformed = '';
        this.currentOriginal = '';
        this.updateStyleGrid();
        this.showToast('已清空');
    }

    onSave() {
        const text = this.letterInput.value.trim();
        if (!text) return;
        localStorage.setItem('lettercraft_draft', text);
        this.showAutoSaveStatus('已保存');
    }

    showAutoSaveStatus(msg) {
        this.autoSaveStatus.textContent = msg;
        this.autoSaveStatus.classList.add('show');
        setTimeout(() => this.autoSaveStatus.classList.remove('show'), 2000);
    }

    loadDraft() {
        const saved = localStorage.getItem('lettercraft_draft');
        if (saved) {
            this.letterInput.value = saved;
        }
    }

    // ==================== Style Selection ====================

    onStyleSelect(styleKey) {
        const text = this.letterInput.value.trim();
        if (!text) {
            this.showToast('请先写信');
            return;
        }

        this.currentStyle = styleKey;
        this.currentOriginal = text;
        this.currentTransformed = transformer.transform(text, styleKey);

        this.updateStyleGrid();
        this.renderPreview();
        this.previewActions.style.display = 'flex';
    }

    // ==================== Preview ====================

    renderPreview() {
        const styles = getAllStyles();
        const style = styles.find(s => s.key === this.currentStyle);
        const styleName = style ? style.name : this.currentStyle;
        const cssClass = style ? style.cssClass : '';
        const time = new Date().toLocaleString('zh-CN');

        this.previewArea.innerHTML = `
            <div class="preview-letter-card ${cssClass}">
                <div class="preview-letter-header">
                    <div class="preview-letter-logo">
                        <span class="logo-icon">✉</span>
                        <span>LetterCraft</span>
                    </div>
                    <span class="preview-letter-style-badge style-badge ${cssClass}">${styleName}</span>
                </div>
                <div class="preview-letter-content">${this.escapeHtml(this.currentTransformed)}</div>
                <div class="preview-letter-footer">
                    <div class="preview-letter-time">${time}</div>
                </div>
                <div class="preview-letter-watermark">由 LetterCraft 生成</div>
            </div>
        `;
    }

    // ==================== Generate Link ====================

    onGenerateLink() {
        if (!this.currentTransformed) {
            this.showToast('请先选择风格并预览');
            return;
        }

        const styles = getAllStyles();
        const style = styles.find(s => s.key === this.currentStyle);
        const letterObj = {
            styleKey: this.currentStyle,
            styleName: style ? style.name : this.currentStyle,
            content: this.currentTransformed,
            original: this.currentOriginal,
            time: new Date().toLocaleString('zh-CN'),
        };

        // Encode to Base64 URL-safe string
        const json = JSON.stringify(letterObj);
        const base64 = btoa(unescape(encodeURIComponent(json)));
        const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const baseUrl = window.location.origin + window.location.pathname;
        const link = `${baseUrl}?letter=${urlSafe}`;
        this.generatedLink.value = link;

        // Save to history
        this.saveToHistory(letterObj);

        this.linkModal.classList.add('show');
        this.showToast('链接已生成，可分享给任何人');
    }

    saveToHistory(letterObj) {
        const historyItem = {
            ...letterObj,
            id: 'letter_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
        };
        this.myLetters.unshift(historyItem);
        // Keep only last 50
        if (this.myLetters.length > 50) this.myLetters = this.myLetters.slice(0, 50);
        localStorage.setItem('lettercraft_letters', JSON.stringify(this.myLetters));
    }

    closeLinkModal() {
        this.linkModal.classList.remove('show');
    }

    openTemplateModal() {
        this.renderTemplates('all');
        this.templateModal.classList.add('show');
    }

    closeTemplateModal() {
        this.templateModal.classList.remove('show');
    }

    openHistoryModal() {
        this.renderHistory();
        this.historyModal.classList.add('show');
    }

    closeHistoryModal() {
        this.historyModal.classList.remove('show');
    }

    onCopyLink() {
        this.copyToClipboard(this.generatedLink.value);
        this.showToast('链接已复制，可直接分享给朋友');
    }

    onOpenLink() {
        window.open(this.generatedLink.value, '_blank');
    }

    // ==================== Print ====================

    onPrint() {
        if (!this.currentTransformed) {
            this.showToast('请先选择风格并预览');
            return;
        }

        const styles = getAllStyles();
        const style = styles.find(s => s.key === this.currentStyle);
        const styleName = style ? style.name : this.currentStyle;
        const cssClass = style ? style.cssClass : '';
        const time = new Date().toLocaleString('zh-CN');

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>LetterCraft - ${styleName}</title>
                <link href="https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=Noto+Serif+SC:wght@300;400;500;600;700&family=ZCOOL+XiaoWei&family=ZCOOL+KuaiLe&family=Long+Cang&display=swap" rel="stylesheet">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Noto Serif SC', serif; 
                        padding: 40px; 
                        color: #2c2c2c;
                        background: white;
                    }
                    .letter-card {
                        max-width: 700px;
                        margin: 0 auto;
                        padding: 48px 40px;
                        border: 1px solid #e0dcd3;
                        border-radius: 20px;
                        position: relative;
                    }
                    .letter-card::before {
                        content: '';
                        position: absolute;
                        top: 0; left: 0; right: 0;
                        height: 4px;
                        background: linear-gradient(90deg, #d4b08a, #a67c52, #d4b08a);
                    }
                    .letter-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 32px;
                        padding-bottom: 20px;
                        border-bottom: 1px solid #e0dcd3;
                    }
                    .letter-logo {
                        font-family: 'ZCOOL XiaoWei', serif;
                        font-size: 20px;
                        color: #6d4c2e;
                    }
                    .letter-badge {
                        font-size: 13px;
                        padding: 6px 16px;
                        border-radius: 20px;
                        background: #f5f0e8;
                        color: #8b5e3c;
                        font-weight: 600;
                    }
                    .letter-content {
                        font-size: 16px;
                        line-height: 2;
                        white-space: pre-wrap;
                        word-break: break-word;
                    }
                    .letter-time {
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #e0dcd3;
                        font-size: 13px;
                        color: #9a9a9a;
                    }
                    /* Style-specific */
                    .letter-card.literary { background: #fefcff; border-color: #d4c8e8; }
                    .letter-card.literary .letter-content { color: #7b68a8; font-family: 'Ma Shan Zheng', cursive; font-size: 18px; }
                    .letter-card.literary .letter-logo { color: #7b68a8; }
                    .letter-card.literary .letter-badge { background: #f5f0fa; color: #7b68a8; }
                    
                    .letter-card.classical { background: #fffdf5; border-color: #e8dcc0; }
                    .letter-card.classical .letter-content { color: #8b6914; font-family: 'Long Cang', cursive; font-size: 18px; }
                    .letter-card.classical .letter-logo { color: #8b6914; }
                    .letter-card.classical .letter-badge { background: #fdf8e8; color: #8b6914; }
                    
                    .letter-card.humorous .letter-content { color: #e8734a; font-family: 'ZCOOL KuaiLe', cursive; }
                    .letter-card.humorous .letter-badge { background: #fef5f0; color: #e8734a; }
                    
                    .letter-card.cute { background: #fff5f9; border-color: #ffb6c1; }
                    .letter-card.cute .letter-content { color: #ff69b4; font-family: 'ZCOOL KuaiLe', cursive; background: #fff0f5; padding: 20px; border-radius: 12px; }
                    .letter-card.cute .letter-badge { background: #fff0f5; color: #ff69b4; }
                    
                    .letter-card.cyberpunk { background: #0a0a1a; border-color: #00ff88; }
                    .letter-card.cyberpunk .letter-content { color: #00ff88; font-family: 'Courier New', monospace; background: rgba(0,255,136,0.05); padding: 20px; border-radius: 8px; border-left: 3px solid #00ff88; }
                    .letter-card.cyberpunk .letter-logo { color: #00ff88; }
                    .letter-card.cyberpunk .letter-badge { background: #1a1a2e; color: #00ff88; }
                    .letter-card.cyberpunk .letter-header { border-color: #1a3a2a; }
                    .letter-card.cyberpunk .letter-time { color: #5a8a6a; border-color: #1a3a2a; }
                    
                    .letter-card.formal .letter-content { color: #4a6741; }
                    .letter-card.formal .letter-badge { background: #f0f5ed; color: #4a6741; }
                    
                    .letter-card.casual .letter-content { color: #d4856a; }
                    .letter-card.casual .letter-badge { background: #fdf5f0; color: #d4856a; }
                    
                    .letter-card.concise .letter-content { color: #4a7c8f; }
                    .letter-card.concise .letter-badge { background: #edf5f8; color: #4a7c8f; }
                    
                    .letter-card.warm .letter-content { color: #c47a5a; }
                    .letter-card.warm .letter-badge { background: #fdf2ed; color: #c47a5a; }
                    
                    .letter-card.academic .letter-content { color: #3a506b; }
                    .letter-card.academic .letter-badge { background: #eef3f8; color: #3a506b; }
                    
                    .letter-card.official { background: #fafafa; border-color: #d0d0d0; }
                    .letter-card.official .letter-content { color: #333; background: #fff; padding: 20px; border-radius: 4px; border: 1px solid #e0e0e0; }
                    .letter-card.official .letter-badge { background: #f0f0f0; color: #333; }
                    
                    @media print {
                        body { padding: 0; }
                        .letter-card { box-shadow: none; border: none; padding: 40px; }
                        .letter-card::before { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="letter-card ${cssClass}">
                    <div class="letter-header">
                        <div class="letter-logo">✉ LetterCraft</div>
                        <span class="letter-badge">${this.escapeHtml(styleName)}</span>
                    </div>
                    <div class="letter-content">${this.escapeHtml(this.currentTransformed)}</div>
                    <div class="letter-time">${time}</div>
                </div>
                <script>window.onload = () => window.print();<\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    // ==================== Copy Text ====================

    onCopyText() {
        if (!this.currentTransformed) return;
        this.copyToClipboard(this.currentTransformed);
        this.showToast('文字已复制');
    }

    // ==================== Templates ====================

    renderTemplates(category) {
        // Render category buttons
        const categories = [
            { key: 'all', name: '全部' },
            { key: 'business', name: '商务' },
            { key: 'personal', name: '个人' },
            { key: 'social', name: '社交' },
            { key: 'academic', name: '学术' },
        ];
        
        this.templateCategories.innerHTML = categories.map(c => `
            <button class="template-category-btn ${c.key === category ? 'active' : ''}" 
                    data-category="${c.key}">${c.name}</button>
        `).join('');

        this.templateCategories.addEventListener('click', (e) => {
            const btn = e.target.closest('.template-category-btn');
            if (!btn) return;
            this.renderTemplates(btn.dataset.category);
        });

        // Render templates
        const templates = getTemplates(category);
        this.templateGrid.innerHTML = templates.map(t => `
            <div class="template-card" data-id="${t.id}">
                <div class="template-card-header">
                    <span class="template-card-title">${t.title}</span>
                    <span class="template-card-cat">${this.getCategoryName(t.category)}</span>
                </div>
                <div class="template-card-preview">${this.escapeHtml(t.preview)}</div>
                <div class="template-card-footer">点击使用 →</div>
            </div>
        `).join('');

        this.templateGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.template-card');
            if (!card) return;
            this.useTemplate(card.dataset.id);
        });
    }

    getCategoryName(cat) {
        const names = { business: '商务', personal: '个人', academic: '学术', social: '社交' };
        return names[cat] || cat;
    }

    useTemplate(templateId) {
        const template = getTemplateById(templateId);
        if (!template) return;
        this.letterInput.value = template.content;
        this.onInput();
        this.closeTemplateModal();
        this.showToast('模板已加载');
    }

    // ==================== History ====================

    renderHistory() {
        if (this.myLetters.length === 0) {
            this.historyList.innerHTML = `
                <div class="history-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                    </svg>
                    <p>暂无历史记录</p>
                </div>
            `;
            return;
        }

        this.historyList.innerHTML = this.myLetters.map(item => `
            <div class="history-item" data-id="${item.id}">
                <div class="history-item-header">
                    <span class="history-item-style">${this.escapeHtml(item.styleName)}</span>
                    <span class="history-item-time">${item.time || ''}</span>
                </div>
                <div class="history-item-preview">${this.escapeHtml(item.content)}</div>
                <div class="history-item-actions">
                    <button class="btn-secondary btn-history-use" data-id="${item.id}">使用</button>
                    <button class="btn-secondary btn-history-link" data-id="${item.id}">生成链接</button>
                    <button class="btn-secondary btn-history-delete" data-id="${item.id}">删除</button>
                </div>
            </div>
        `).join('');

        this.historyList.addEventListener('click', (e) => {
            const useBtn = e.target.closest('.btn-history-use');
            const linkBtn = e.target.closest('.btn-history-link');
            const deleteBtn = e.target.closest('.btn-history-delete');
            
            if (useBtn) {
                this.useHistoryItem(useBtn.dataset.id);
            } else if (linkBtn) {
                this.generateLinkFromHistory(linkBtn.dataset.id);
            } else if (deleteBtn) {
                this.deleteHistoryItem(deleteBtn.dataset.id);
            }
        });
    }

    useHistoryItem(id) {
        const item = this.myLetters.find(l => l.id === id);
        if (!item) return;
        this.letterInput.value = item.original || item.content;
        this.onInput();
        this.closeHistoryModal();
        this.showToast('已加载历史记录');
    }

    generateLinkFromHistory(id) {
        const item = this.myLetters.find(l => l.id === id);
        if (!item) return;
        
        const json = JSON.stringify(item);
        const base64 = btoa(unescape(encodeURIComponent(json)));
        const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const link = `${window.location.origin + window.location.pathname}?letter=${urlSafe}`;
        
        this.generatedLink.value = link;
        this.closeHistoryModal();
        this.linkModal.classList.add('show');
        this.showToast('链接已生成');
    }

    deleteHistoryItem(id) {
        this.myLetters = this.myLetters.filter(l => l.id !== id);
        localStorage.setItem('lettercraft_letters', JSON.stringify(this.myLetters));
        this.renderHistory();
        this.showToast('已删除');
    }

    onClearHistory() {
        if (!confirm('确定要清空所有历史记录吗？')) return;
        this.myLetters = [];
        localStorage.setItem('lettercraft_letters', '[]');
        this.renderHistory();
        this.showToast('历史记录已清空');
    }

    // ==================== Utilities ====================

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(() => {
                this.fallbackCopy(text);
            });
        } else {
            this.fallbackCopy(text);
        }
    }

    fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
        } catch (e) {
            this.showToast('复制失败，请手动复制');
        }
        document.body.removeChild(textarea);
    }

    showToast(message) {
        this.toast.textContent = message;
        this.toast.classList.add('show');
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            this.toast.classList.remove('show');
        }, 2500);
    }
}

// Initialize app
const app = new LetterCraftApp();
}
