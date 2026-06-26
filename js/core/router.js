/**
 * 路由管理模块 - Router
 * 处理 URL 路由、分享链接解析、视图切换
 */

const Router = {
    _routes: {},
    _currentRoute: null,
    _listeners: [],

    /**
     * 注册路由
     */
    register(path, handler) {
        this._routes[path] = handler;
    },

    /**
     * 导航到指定路由
     */
    navigate(path) {
        window.history.pushState({}, '', path);
        this._handleRoute();
    },

    /**
     * 初始化路由监听
     */
    init() {
        window.addEventListener('popstate', () => this._handleRoute());
        this._handleRoute();
    },

    /**
     * 获取当前路由
     */
    getCurrentRoute() {
        return this._currentRoute;
    },

    /**
     * 注册路由变化监听器
     */
    onRouteChange(callback) {
        this._listeners.push(callback);
        return () => {
            this._listeners = this._listeners.filter(l => l !== callback);
        };
    },

    /**
     * 获取 URL 参数
     */
    getParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params.entries()) {
            result[key] = value;
        }
        return result;
    },

    /**
     * 检查是否为信件查看模式
     */
    isLetterView() {
        const params = this.getParams();
        return !!params.letter;
    },

    /**
     * 解析信件数据
     */
    parseLetterData() {
        const params = this.getParams();
        if (!params.letter) return null;

        try {
            const base64 = params.letter.replace(/-/g, '+').replace(/_/g, '/');
            const json = decodeURIComponent(escape(atob(base64)));
            return JSON.parse(json);
        } catch (e) {
            console.warn('Failed to parse letter data:', e);
            return null;
        }
    },

    /**
     * 内部路由处理
     */
    _handleRoute() {
        const path = window.location.pathname;
        const params = this.getParams();
        
        this._currentRoute = { path, params, query: params };
        
        // 通知所有监听器
        this._listeners.forEach(cb => cb(this._currentRoute));

        // 匹配路由
        for (const [routePath, handler] of Object.entries(this._routes)) {
            if (this._matchRoute(routePath, path)) {
                handler(params);
                return;
            }
        }
    },

    /**
     * 路由匹配
     */
    _matchRoute(pattern, path) {
        if (pattern === path) return true;
        if (pattern === '*' ) return true;
        return false;
    },
};

// 导出
if (typeof window !== 'undefined') {
    window.Router = Router;
}
