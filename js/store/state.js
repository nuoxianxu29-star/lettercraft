/**
 * 状态管理模块 - State Store v53.0
 * 集中式状态管理，替代分散的 localStorage 操作
 * 支持响应式状态、持久化、状态快照
 */

const STORAGE_KEYS = {
    DRAFT: 'textcraft_draft',
    HISTORY: 'textcraft_history',
    USER: 'textcraft_user',
    SETTINGS: 'textcraft_settings',
    DOCUMENTS: 'textcraft_documents',
    FAVORITES: 'textcraft_favorites',
    TAGS: 'textcraft_tags',
    PHRASES: 'textcraft_phrases',
    VERSIONS: 'textcraft_versions',
    CUSTOM_TEMPLATES: 'textcraft_custom_templates',
    UNDO_STACK: 'textcraft_undo_stack',
};

const MAX_HISTORY = 100;
const MAX_UNDO = 50;
const MAX_VERSIONS = 20;

// 初始状态
function createInitialState() {
    return {
        // 编辑器状态
        editor: {
            content: '',
            wordCount: 0,
            isDirty: false,
            currentDocId: null,
        },
        // 转换状态
        transformer: {
            currentStyle: null,
            currentTransformed: '',
            currentOriginal: '',
        },
        // 用户状态
        user: {
            id: null,
            name: null,
            createdAt: null,
        },
        // 历史记录
        history: [],
        // 文档管理
        documents: [],
        // 收藏夹
        favorites: [],
        // v17.0: 标签系统
        tags: [],
        // v33.0: 快捷短语
        phrases: [
            { id: 'p1', text: '此致敬礼', category: '结尾' },
            { id: 'p2', text: '顺颂商祺', category: '结尾' },
            { id: 'p3', text: '尊敬的', category: '开头' },
            { id: 'p4', text: '亲爱的', category: '开头' },
        ],
        // v32.0: 自定义模板
        customTemplates: [],
        // v30.0: 版本历史
        versions: [],
        // v26.0: 撤销/重做栈
        undoStack: [],
        redoStack: [],
        // 设置
        settings: {
            autoSave: true,
            autoSaveInterval: 1000,
            maxHistory: MAX_HISTORY,
            defaultStyle: null,
            theme: 'light',
            fontSize: 18,
            // v44.0: 主题自定义
            customTheme: null,
            // v45.0: 字体大小
            editorFontSize: 18,
            // v46.0: 行距
            lineHeight: 2,
            // v47.0: 段落缩进
            textIndent: 0,
            // v48.0: 文本对齐
            textAlign: 'left',
            // v52.0: 水印
            watermark: { enabled: false, text: '' },
        },
        // UI 状态
        ui: {
            showLinkModal: false,
            showTemplateModal: false,
            showHistoryModal: false,
            showUserModal: false,
            showToast: false,
            toastMessage: '',
            toastType: 'info',
        },
    };
}

// 状态管理器
const StateStore = {
    _state: null,
    _listeners: [],
    _saveTimer: null,

    /**
     * 初始化状态（从 localStorage 恢复）
     */
    init() {
        this._state = createInitialState();
        this._loadFromStorage();
        this._updateWordCount();
        return this._state;
    },

    /**
     * 获取完整状态
     */
    getState() {
        return this._state;
    },

    /**
     * 获取嵌套状态
     */
    get(path) {
        return path.split('.').reduce((obj, key) => obj && obj[key], this._state);
    },

    /**
     * 设置状态（支持路径）
     */
    set(path, value) {
        const keys = path.split('.');
        const last = keys.pop();
        const target = keys.reduce((obj, key) => obj[key], this._state);
        if (target) {
            target[last] = value;
            this._notify(path, value);
            this._scheduleSave();
        }
    },

    /**
     * 批量更新状态
     */
    batchSet(updates) {
        for (const [path, value] of Object.entries(updates)) {
            this.set(path, value);
        }
    },

    /**
     * 编辑器内容更新
     */
    updateContent(content) {
        // v26.0: 保存撤销栈
        this._pushUndo(this._state.editor.content);
        this._state.editor.content = content;
        this._state.editor.isDirty = true;
        this._updateWordCount();
        this._notify('editor.content', content);
        this._scheduleSave();
    },

    /**
     * 转换结果更新
     */
    updateTransform(styleKey, transformed, original) {
        this._state.transformer.currentStyle = styleKey;
        this._state.transformer.currentTransformed = transformed;
        this._state.transformer.currentOriginal = original;
        this._notify('transformer', this._state.transformer);
    },

    /**
     * 添加历史记录
     */
    addToHistory(item) {
        const historyItem = {
            ...item,
            id: this._generateId(),
            createdAt: new Date().toISOString(),
            // v17.0: 标签
            tags: item.tags || [],
            // v18.0: 收藏标记
            isFavorite: false,
        };
        this._state.history.unshift(historyItem);
        if (this._state.history.length > this._state.settings.maxHistory) {
            this._state.history = this._state.history.slice(0, this._state.settings.maxHistory);
        }
        this._notify('history', this._state.history);
        this._saveHistory();
    },

    /**
     * 删除历史记录
     */
    deleteHistoryItem(id) {
        this._state.history = this._state.history.filter(item => item.id !== id);
        this._notify('history', this._state.history);
        this._saveHistory();
    },

    /**
     * 清空历史记录
     */
    clearHistory() {
        this._state.history = [];
        this._notify('history', this._state.history);
        this._saveHistory();
    },

    // ==================== 文档管理 ====================

    createDocument(name = '未命名文档') {
        const doc = {
            id: Date.now().toString(),
            name,
            content: '',
            style: null,
            transformed: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this._state.documents.unshift(doc);
        this._state.editor.currentDocId = doc.id;
        this._state.editor.content = '';
        this._notify('documents', this._state.documents);
        this._saveDocuments();
        return doc;
    },

    switchDocument(docId) {
        const doc = this._state.documents.find(d => d.id === docId);
        if (!doc) return;
        if (this._state.editor.currentDocId) {
            this.saveCurrentDocument();
        }
        this._state.editor.currentDocId = doc.id;
        this._state.editor.content = doc.content;
        this._state.transformer.currentStyle = doc.style;
        this._state.transformer.currentTransformed = doc.transformed;
        this._updateWordCount();
        this._notify('editor', this._state.editor);
        this._notify('transformer', this._state.transformer);
    },

    saveCurrentDocument() {
        const docId = this._state.editor.currentDocId;
        if (!docId) return;
        const doc = this._state.documents.find(d => d.id === docId);
        if (doc) {
            doc.content = this._state.editor.content;
            doc.style = this._state.transformer.currentStyle;
            doc.transformed = this._state.transformer.currentTransformed;
            doc.updatedAt = new Date().toISOString();
            this._saveDocuments();
        }
    },

    deleteDocument(docId) {
        const idx = this._state.documents.findIndex(d => d.id === docId);
        if (idx === -1) return;
        this._state.documents.splice(idx, 1);
        if (this._state.editor.currentDocId === docId) {
            if (this._state.documents.length > 0) {
                this.switchDocument(this._state.documents[0].id);
            } else {
                this.createDocument();
            }
        }
        this._notify('documents', this._state.documents);
        this._saveDocuments();
    },

    renameDocument(docId, newName) {
        const doc = this._state.documents.find(d => d.id === docId);
        if (doc) {
            doc.name = newName;
            doc.updatedAt = new Date().toISOString();
            this._notify('documents', this._state.documents);
            this._saveDocuments();
        }
    },

    // ==================== 收藏夹 ====================

    addFavorite(item) {
        const exists = this._state.favorites.some(f => f.id === item.id);
        if (exists) return;
        this._state.favorites.unshift(item);
        this._notify('favorites', this._state.favorites);
        this._saveFavorites();
    },

    removeFavorite(id) {
        const idx = this._state.favorites.findIndex(f => f.id === id);
        if (idx === -1) return;
        this._state.favorites.splice(idx, 1);
        this._notify('favorites', this._state.favorites);
        this._saveFavorites();
    },

    toggleFavoriteHistory(id) {
        const item = this._state.history.find(h => h.id === id);
        if (item) {
            item.isFavorite = !item.isFavorite;
            this._notify('history', this._state.history);
            this._saveHistory();
        }
    },

    // ==================== v17.0: 标签系统 ====================

    addTag(tag) {
        const exists = this._state.tags.find(t => t.name === tag.name);
        if (exists) return exists;
        const newTag = { ...tag, id: this._generateId(), count: 0, color: this._randomTagColor() };
        this._state.tags.push(newTag);
        this._notify('tags', this._state.tags);
        this._saveTags();
        return newTag;
    },

    removeTag(tagId) {
        this._state.tags = this._state.tags.filter(t => t.id !== tagId);
        this._notify('tags', this._state.tags);
        this._saveTags();
    },

    assignTagToHistory(historyId, tagId) {
        const item = this._state.history.find(h => h.id === historyId);
        const tag = this._state.tags.find(t => t.id === tagId);
        if (item && tag) {
            if (!item.tags) item.tags = [];
            if (!item.tags.includes(tagId)) {
                item.tags.push(tagId);
                tag.count = (tag.count || 0) + 1;
            }
            this._notify('history', this._state.history);
            this._notify('tags', this._state.tags);
            this._saveHistory();
            this._saveTags();
        }
    },

    removeTagFromHistory(historyId, tagId) {
        const item = this._state.history.find(h => h.id === historyId);
        const tag = this._state.tags.find(t => t.id === tagId);
        if (item && tag && item.tags) {
            item.tags = item.tags.filter(t => t !== tagId);
            tag.count = Math.max(0, (tag.count || 0) - 1);
            this._notify('history', this._state.history);
            this._notify('tags', this._state.tags);
            this._saveHistory();
            this._saveTags();
        }
    },

    // ==================== v26.0: 撤销/重做 ====================

    _pushUndo(content) {
        if (!content && content !== '') return;
        this._state.undoStack.push({ content, timestamp: Date.now() });
        if (this._state.undoStack.length > MAX_UNDO) this._state.undoStack.shift();
        this._state.redoStack = [];
    },

    undo() {
        if (this._state.undoStack.length <= 1) return null;
        const current = this._state.undoStack.pop();
        this._state.redoStack.push(current);
        const prev = this._state.undoStack[this._state.undoStack.length - 1];
        return prev ? prev.content : '';
    },

    redo() {
        if (this._state.redoStack.length === 0) return null;
        const next = this._state.redoStack.pop();
        this._state.undoStack.push(next);
        return next.content;
    },

    // ==================== v30.0: 版本历史 ====================

    saveVersion(note = '') {
        const version = {
            id: this._generateId(),
            content: this._state.editor.content,
            note,
            timestamp: new Date().toISOString(),
            wordCount: this._state.editor.wordCount,
        };
        this._state.versions.unshift(version);
        if (this._state.versions.length > MAX_VERSIONS) {
            this._state.versions = this._state.versions.slice(0, MAX_VERSIONS);
        }
        this._notify('versions', this._state.versions);
        this._saveVersions();
    },

    restoreVersion(versionId) {
        const version = this._state.versions.find(v => v.id === versionId);
        if (version) {
            this._state.editor.content = version.content;
            this._updateWordCount();
            this._notify('editor.content', version.content);
        }
    },

    deleteVersion(versionId) {
        this._state.versions = this._state.versions.filter(v => v.id !== versionId);
        this._notify('versions', this._state.versions);
        this._saveVersions();
    },

    // ==================== v32.0: 自定义模板 ====================

    addCustomTemplate(template) {
        const tpl = { ...template, id: this._generateId(), createdAt: new Date().toISOString() };
        this._state.customTemplates.push(tpl);
        this._notify('customTemplates', this._state.customTemplates);
        this._saveCustomTemplates();
        return tpl;
    },

    deleteCustomTemplate(id) {
        this._state.customTemplates = this._state.customTemplates.filter(t => t.id !== id);
        this._notify('customTemplates', this._state.customTemplates);
        this._saveCustomTemplates();
    },

    // ==================== v33.0: 快捷短语 ====================

    addPhrase(phrase) {
        const p = { ...phrase, id: this._generateId() };
        this._state.phrases.push(p);
        this._notify('phrases', this._state.phrases);
        this._savePhrases();
    },

    deletePhrase(id) {
        this._state.phrases = this._state.phrases.filter(p => p.id !== id);
        this._notify('phrases', this._state.phrases);
        this._savePhrases();
    },

    // ==================== 通用 ====================

    updateUser(userData) {
        this._state.user = { ...this._state.user, ...userData };
        this._notify('user', this._state.user);
        this._saveUser();
    },

    updateUI(updates) {
        Object.assign(this._state.ui, updates);
        this._notify('ui', this._state.ui);
    },

    showToast(message, type = 'info') {
        this._state.ui.toastMessage = message;
        this._state.ui.toastType = type;
        this._state.ui.showToast = true;
        this._notify('ui', this._state.ui);
    },

    hideToast() {
        this._state.ui.showToast = false;
        this._notify('ui.showToast', false);
    },

    resetEditor() {
        this._state.editor.content = '';
        this._state.editor.isDirty = false;
        this._state.transformer.currentStyle = null;
        this._state.transformer.currentTransformed = '';
        this._state.transformer.currentOriginal = '';
        this._updateWordCount();
        this._notify('editor', this._state.editor);
        this._notify('transformer', this._state.transformer);
    },

    subscribe(callback) {
        this._listeners.push(callback);
        return () => { this._listeners = this._listeners.filter(l => l !== callback); };
    },

    exportSnapshot() {
        return JSON.parse(JSON.stringify(this._state));
    },

    importSnapshot(snapshot) {
        this._state = { ...createInitialState(), ...snapshot };
        this._updateWordCount();
        this._notify('*', this._state);
    },

    // ==================== 内部方法 ====================

    _updateWordCount() {
        this._state.editor.wordCount = this._state.editor.content.replace(/\s/g, '').length;
    },

    _generateId() {
        return 'tc_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    },

    _randomTagColor() {
        const colors = ['#8b5e3c', '#7b68a8', '#4a7c8f', '#c47a5a', '#5a8f5a', '#c45a5a', '#d4a05a', '#00ff88'];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    _notify(path, value) {
        this._listeners.forEach(cb => cb(path, value));
    },

    _scheduleSave() {
        if (this._state.settings.autoSave) {
            clearTimeout(this._saveTimer);
            this._saveTimer = setTimeout(() => this._saveDraft(), this._state.settings.autoSaveInterval);
        }
    },

    _saveDraft() {
        try { localStorage.setItem(STORAGE_KEYS.DRAFT, this._state.editor.content); } catch (e) { console.warn('Failed to save draft:', e); }
    },

    _saveHistory() {
        try { localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(this._state.history)); } catch (e) { console.warn('Failed to save history:', e); }
    },

    _saveDocuments() {
        try { localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(this._state.documents)); } catch (e) { console.warn('Failed to save documents:', e); }
    },

    _saveFavorites() {
        try { localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(this._state.favorites)); } catch (e) { console.warn('Failed to save favorites:', e); }
    },

    _saveUser() {
        try { localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this._state.user)); } catch (e) { console.warn('Failed to save user:', e); }
    },

    _saveTags() {
        try { localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(this._state.tags)); } catch (e) { console.warn('Failed to save tags:', e); }
    },

    _savePhrases() {
        try { localStorage.setItem(STORAGE_KEYS.PHRASES, JSON.stringify(this._state.phrases)); } catch (e) { console.warn('Failed to save phrases:', e); }
    },

    _saveVersions() {
        try { localStorage.setItem(STORAGE_KEYS.VERSIONS, JSON.stringify(this._state.versions)); } catch (e) { console.warn('Failed to save versions:', e); }
    },

    _saveCustomTemplates() {
        try { localStorage.setItem(STORAGE_KEYS.CUSTOM_TEMPLATES, JSON.stringify(this._state.customTemplates)); } catch (e) { console.warn('Failed to save custom templates:', e); }
    },

    _loadFromStorage() {
        try {
            const draft = localStorage.getItem(STORAGE_KEYS.DRAFT);
            if (draft) this._state.editor.content = draft;

            const history = localStorage.getItem(STORAGE_KEYS.HISTORY);
            if (history) this._state.history = JSON.parse(history);

            const documents = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
            if (documents) this._state.documents = JSON.parse(documents);

            const favorites = localStorage.getItem(STORAGE_KEYS.FAVORITES);
            if (favorites) this._state.favorites = JSON.parse(favorites);

            const user = localStorage.getItem(STORAGE_KEYS.USER);
            if (user) this._state.user = { ...this._state.user, ...JSON.parse(user) };

            const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            if (settings) this._state.settings = { ...this._state.settings, ...JSON.parse(settings) };

            const tags = localStorage.getItem(STORAGE_KEYS.TAGS);
            if (tags) this._state.tags = JSON.parse(tags);

            const phrases = localStorage.getItem(STORAGE_KEYS.PHRASES);
            if (phrases) this._state.phrases = JSON.parse(phrases);

            const versions = localStorage.getItem(STORAGE_KEYS.VERSIONS);
            if (versions) this._state.versions = JSON.parse(versions);

            const customTemplates = localStorage.getItem(STORAGE_KEYS.CUSTOM_TEMPLATES);
            if (customTemplates) this._state.customTemplates = JSON.parse(customTemplates);
        } catch (e) {
            console.warn('Failed to load from storage:', e);
        }
    },
};

if (typeof window !== 'undefined') {
    window.StateStore = StateStore;
}
