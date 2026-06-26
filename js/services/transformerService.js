/**
 * 文本转换服务 - Transformer Service
 * 封装所有文本转换逻辑，支持多种转换模式
 * 可扩展：未来可接入 AI API
 */

const TransformerService = {
    /**
     * 执行文本转换
     * @param {string} text - 原始文本
     * @param {string} styleKey - 风格键名
     * @returns {string} 转换后的文本
     */
    transform(text, styleKey) {
        if (!text || !styleKey) return text;

        // 使用底层 transformer 进行转换
        if (typeof transformer !== 'undefined' && transformer.transform) {
            return transformer.transform(text, styleKey);
        }

        // 降级：直接返回原文
        return text;
    },

    /**
     * 批量转换（多风格预览）
     * @param {string} text - 原始文本
     * @param {string[]} styleKeys - 风格键名数组
     * @returns {Object} { styleKey: transformedText }
     */
    transformBatch(text, styleKeys) {
        const results = {};
        for (const key of styleKeys) {
            results[key] = this.transform(text, key);
        }
        return results;
    },

    /**
     * 获取风格信息
     * @param {string} styleKey
     * @returns {Object|null}
     */
    getStyleInfo(styleKey) {
        if (typeof getAllStyles !== 'undefined') {
            return getAllStyles().find(s => s.key === styleKey) || null;
        }
        return null;
    },

    /**
     * 获取所有可用风格
     * @returns {Array}
     */
    getAvailableStyles() {
        if (typeof getAllStyles !== 'undefined') {
            return getAllStyles();
        }
        return [];
    },

    /**
     * 生成分享链接
     * @param {Object} letterData - 信件数据
     * @returns {string} 分享链接
     */
    generateShareLink(letterData) {
        const json = JSON.stringify(letterData);
        const base64 = btoa(unescape(encodeURIComponent(json)));
        const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        return `${window.location.origin}${window.location.pathname}?letter=${urlSafe}`;
    },

    /**
     * 解析分享链接
     * @param {string} url - 包含 letter 参数的 URL
     * @returns {Object|null} 解析后的信件数据
     */
    parseShareLink(url) {
        try {
            const params = new URLSearchParams(new URL(url).search);
            const letterData = params.get('letter');
            if (!letterData) return null;

            const base64 = letterData.replace(/-/g, '+').replace(/_/g, '/');
            const json = decodeURIComponent(escape(atob(base64)));
            return JSON.parse(json);
        } catch (e) {
            console.warn('Failed to parse share link:', e);
            return null;
        }
    },

    /**
     * 导出为 JSON
     * @param {Object} letterData
     * @returns {string} JSON 字符串
     */
    exportJSON(letterData) {
        return JSON.stringify(letterData, null, 2);
    },

    /**
     * 导出为纯文本
     * @param {Object} letterData
     * @returns {string} 纯文本
     */
    exportPlainText(letterData) {
        return letterData.content || '';
    },
};

// 导出
if (typeof window !== 'undefined') {
    window.TransformerService = TransformerService;
}
