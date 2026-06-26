/**
 * LetterCraft v6.0 - 应用入口
 * 核心流程：写信 → 选风格 → 预览（与最终效果一致）→ 生成分享链接
 * 分享链接使用 Base64 编码，数据嵌入 URL，无需服务器
 */

// Check for letter data in URL FIRST - before app init
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
        // Decode Base64 URL-safe string
        const base64 = letterData.replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(escape(atob(base64)));
        const letter = JSON.parse(json);

        if (letter && letter.content && letter.styleName) {
            document.addEventListener('DOMContentLoaded', () => {
                const cssClass = letter.styleKey || '';
                
                document.body.innerHTML = `
                    <div class="letter-view-page">
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
            document.body.innerHTML = `
                <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f2ed; padding: 20px;">
                    <div style="text-align: center; color: #9a9a9a;">
                        <p style="font-size: 18px; margin-bottom: 8px;">链接无效或已过期</p>
                        <p style="font-size: 14px;"><a href="${window.location.pathname}" style="color: #8b5e3c; text-decoration: none;">去写信</a></p>
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
        this.letterInput = document.getElementById('letter-input');
        this.wordCount = document.getElementById('word-count');
        this.btnClear = document.getElementById('btn-clear');

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

        // Toast
        this.toast = document.getElementById('toast');

        // State
        this.currentStyle = null;
        this.currentTransformed = '';
        this.currentOriginal = '';

        this.init();
    }

    init() {
        // Editor events
        this.letterInput.addEventListener('input', () => this.onInput());
        this.btnClear.addEventListener('click', () => this.onClear());

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

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeLinkModal();
            }
        });

        // Load saved draft
        this.loadDraft();
        this.onInput();
    }

    // ==================== Style Grid ====================

    renderStyleGrid() {
        const styles = getAllStyles();
        this.styleGrid.innerHTML = styles.map(s => `
            <button class="style-card" data-style="${s.key}">${s.name}</button>
        `).join('');

        this.styleGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.style-card');
            if (!card) return;
            this.onStyleSelect(card.dataset.style);
        });
    }

    updateStyleGrid() {
        document.querySelectorAll('.style-card').forEach(card => {
            card.classList.toggle('active', card.dataset.style === this.currentStyle);
        });
    }

    // ==================== Editor ====================

    onInput() {
        const text = this.letterInput.value;
        const count = text.replace(/\s/g, '').length;
        this.wordCount.textContent = `${count} 字`;
        
        // Auto-save draft
        localStorage.setItem('lettercraft_draft', text);
    }

    onClear() {
        if (this.letterInput.value.trim() && !confirm('确定要清空吗？')) return;
        this.letterInput.value = '';
        this.onInput();
        this.previewArea.innerHTML = `
            <div class="empty-preview">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
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

    // ==================== Preview (与分享查看页完全一致) ====================

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
                    <span class="preview-letter-style-badge">${styleName}</span>
                </div>
                
                <div class="preview-letter-content">${this.escapeHtml(this.currentTransformed)}</div>
                
                <div class="preview-letter-footer">
                    <div class="preview-letter-time">${time}</div>
                </div>
                
                <div class="preview-letter-watermark">
                    由 LetterCraft 生成
                </div>
            </div>
        `;
    }

    // ==================== Generate Link ====================

    onGenerateLink() {
        if (!this.currentTransformed) {
            this.showToast('请先选择风格并预览');
            return;
        }

        // Create letter data object
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

        // Generate link with encoded data
        const baseUrl = window.location.origin + window.location.pathname;
        const link = `${baseUrl}?letter=${urlSafe}`;
        this.generatedLink.value = link;

        // Show modal
        this.linkModal.classList.add('show');

        this.showToast('链接已生成，可分享给任何人');
    }

    closeLinkModal() {
        this.linkModal.classList.remove('show');
    }

    onCopyLink() {
        this.copyToClipboard(this.generatedLink.value);
        this.showToast('链接已复制');
    }

    // ==================== Copy Text ====================

    onCopyText() {
        if (!this.currentTransformed) return;
        this.copyToClipboard(this.currentTransformed);
        this.showToast('文字已复制');
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
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }

    showToast(message) {
        this.toast.textContent = message;
        this.toast.classList.add('show');
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 2000);
    }
}

// Initialize app
const app = new LetterCraftApp();
}
