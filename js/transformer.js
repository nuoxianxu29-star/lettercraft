/**
 * 风格转换引擎
 * 将原始信件内容转换为指定风格的版本
 */

class LetterTransformer {
    constructor() {
        this.styleTemplates = STYLE_TEMPLATES;
    }

    /**
     * 解析信件结构（称呼、正文、结尾、签名）
     */
    parseLetter(text) {
        const lines = text.split('\n');
        let greeting = '';
        let body = '';
        let closing = '';
        let signature = '';

        // 尝试识别称呼（第一行包含冒号或"亲爱的"/"尊敬的"等）
        const greetingPatterns = [
            /^(亲爱的|尊敬的|嗨|哈喽|Hi|Hello)\s*(.+?)[:：,，~～]/,
            /^(.+?)[:：,，]\s*$/,
            /^(.+?)\s*(亲启|收悉|台鉴|钧鉴)/,
        ];

        let bodyStartIndex = 0;
        for (const pattern of greetingPatterns) {
            const match = lines[0]?.match(pattern);
            if (match) {
                greeting = lines[0].trim();
                bodyStartIndex = 1;
                // 跳过空行
                while (bodyStartIndex < lines.length && lines[bodyStartIndex].trim() === '') {
                    bodyStartIndex++;
                }
                break;
            }
        }

        // 尝试识别结尾和签名（从后往前找）
        const closingPatterns = [
            /此致|敬礼|祝好|祝|顺颂|敬上|此致/,
            /Best regards|Sincerely|Cheers|Love/,
        ];

        let bodyEndIndex = lines.length;
        for (let i = lines.length - 1; i >= bodyStartIndex; i--) {
            const line = lines[i].trim();
            if (line === '') continue;
            
            for (const pattern of closingPatterns) {
                if (pattern.test(line)) {
                    // 从匹配行开始到末尾视为结尾+签名
                    closing = lines.slice(i).join('\n').trim();
                    bodyEndIndex = i;
                    break;
                }
            }
            if (bodyEndIndex < lines.length) break;
        }

        // 提取正文
        body = lines.slice(bodyStartIndex, bodyEndIndex).join('\n').trim();

        // 尝试从结尾中提取签名
        if (closing) {
            const sigMatch = closing.match(/[\n]([^\n]+)$/);
            if (sigMatch && sigMatch[1].trim().length > 0 && sigMatch[1].trim().length < 20) {
                signature = sigMatch[1].trim();
                closing = closing.replace(sigMatch[0], '').trim();
            }
        }

        return { greeting, body, closing, signature };
    }

    /**
     * 应用词汇替换
     */
    applyVocabulary(text, vocabulary) {
        let result = text;
        // 按长度降序排序，优先替换长词
        const sortedEntries = Object.entries(vocabulary).sort(
            (a, b) => b[0].length - a[0].length
        );
        
        for (const [from, to] of sortedEntries) {
            if (!from) continue;
            const regex = new RegExp(this.escapeRegExp(from), 'g');
            result = result.replace(regex, to);
        }
        
        // 清理多余空格和标点
        result = result.replace(/[,，]{2,}/g, '，');
        result = result.replace(/[。！]{2,}/g, '。');
        result = result.replace(/\s+/g, ' ').trim();
        
        return result;
    }

    /**
     * 转义正则特殊字符
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * 应用句式调整（简化版：添加风格化前缀/后缀）
     */
    adjustStyle(text, styleKey) {
        const template = this.styleTemplates[styleKey];
        if (!template) return text;

        let result = text;

        // 文艺风格：添加诗意修饰
        if (styleKey === 'literary') {
            // 在段落开头添加修饰词
            result = result.replace(/^(.+)$/gm, (match) => {
                if (match.trim().length > 4 && Math.random() > 0.7) {
                    const prefixes = ['恰如', '宛若', '犹如', '仿若', '恰似'];
                    return prefixes[Math.floor(Math.random() * prefixes.length)] + match;
                }
                return match;
            });
        }

        // 温暖风格：添加关怀用语
        if (styleKey === 'warm') {
            const carePhrases = ['记得照顾好自己', '天冷了多穿点', '别太累了', '想你的每一天'];
            if (result.length > 20 && Math.random() > 0.5) {
                result += '\n\n' + carePhrases[Math.floor(Math.random() * carePhrases.length)] + '~';
            }
        }

        return result;
    }

    /**
     * 主转换方法
     */
    transform(text, styleKey) {
        const template = this.styleTemplates[styleKey];
        if (!template) {
            throw new Error(`未知的风格: ${styleKey}`);
        }

        if (!text.trim()) return '';

        const parsed = this.parseLetter(text);
        
        // 对正文应用词汇替换
        let transformedBody = this.applyVocabulary(parsed.body, template.vocabulary);
        
        // 应用句式调整
        transformedBody = this.adjustStyle(transformedBody, styleKey);

        // 重组信件
        let result = '';
        
        // 称呼
        if (parsed.greeting) {
            // 尝试从称呼中提取名字
            const nameMatch = parsed.greeting.match(/(?:亲爱的|尊敬的|嗨|哈喽)?\s*(.+?)[:：,，~～\s]/);
            const name = nameMatch ? nameMatch[1] : '朋友';
            result = template.greeting.replace('{name}', name);
        } else {
            result = template.greeting.replace('{name}', '朋友');
        }

        // 正文
        result += '\n\n' + transformedBody;

        // 结尾
        if (parsed.closing) {
            result += '\n\n' + parsed.closing;
        } else {
            result += template.closing
                .replace('{signature}', parsed.signature || '你的朋友')
                .replace('{date}', this.getCurrentDate());
        }

        return result.trim();
    }

    /**
     * 批量转换（所有风格）
     */
    transformAll(text) {
        const results = {};
        for (const styleKey of Object.keys(this.styleTemplates)) {
            results[styleKey] = this.transform(text, styleKey);
        }
        return results;
    }

    /**
     * 获取当前日期（中文格式）
     */
    getCurrentDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        return `${year}年${month}月${day}日`;
    }
}

// 导出单例
const transformer = new LetterTransformer();
