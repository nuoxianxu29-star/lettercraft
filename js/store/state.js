/**
 * 状态管理模块 - State Store
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
};

const MAX_HISTORY = 100;

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
        // 设置
        settings: {
            autoSave: true,
            autoSaveInterval: 1000,
            maxHistory: MAX_HISTORY,
            defaultStyle: null,
            theme: 'light',
            fontSize: 18,
        },
        // UI 状态
        ui: {
            showLinkModal: false,
            showTemplateModal: false,
            showHistoryModal: false,
            showUserModal: false,
            showToast: false,
            toastMessage: '',
            toastType: 'info', // info, success, error, warning
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
        };
        this._state.history.unshift(historyItem);
        // 限制历史记录数量
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

    /**
     * 创建新文档
     */
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

    /**
     * 切换文档
     */
    switchDocument(docId) {
        const doc = this._state.documents.find(d => d.id === docId);
        if (!doc) return;

        // 保存当前文档
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

    /**
     * 保存当前文档
     */
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

    /**
     * 删除文档
     */
    deleteDocument(docId) {
        const idx = this._state.documents.findIndex(d => d.id === docId);
        if (idx === -1) return;

        this._state.documents.splice(idx, 1);

        // 如果删除的是当前文档，切换到第一个或创建新的
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

    /**
     * 重命名文档
     */
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

    /**
     * 添加收藏
     */
    addFavorite(item) {
        const exists = this._state.favorites.some(f => f.id === item.id);
        if (exists) return;
        this._state.favorites.unshift(item);
        this._notify('favorites', this._state.favorites);
        this._saveFavorites();
    },

    /**
     * 移除收藏
     */
    removeFavorite(id) {
        const idx = this._state.favorites.findIndex(f => f.id === id);
        if (idx === -1) return;
        this._state.favorites.splice(idx, 1);
        this._notify('favorites', this._state.favorites);
        this._saveFavorites();
    },

    /**
     * 更新用户信息
     */
    updateUser(userData) {
        this._state.user = { ...this._state.user, ...userData };
        this._notify('user', this._state.user);
        this._saveUser();
    },

    /**
     * 更新 UI 状态
     */
    updateUI(updates) {
        Object.assign(this._state.ui, updates);
        this._notify('ui', this._state.ui);
    },

    /**
     * 显示 Toast
     */
    showToast(message, type = 'info') {
        this._state.ui.toastMessage = message;
        this._state.ui.toastType = type;
        this._state.ui.showToast = true;
        this._notify('ui', this._state.ui);
    },

    /**
     * 隐藏 Toast
     */
    hideToast() {
        this._state.ui.showToast = false;
        this._notify('ui.showToast', false);
    },

    /**
     * 重置编辑器
     */
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

    /**
     * 注册状态变化监听器
     */
    subscribe(callback) {
        this._listeners.push(callback);
        return () => {
            this._listeners = this._listeners.filter(l => l !== callback);
        };
    },

    /**
     * 导出状态快照
     */
    exportSnapshot() {
        return JSON.parse(JSON.stringify(this._state));
    },

    /**
     * 从快照恢复
     */
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
        try {
            localStorage.setItem(STORAGE_KEYS.DRAFT, this._state.editor.content);
        } catch (e) {
            console.warn('Failed to save draft:', e);
        }
    },

    _saveHistory() {
        try {
            localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(this._state.history));
        } catch (e) {
            console.warn('Failed to save history:', e);
        }
    },

    _saveDocuments() {
        try {
            localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(this._state.documents));
        } catch (e) {
            console.warn('Failed to save documents:', e);
        }
    },

    _saveFavorites() {
        try {
            localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(this._state.favorites));
        } catch (e) {
            console.warn('Failed to save favorites:', e);
        }
    },

    _saveUser() {
        try {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this._state.user));
        } catch (e) {
            console.warn('Failed to save user:', e);
        }
    },

    _loadFromStorage() {
        try {
            // 加载草稿
            const draft = localStorage.getItem(STORAGE_KEYS.DRAFT);
            if (draft) this._state.editor.content = draft;

            // 加载历史记录
            const history = localStorage.getItem(STORAGE_KEYS.HISTORY);
            if (history) this._state.history = JSON.parse(history);

            // 加载文档
            const documents = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
            if (documents) this._state.documents = JSON.parse(documents);

            // 加载收藏夹
            const favorites = localStorage.getItem(STORAGE_KEYS.FAVORITES);
            if (favorites) this._state.favorites = JSON.parse(favorites);

            // 加载用户信息
            const user = localStorage.getItem(STORAGE_KEYS.USER);
            if (user) this._state.user = { ...this._state.user, ...JSON.parse(user) };

            // 加载设置
            const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            if (settings) this._state.settings = { ...this._state.settings, ...JSON.parse(settings) };
        } catch (e) {
            console.warn('Failed to load from storage:', e);
        }
    },
};

// 导出（CDN 模式）
if (typeof window !== 'undefined') {
    window.StateStore = StateStore;
}
