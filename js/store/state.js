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
        // 设置
        settings: {
            autoSave: true,
            autoSaveInterval: 1000,
            maxHistory: MAX_HISTORY,
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

            // 加载用户信息
            const user = localStorage.getItem(STORAGE_KEYS.USER);
            if (user) this._state.user = { ...this._state.user, ...JSON.parse(user) };
        } catch (e) {
            console.warn('Failed to load from storage:', e);
        }
    },
};

// 导出（CDN 模式）
if (typeof window !== 'undefined') {
    window.StateStore = StateStore;
}
