/**
 * AI 文本处理服务 - AI Service Layer
 * 可扩展的 AI 接口，支持多种大模型 API
 * 当前：基于规则的转换（本地模式）
 * 未来：接入 OpenAI / 国内大模型 API
 * 
 * 架构：
 * 用户输入 → Prompt Builder → LLM API → Post Processor → UI Render
 */

const AIService = {
    // 支持的模型列表
    models: [
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', icon: '🟢' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', icon: '🟢' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', icon: '🟢' },
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', icon: '🟣' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'Anthropic', icon: '🟣' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', icon: '🔵' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google', icon: '🔵' },
        { id: 'qwen-plus', name: 'Qwen Plus', provider: '阿里云', icon: '🟠' },
        { id: 'qwen-turbo', name: 'Qwen Turbo', provider: '阿里云', icon: '🟠' },
        { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek', icon: '🔴' },
    ],

    // 配置
    config: {
        mode: 'local', // 'local' | 'api'
        apiKey: '',
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 2000,
    },

    /**
     * Prompt 模板系统
     * 核心亮点：可扩展的 Prompt 工作流架构
     */
    prompts: {
        // 风格转换
        styleTransform: {
            system: "你是一个专业的文本风格转换专家。请将用户输入的文本转换为指定风格，保持原意不变。",
            user: "请将以下文本转换为「{styleName}」风格：\n\n原文：\n{input}\n\n要求：\n1. 保持原文的核心意思\n2. 使用{styleName}风格的词汇和句式\n3. 输出转换后的完整文本",
        },
        // 文本润色
        polish: {
            system: "你是一个专业的文字编辑，擅长润色和优化文本。",
            user: "请润色以下文本，使其更加流畅、专业：\n\n{input}",
        },
        // 摘要生成
        summarize: {
            system: "你是一个专业的摘要生成专家。",
            user: "请为以下文本生成简洁的摘要（不超过100字）：\n\n{input}",
        },
        // 扩写
        expand: {
            system: "你是一个专业的创意写作助手。",
            user: "请将以下文本扩写为更详细、更丰富的内容：\n\n{input}",
        },
        // 翻译
        translate: {
            system: "你是一个专业的翻译专家。",
            user: "请将以下文本翻译为{targetLanguage}：\n\n{input}",
        },
        // 格式化
        format: {
            system: "你是一个专业的文本格式化专家。",
            user: "请将以下文本格式化为结构化的文档：\n\n{input}",
        },
        // 语气调整
        toneAdjust: {
            system: "你是一个专业的语气调整专家。",
            user: "请将以下文本的语气调整为{tone}：\n\n{input}",
        },
    },

    /**
     * 初始化配置
     */
    init(config = {}) {
        Object.assign(this.config, config);
    },

    /**
     * 执行 AI 文本处理
     * @param {string} input - 输入文本
     * @param {string} task - 任务类型（styleTransform, polish, summarize, etc.）
     * @param {Object} params - 任务参数
     * @returns {Promise<string>} 处理结果
     */
    async process(input, task = 'styleTransform', params = {}) {
        if (this.config.mode === 'api') {
            return this._callAPI(input, task, params);
        }
        // 本地模式：使用规则引擎
        return this._processLocal(input, task, params);
    },

    /**
     * 构建 Prompt
     */
    buildPrompt(task, params) {
        const promptTemplate = this.prompts[task];
        if (!promptTemplate) {
            throw new Error(`Unknown task: ${task}`);
        }

        const { system, user } = promptTemplate;
        const filledUser = this._fillTemplate(user, params);

        return { system, user: filledUser };
    },

    /**
     * 批量处理
     */
    async batchProcess(input, tasks) {
        const results = {};
        for (const [task, params] of Object.entries(tasks)) {
            try {
                results[task] = await this.process(input, task, params);
            } catch (e) {
                results[task] = { error: e.message };
            }
        }
        return results;
    },

    /**
     * 获取可用任务列表
     */
    getAvailableTasks() {
        return Object.keys(this.prompts).map(key => ({
            key,
            name: this._getTaskName(key),
            description: this._getTaskDescription(key),
        }));
    },

    /**
     * 获取可用模型列表
     */
    getAvailableModels() {
        return this.models;
    },

    /**
     * 获取当前配置
     */
    getConfig() {
        return { ...this.config };
    },

    /**
     * 更新配置
     */
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        this._saveConfig();
    },

    /**
     * 保存配置到 localStorage
     */
    _saveConfig() {
        try {
            localStorage.setItem('textcraft_ai_config', JSON.stringify(this.config));
        } catch (e) {
            console.warn('Failed to save AI config:', e);
        }
    },

    /**
     * 从 localStorage 加载配置
     */
    _loadConfig() {
        try {
            const saved = localStorage.getItem('textcraft_ai_config');
            if (saved) {
                Object.assign(this.config, JSON.parse(saved));
            }
        } catch (e) {
            console.warn('Failed to load AI config:', e);
        }
    },

    // ==================== 内部方法 ====================

    async _callAPI(input, task, params) {
        const { system, user } = this.buildPrompt(task, { input, ...params });

        try {
            const response = await fetch(this.config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user },
                    ],
                    temperature: this.config.temperature,
                    max_tokens: this.config.maxTokens,
                }),
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || data.output || '';
        } catch (e) {
            console.error('AI API call failed:', e);
            // Fallback to local processing
            return this._processLocal(input, task, params);
        }
    },

    _processLocal(input, task, params) {
        // 本地模式：使用现有的 transformer 进行风格转换
        if (task === 'styleTransform' && params.styleKey) {
            if (typeof TransformerService !== 'undefined') {
                return TransformerService.transform(input, params.styleKey);
            }
            if (typeof transformer !== 'undefined') {
                return transformer.transform(input, params.styleKey);
            }
        }

        // 其他任务：返回原文（本地模式不支持）
        console.warn(`Local mode: task "${task}" not supported, returning original text`);
        return input;
    },

    _fillTemplate(template, params) {
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    },

    _getTaskName(key) {
        const names = {
            styleTransform: '风格转换',
            polish: '文本润色',
            summarize: '摘要生成',
            expand: '内容扩写',
            translate: '翻译',
            format: '格式化',
            toneAdjust: '语气调整',
        };
        return names[key] || key;
    },

    _getTaskDescription(key) {
        const descriptions = {
            styleTransform: '将文本转换为指定风格',
            polish: '优化文本表达，使其更加流畅专业',
            summarize: '生成简洁的文本摘要',
            expand: '将简短文本扩写为详细内容',
            translate: '翻译为指定语言',
            format: '将文本格式化为结构化文档',
            toneAdjust: '调整文本语气（正式/轻松/幽默等）',
        };
        return descriptions[key] || '';
    },
};

if (typeof window !== 'undefined') {
    window.AIService = AIService;
}
