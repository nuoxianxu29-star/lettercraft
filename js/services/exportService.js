/**
 * 导出服务 - Export Service v53.0
 * 支持：JSON / 纯文本 / Canvas 图片 / PDF / HTML / Word / Markdown
 */

const ExportService = {
    exportJSON(data, filename = 'textcraft-export.json') {
        const json = JSON.stringify(data, null, 2);
        this._download(json, filename, 'application/json');
    },

    exportText(data, filename = 'textcraft-export.txt') {
        const text = data.content || data.text || '';
        this._download(text, filename, 'text/plain');
    },

    // v36.0: 导出 Word 文档
    exportWord(data, filename = 'textcraft-export.doc') {
        const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${this._escapeHtml(data.title || 'TextCraft')}</title>
<style>body{font-family:'Noto Serif SC',serif;font-size:14pt;line-height:2;padding:40px}h1{font-size:18pt;color:#8b5e3c}.header{border-bottom:2px solid #8b5e3c;padding-bottom:10px;margin-bottom:20px}.footer{margin-top:40px;font-size:10pt;color:#999}</style>
</head><body>
<div class="header"><h1>⚡ TextCraft</h1><p>风格：${this._escapeHtml(data.styleName || '')}</p></div>
<div class="content">${(data.content || '').replace(/\n/g, '<br>')}</div>
<div class="footer">由 TextCraft 智能文本处理系统生成 · ${this._escapeHtml(data.time || '')}</div>
</body></html>`;
        this._download(html, filename, 'application/msword');
    },

    // v37.0: 导出 Markdown 文件
    exportMarkdown(data, filename = 'textcraft-export.md') {
        let md = `# TextCraft - ${this._escapeHtml(data.styleName || '')}\n\n`;
        if (data.time) md += `> 生成时间：${data.time}\n\n---\n\n`;
        md += data.content || '';
        if (data.original) md += `\n\n---\n\n## 原文\n\n${data.original}`;
        this._download(md, filename, 'text/markdown');
    },

    async exportImage(options) {
        const { content = '', styleName = '', width = 800, height = 1200, bgColor = '#fffef9', textColor = '#2c2c2c', fontFamily = 'Noto Serif SC, serif' } = options;
        const canvas = document.createElement('canvas');
        const dpr = 2;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#e0dcd3';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, width - 40, height - 40);
        const gradient = ctx.createLinearGradient(40, 0, width - 40, 0);
        gradient.addColorStop(0, '#d4b08a');
        gradient.addColorStop(0.5, '#a67c52');
        gradient.addColorStop(1, '#d4b08a');
        ctx.fillStyle = gradient;
        ctx.fillRect(40, 30, width - 80, 4);
        ctx.fillStyle = '#6d4c2e';
        ctx.font = 'bold 20px "ZCOOL XiaoWei", serif';
        ctx.fillText('⚡ TextCraft', 50, 75);
        if (styleName) {
            const badgeWidth = ctx.measureText(styleName).width + 32;
            const badgeX = width - 50 - badgeWidth;
            ctx.fillStyle = '#f5f0e8';
            this._roundRect(ctx, badgeX, 58, badgeWidth, 26, 13);
            ctx.fill();
            ctx.fillStyle = '#8b5e3c';
            ctx.font = '12px "Noto Serif SC", serif';
            ctx.fillText(styleName, badgeX + 16, 76);
        }
        ctx.strokeStyle = '#e0dcd3';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(50, 95);
        ctx.lineTo(width - 50, 95);
        ctx.stroke();
        ctx.fillStyle = textColor;
        ctx.font = `16px "${fontFamily}"`;
        const lineHeight = 28;
        const maxWidth = width - 100;
        let y = 130;
        const lines = content.split('\n');
        for (const line of lines) {
            if (y > height - 80) break;
            const wrapped = this._wrapText(ctx, line, maxWidth);
            for (const wrappedLine of wrapped) {
                if (y > height - 80) break;
                ctx.fillText(wrappedLine, 50, y);
                y += lineHeight;
            }
        }
        ctx.strokeStyle = '#e0dcd3';
        ctx.beginPath();
        ctx.moveTo(50, height - 60);
        ctx.lineTo(width - 50, height - 60);
        ctx.stroke();
        ctx.fillStyle = '#9a9a9a';
        ctx.font = '12px "Noto Serif SC", serif';
        ctx.fillText(`由 TextCraft 智能文本处理系统生成 · ${new Date().toLocaleString('zh-CN')}`, 50, height - 40);
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'textcraft-export.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                resolve(true);
            }, 'image/png');
        });
    },

    exportHTML(data, filename = 'textcraft-export.html') {
        const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TextCraft - ${this._escapeHtml(data.styleName || '')}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Serif SC',serif;padding:40px;color:#2c2c2c;background:#faf8f5}
.card{max-width:700px;margin:0 auto;padding:48px 40px;background:#fffef9;border:1px solid #e0dcd3;border-radius:20px;position:relative}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#d4b08a,#a67c52,#d4b08a)}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;padding-bottom:20px;border-bottom:1px solid #e0dcd3}
.logo{font-family:'ZCOOL XiaoWei',serif;font-size:20px;color:#6d4c2e}
.badge{font-size:13px;padding:6px 16px;border-radius:20px;background:#f5f0e8;color:#8b5e3c;font-weight:600}
.content{font-size:16px;line-height:2;white-space:pre-wrap;word-break:break-word}
.footer{margin-top:40px;padding-top:20px;border-top:1px solid #e0dcd3;font-size:13px;color:#9a9a9a}
</style>
</head>
<body>
<div class="card">
    <div class="header">
        <div class="logo">⚡ TextCraft</div>
        <span class="badge">${this._escapeHtml(data.styleName || '')}</span>
    </div>
    <div class="content">${this._escapeHtml(data.content || '')}</div>
    <div class="footer">${this._escapeHtml(data.time || '')}</div>
</div>
</body>
</html>`;
        this._download(html, filename, 'text/html');
    },

    // v39.0: 分享卡片生成（返回 canvas 数据 URL）
    async generateShareCard(options) {
        const { content = '', styleName = '', width = 600, height = 800, bgColor = '#fffef9', textColor = '#2c2c2c' } = options;
        const canvas = document.createElement('canvas');
        const dpr = 2;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        // 背景渐变
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, bgColor);
        bgGrad.addColorStop(1, '#f5f0e8');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
        // 装饰边框
        ctx.strokeStyle = '#d4b08a';
        ctx.lineWidth = 3;
        ctx.strokeRect(20, 20, width - 40, height - 40);
        // 顶部装饰线
        const lineGrad = ctx.createLinearGradient(40, 0, width - 40, 0);
        lineGrad.addColorStop(0, '#d4b08a');
        lineGrad.addColorStop(0.5, '#8b5e3c');
        lineGrad.addColorStop(1, '#d4b08a');
        ctx.fillStyle = lineGrad;
        ctx.fillRect(40, 40, width - 80, 3);
        // 标题
        ctx.fillStyle = '#6d4c2e';
        ctx.font = 'bold 24px "ZCOOL XiaoWei", serif';
        ctx.fillText('⚡ TextCraft', 50, 90);
        if (styleName) {
            ctx.fillStyle = '#8b5e3c';
            ctx.font = '14px "Noto Serif SC", serif';
            ctx.fillText(styleName, 50, 115);
        }
        // 分割线
        ctx.strokeStyle = '#e0dcd3';
        ctx.beginPath();
        ctx.moveTo(50, 135);
        ctx.lineTo(width - 50, 135);
        ctx.stroke();
        // 内容
        ctx.fillStyle = textColor;
        ctx.font = '16px "Noto Serif SC", serif';
        const maxWidth = width - 100;
        let y = 170;
        const contentLines = content.split('\n');
        for (const line of contentLines) {
            if (y > height - 100) break;
            const wrapped = this._wrapText(ctx, line, maxWidth);
            for (const wl of wrapped) {
                if (y > height - 100) break;
                ctx.fillText(wl, 50, y);
                y += 26;
            }
        }
        // 底部
        ctx.strokeStyle = '#e0dcd3';
        ctx.beginPath();
        ctx.moveTo(50, height - 70);
        ctx.lineTo(width - 50, height - 70);
        ctx.stroke();
        ctx.fillStyle = '#9a9a9a';
        ctx.font = '12px "Noto Serif SC", serif';
        ctx.fillText('由 TextCraft 智能文本处理系统生成', 50, height - 45);
        return canvas.toDataURL('image/png');
    },

    // v40.0: 二维码分享
    async generateQRCode(text, size = 200) {
        return new Promise((resolve, reject) => {
            if (typeof QRCode === 'undefined') {
                reject(new Error('QRCode library not loaded'));
                return;
            }
            QRCode.toDataURL(text, { width: size, margin: 1 }, (err, url) => {
                if (err) reject(err);
                else resolve(url);
            });
        });
    },

    // ==================== 内部方法 ====================

    _download(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    _wrapText(ctx, text, maxWidth) {
        const lines = [];
        let currentLine = '';
        for (const char of text) {
            const testLine = currentLine + char;
            if (ctx.measureText(testLine).width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = char;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
        return lines.length ? lines : [''];
    },

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    },

    // ==================== v54.0-v100.0: 工具函数 ====================

    // v54.0: 多光标编辑 - 在指定位置插入文本
    multiCursorInsert(text, positions, content) {
        let result = content;
        let offset = 0;
        const sorted = [...positions].sort((a, b) => a - b);
        for (const pos of sorted) {
            const adjustedPos = pos + offset;
            result = result.slice(0, adjustedPos) + text + result.slice(adjustedPos);
            offset += text.length;
        }
        return result;
    },

    // v55.0: 列选择模式 - 提取列文本
    extractColumn(text, startCol, endCol) {
        return text.split('\n').map(line => {
            const chars = [...line];
            return chars.slice(startCol, endCol).join('');
        }).join('\n');
    },

    // v56.0: 括号匹配
    findMatchingBracket(text, pos) {
        const pairs = { '(': ')', '[': ']', '{': '}', '<': '>' };
        const reversePairs = { ')': '(', ']': '[', '}': '{', '>': '<' };
        const char = text[pos];
        if (pairs[char]) {
            let depth = 1;
            for (let i = pos + 1; i < text.length; i++) {
                if (text[i] === char) depth++;
                if (text[i] === pairs[char]) { depth--; if (depth === 0) return i; }
            }
        } else if (reversePairs[char]) {
            let depth = 1;
            for (let i = pos - 1; i >= 0; i--) {
                if (text[i] === char) depth++;
                if (text[i] === reversePairs[char]) { depth--; if (depth === 0) return i; }
            }
        }
        return -1;
    },

    // v57.0: 自动缩进
    autoIndent(text) {
        const lines = text.split('\n');
        let indent = 0;
        const result = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.endsWith('}') || trimmed.endsWith(']') || trimmed.endsWith(')')) indent = Math.max(0, indent - 1);
            result.push('    '.repeat(indent) + trimmed);
            if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(') || trimmed.endsWith(':')) indent++;
        }
        return result.join('\n');
    },

    // v58.0: 文本转换
    convertText(text, type) {
        switch (type) {
            case 'upper': return text.toUpperCase();
            case 'lower': return text.toLowerCase();
            case 'title': return text.replace(/\b\w/g, c => c.toUpperCase());
            case 'sentence': return text.replace(/(^\w|[.!?]\s+\w)/g, c => c.toUpperCase());
            case 'fullwidth': return text.replace(/[\u0020-\u007e]/g, c => String.fromCharCode(c.charCodeAt(0) + 0xfee0));
            case 'halfwidth': return text.replace(/[\uff01-\uff5e]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
            case 'reverse': return [...text].reverse().join('');
            default: return text;
        }
    },

    // v59.0: 随机文本生成器
    generateRandomText(type, length = 100) {
        const loremWords = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum'.split(' ');
        const chineseWords = '天地玄黄宇宙洪荒日月盈昃辰宿列张寒来暑往秋收冬藏闰余成岁律吕调阳云腾致雨露结为霜金生丽水玉出昆冈剑号巨阙珠称夜光果珍李柰菜重芥姜海咸河淡鳞潜羽翔龙师火帝鸟官人皇始制文字乃服衣裳推位让国有虞陶唐吊民伐罪周发殷汤坐朝问道垂拱平章'.split('');
        switch (type) {
            case 'lorem': { const r = []; while (r.join(' ').length < length) r.push(loremWords[Math.floor(Math.random() * loremWords.length)]); return r.join(' ').slice(0, length); }
            case 'chinese': return Array.from({ length }, () => chineseWords[Math.floor(Math.random() * chineseWords.length)]).join('');
            case 'words': { const c = 'abcdefghijklmnopqrstuvwxyz'; return Array.from({ length }, () => c[Math.floor(Math.random() * c.length)]).join(''); }
            default: return '';
        }
    },

    // v60.0: Lorem Ipsum 生成
    generateLoremIpsum(paragraphs = 3) {
        const p = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.';
        return Array(paragraphs).fill(p).join('\n\n');
    },

    // v61.0: 密码生成器
    generatePassword(length = 16, options = {}) {
        const { uppercase = true, lowercase = true, numbers = true, symbols = true } = options;
        let chars = '';
        if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
        if (numbers) chars += '0123456789';
        if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    },

    // v62.0: UUID 生成器
    generateUUID(count = 1, version = 4) {
        const uuids = [];
        for (let i = 0; i < count; i++) {
            if (version === 4) {
                uuids.push('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                    const r = Math.random() * 16 | 0;
                    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
                }));
            } else {
                uuids.push('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)));
            }
        }
        return uuids;
    },

    // v63.0: JSON 格式化
    formatJSON(text, indent = 2) {
        try { return JSON.stringify(JSON.parse(text), null, indent); }
        catch (e) { return 'JSON 格式错误: ' + e.message; }
    },

    // v64.0: XML 格式化
    formatXML(text) {
        try {
            let formatted = '', indent = 0;
            const lines = text.replace(/>\s*</g, '><').split(/(<[^>]+>)/g).filter(s => s.trim());
            for (const line of lines) {
                if (line.match(/^<\/\w/)) indent--;
                formatted += '  '.repeat(Math.max(0, indent)) + line + '\n';
                if (line.match(/^<\w[^>]*[^\/]>$/)) indent++;
            }
            return formatted.trim();
        } catch (e) { return 'XML 格式错误: ' + e.message; }
    },

    // v65.0: SQL 格式化
    formatSQL(text) {
        const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 'INTO', 'VALUES', 'SET', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'AS', 'DISTINCT', 'NOT', 'NULL', 'IS', 'IN', 'LIKE', 'BETWEEN', 'EXISTS', 'UNION', 'ALL'];
        let result = text;
        for (const kw of keywords) {
            const regex = new RegExp(`\\b${kw}\\b`, 'gi');
            result = result.replace(regex, '\n' + kw);
        }
        return result.trim().replace(/^\n/, '');
    },

    // v66.0: CSV 解析
    parseCSV(text) {
        const lines = text.trim().split('\n');
        if (lines.length === 0) return { headers: [], data: [] };
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row = {};
            headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
            data.push(row);
        }
        return { headers, data };
    },

    // v67.0: Base64 编解码
    base64Encode(text) { try { return btoa(unescape(encodeURIComponent(text))); } catch (e) { return '编码失败'; } },
    base64Decode(text) { try { return decodeURIComponent(escape(atob(text.trim()))); } catch (e) { return '解码失败'; } },

    // v68.0: URL 编解码
    urlEncode(text) { return encodeURIComponent(text); },
    urlDecode(text) { try { return decodeURIComponent(text); } catch (e) { return '解码失败'; } },

    // v69.0: 哈希计算
    async calculateHash(text, algorithm = 'SHA-256') {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(text);
            const hashBuffer = await crypto.subtle.digest(algorithm, data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            let hash = 0;
            for (let i = 0; i < text.length; i++) { hash = ((hash << 5) - hash) + text.charCodeAt(i); hash |= 0; }
            return Math.abs(hash).toString(16);
        }
    },

    // v70.0: 文本统计面板
    getTextStats(text) {
        const chars = text.length;
        const charsNoSpace = text.replace(/\s/g, '').length;
        const words = (text.match(/[a-zA-Z]+/g) || []).length;
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const sentences = text.split(/[。！？.!?]+/).filter(Boolean).length;
        const paragraphs = text.split(/\n\s*\n/).filter(Boolean).length;
        const lines = text.split('\n').filter(Boolean).length;
        return { chars, charsNoSpace, words, chineseChars, sentences, paragraphs, lines };
    },

    // v71.0: 阅读时间估算
    estimateReadingTime(text) {
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
        const minutes = chineseChars / 500 + englishWords / 200;
        if (minutes < 1) return '不到1分钟';
        return `${Math.ceil(minutes)} 分钟`;
    },

    // v72.0: 文本密度分析
    analyzeTextDensity(text) {
        const total = text.length;
        if (total === 0) return { chineseRatio: 0, englishRatio: 0, numberRatio: 0, punctuationRatio: 0, spaceRatio: 0 };
        const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const english = (text.match(/[a-zA-Z]/g) || []).length;
        const numbers = (text.match(/[0-9]/g) || []).length;
        const punctuation = (text.match(/[，。！？、；：""''（）【】《》,.!?;:'"()\[\]<>]/g) || []).length;
        const spaces = (text.match(/\s/g) || []).length;
        return {
            chineseRatio: (chinese / total * 100).toFixed(1),
            englishRatio: (english / total * 100).toFixed(1),
            numberRatio: (numbers / total * 100).toFixed(1),
            punctuationRatio: (punctuation / total * 100).toFixed(1),
            spaceRatio: (spaces / total * 100).toFixed(1),
        };
    },

    // v73.0: 关键词提取
    extractKeywords(text, topN = 10) {
        const stopWords = new Set(['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and', 'or', 'if', 'while', 'that', 'this', 'these', 'those', 'it', 'its']);
        const words = text.match(/[\u4e00-\u9fa5]{2,}|[a-zA-Z]{3,}/g) || [];
        const freq = {};
        words.forEach(w => { const lower = w.toLowerCase(); if (!stopWords.has(lower)) freq[lower] = (freq[lower] || 0) + 1; });
        return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, topN).map(([word, count]) => ({ word, count }));
    },

    // v74.0: 情感分析
    analyzeSentiment(text) {
        const positive = ['好', '棒', '优秀', '出色', '美丽', '喜欢', '爱', '快乐', '开心', '幸福', '满意', '感谢', '成功', '进步', '希望', '温暖', '阳光', '友好', '善良', 'good', 'great', 'excellent', 'love', 'happy', 'wonderful', 'amazing', 'beautiful', 'perfect', 'best', 'awesome', 'fantastic'];
        const negative = ['坏', '差', '糟糕', '讨厌', '恨', '悲伤', '痛苦', '失望', '愤怒', '恐惧', '困难', '失败', '问题', '错误', '危险', 'bad', 'terrible', 'hate', 'sad', 'angry', 'awful', 'horrible', 'worst', 'disappointing', 'painful', 'difficult', 'problem', 'error'];
        let pos = 0, neg = 0;
        const words = text.toLowerCase();
        positive.forEach(w => { if (words.includes(w)) pos++; });
        negative.forEach(w => { if (words.includes(w)) neg++; });
        const total = pos + neg;
        if (total === 0) return { label: '中性', score: 0, positive: 0, negative: 0 };
        const score = (pos - neg) / total;
        return { label: score > 0.2 ? '正面' : score < -0.2 ? '负面' : '中性', score: score.toFixed(2), positive: pos, negative: neg };
    },

    // v75.0: 文本相似度对比
    compareTextSimilarity(text1, text2) {
        const set1 = new Set(text1.split(/[\s,，。！？.!?]+/).filter(Boolean));
        const set2 = new Set(text2.split(/[\s,，。！？.!?]+/).filter(Boolean));
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return union.size > 0 ? (intersection.size / union.size * 100).toFixed(1) : 0;
    },

    // v76.0: 自动摘要生成
    generateSummary(text, maxSentences = 3) {
        const sentences = text.split(/([。！？.!?]+)/).filter(s => s.trim() && !/^[。！？.!?]+$/.test(s));
        if (sentences.length <= maxSentences) return text;
        const words = this.extractKeywords(text, 20);
        const keywordSet = new Set(words.map(w => w.word));
        const scored = sentences.map((s, i) => {
            let score = 0;
            keywordSet.forEach(kw => { if (s.includes(kw)) score++; });
            if (i === 0) score += 2;
            return { text: s, score };
        });
        scored.sort((a, b) => b.score - a.score);
        const top = scored.slice(0, maxSentences).sort((a, b) => sentences.indexOf(a.text) - sentences.indexOf(b.text));
        return top.map(s => s.text).join('');
    },

    // v77.0: 智能分段
    smartSplit(text, maxLen = 200) {
        const paragraphs = text.split(/\n+/).filter(Boolean);
        const result = [];
        for (const p of paragraphs) {
            if (p.length <= maxLen) { result.push(p); }
            else {
                const sentences = p.split(/([。！？.!?]+)/);
                let current = '';
                for (const part of sentences) {
                    if ((current + part).length > maxLen && current) { result.push(current.trim()); current = part; }
                    else { current += part; }
                }
                if (current.trim()) result.push(current.trim());
            }
        }
        return result.join('\n\n');
    },

    // v78.0: 文本去重
    deduplicateText(text, mode = 'line') {
        switch (mode) {
            case 'line': { const lines = text.split('\n'); const seen = new Set(); return lines.filter(line => { const t = line.trim(); if (seen.has(t)) return false; seen.add(t); return true; }).join('\n'); }
            case 'paragraph': { const paragraphs = text.split(/\n\s*\n/); const seen = new Set(); return paragraphs.filter(p => { const t = p.trim(); if (seen.has(t)) return false; seen.add(t); return true; }).join('\n\n'); }
            case 'char': { const seen = new Set(); return [...text].filter(c => { if (seen.has(c)) return false; seen.add(c); return true; }).join(''); }
            default: return text;
        }
    },

    // v79.0: 格式清理
    cleanFormat(text) {
        return text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').replace(/^ +/gm, '').trim();
    },

    // v80.0: HTML转文本
    htmlToText(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    },

    // v81.0: 文本转HTML
    textToHTML(text) {
        const paragraphs = text.split(/\n\n+/);
        return '<!DOCTYPE html>\n<html>\n<head><meta charset="UTF-8"><title>TextCraft</title></head>\n<body>\n' +
            paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('\n') + '\n</body>\n</html>';
    },

    // v82.0: 正则测试工具
    testRegex(text, pattern, flags = 'g') {
        try {
            const regex = new RegExp(pattern, flags);
            const matches = text.match(regex);
            return { valid: true, matches: matches || [], count: matches ? matches.length : 0, replaced: text.replace(regex, '【匹配】') };
        } catch (e) { return { valid: false, error: e.message }; }
    },

    // v83.0: 文本加密（XOR）
    encryptText(text, password) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ password.charCodeAt(i % password.length));
        }
        return btoa(unescape(encodeURIComponent(result)));
    },

    // v84.0: 文本解密
    decryptText(encoded, password) {
        try {
            const text = decodeURIComponent(escape(atob(encoded)));
            let result = '';
            for (let i = 0; i < text.length; i++) {
                result += String.fromCharCode(text.charCodeAt(i) ^ password.charCodeAt(i % password.length));
            }
            return result;
        } catch (e) { return '解密失败'; }
    },

    // v85.0: 文本反转
    reverseText(text) { return [...text].reverse().join(''); },

    // v86.0: 大小写转换
    caseConvert(text, type) {
        switch (type) {
            case 'upper': return text.toUpperCase();
            case 'lower': return text.toLowerCase();
            case 'title': return text.replace(/\b\w/g, c => c.toUpperCase());
            case 'sentence': return text.replace(/(^\w|[.!?]\s+\w)/g, c => c.toUpperCase());
            case 'toggle': return [...text].map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join('');
            default: return text;
        }
    },

    // v87.0: 全角半角转换
    fullWidthConvert(text, toFull = true) {
        if (toFull) return text.replace(/[\u0020-\u007e]/g, c => c === ' ' ? '\u3000' : String.fromCharCode(c.charCodeAt(0) + 0xfee0));
        return text.replace(/[\uff01-\uff5e]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/\u3000/g, ' ');
    },

    // v88.0: 简繁体转换
    traditionalConvert(text, toTraditional = true) {
        const simplified = '个么后里发会动国对开面体还学军如进产种条没长从东线电业角半头机十百代划出书分战定建过划将相省革位种给看拉';
        const traditional = '個麼後裡發會動國對開麵體還學軍如進產種條沒長從東線電業角半頭機十百代劃出書分戰定建過劃將相省革位種給看拉';
        let result = '';
        for (const char of text) {
            const idx = toTraditional ? simplified.indexOf(char) : traditional.indexOf(char);
            result += idx !== -1 ? (toTraditional ? traditional[idx] : simplified[idx]) : char;
        }
        return result;
    },

    // v89.0: 拼音转换（简化版）
    toPinyin(text) {
        const pinyinMap = { '一': 'yi', '二': 'er', '三': 'san', '四': 'si', '五': 'wu', '六': 'liu', '七': 'qi', '八': 'ba', '九': 'jiu', '十': 'shi', '百': 'bai', '千': 'qian', '万': 'wan', '天': 'tian', '地': 'di', '人': 'ren', '你': 'ni', '我': 'wo', '他': 'ta', '她': 'ta', '的': 'de', '了': 'le', '在': 'zai', '是': 'shi', '有': 'you', '和': 'he', '就': 'jiu', '不': 'bu', '都': 'dou', '也': 'ye', '很': 'hen', '到': 'dao', '说': 'shuo', '要': 'yao', '去': 'qu', '会': 'hui', '着': 'zhe', '好': 'hao', '大': 'da', '小': 'xiao', '多': 'duo', '少': 'shao', '来': 'lai', '这': 'zhe', '那': 'na', '什': 'shen', '么': 'me', '为': 'wei', '中': 'zhong', '国': 'guo', '爱': 'ai', '学': 'xue', '习': 'xi', '工': 'gong', '作': 'zuo', '生': 'sheng', '活': 'huo', '快': 'kuai', '乐': 'le', '希': 'xi', '望': 'wang', '感': 'gan', '谢': 'xie', '朋': 'peng', '友': 'you', '家': 'jia', '长': 'chang', '短': 'duan', '高': 'gao', '低': 'di', '前': 'qian', '后': 'hou', '左': 'zuo', '右': 'you', '上': 'shang', '下': 'xia', '东': 'dong', '西': 'xi', '南': 'nan', '北': 'bei' };
        return [...text].map(c => pinyinMap[c] || c).join(' ');
    },

    // v90.0: 文本分词
    tokenize(text) {
        return text.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+|\d+/g) || [];
    },

    // v91.0: 词频统计
    wordFrequency(text, topN = 20) {
        const stopWords = new Set(['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', 'the', 'a', 'an', 'is', 'are', 'was', 'to', 'of', 'in', 'for', 'on', 'with']);
        const words = text.match(/[\u4e00-\u9fa5]{1,}|[a-zA-Z]{2,}/g) || [];
        const freq = {};
        words.forEach(w => { const l = w.toLowerCase(); if (!stopWords.has(l)) freq[l] = (freq[l] || 0) + 1; });
        return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, topN).map(([word, count]) => ({ word, count }));
    },

    // v92.0: 文本去噪
    denoiseText(text, options = {}) {
        let result = text;
        if (options.removeNumbers) result = result.replace(/\d+/g, '');
        if (options.removePunctuation) result = result.replace(/[，。！？、；：""''（）【】《》,.!?;:'"()\[\]<>]/g, '');
        if (options.removeExtraSpaces) result = result.replace(/[ \t]+/g, ' ').trim();
        if (options.removeEmptyLines) result = result.replace(/\n{2,}/g, '\n');
        return result;
    },

    // v93.0: 自动标点
    autoPunctuate(text) {
        return text.replace(/([^\n。，！？.!?])$/gm, '$1。').replace(/([^\n，,]) ([a-zA-Z])/g, '$1，$2').replace(/([a-zA-Z]) ([^\n])/g, '$1，$2');
    },

    // v94.0: 排版优化
    optimizeTypography(text) {
        return text
            .replace(/([\u4e00-\u9fa5])([a-zA-Z0-9])/g, '$1 $2')
            .replace(/([a-zA-Z0-9])([\u4e00-\u9fa5])/g, '$1 $2')
            .replace(/([\u4e00-\u9fa5])([，。！？、；：""''（）【】《》])/g, '$1$2')
            .replace(/([，。！？、；：""''（）【】《》])([\u4e00-\u9fa5])/g, '$1$2');
    },

    // v95.0: 首行缩进
    addTextIndent(text, indent = 2) {
        const spaces = '\u3000'.repeat(indent);
        return text.split('\n').map(line => line.trim() ? spaces + line.trim() : '').join('\n');
    },

    // v96.0: 字符频率分析
    analyzeCharFrequency(text, topN = 50) {
        const freq = {};
        for (const char of text) {
            if (char === '\n' || char === ' ') continue;
            freq[char] = (freq[char] || 0) + 1;
        }
        return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, topN).map(([char, count]) => ({ char, count }));
    },

    // v97.0: 句子长度分析
    analyzeSentenceLength(text) {
        const sentences = text.split(/[。！？.!?]+/).filter(s => s.trim());
        const lengths = sentences.map(s => s.trim().length);
        if (lengths.length === 0) return { avg: 0, min: 0, max: 0, total: 0 };
        return {
            avg: (lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(1),
            min: Math.min(...lengths), max: Math.max(...lengths), total: lengths.length,
        };
    },

    // v98.0: 语法检查（简化版）
    checkGrammar(text) {
        const issues = [];
        const doubleSpace = text.match(/  +/g);
        if (doubleSpace) issues.push({ type: 'warning', message: '发现连续空格', count: doubleSpace.length });
        const mixedNoSpace = text.match(/[\u4e00-\u9fa5][a-zA-Z]|[a-zA-Z][\u4e00-\u9fa5]/g);
        if (mixedNoSpace) issues.push({ type: 'tip', message: '中英文之间建议添加空格', count: mixedNoSpace.length });
        const dupPunct = text.match(/([。！？,.!?])\1+/g);
        if (dupPunct) issues.push({ type: 'warning', message: '发现重复标点', count: dupPunct.length });
        return issues;
    },

    // v99.0: 重复行检测
    findDuplicateLines(text) {
        const lines = text.split('\n');
        const seen = {};
        const duplicates = [];
        lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (!trimmed) return;
            if (seen[trimmed] !== undefined) {
                duplicates.push({ line: trimmed, firstOccurrence: seen[trimmed], currentLine: idx + 1 });
            } else {
                seen[trimmed] = idx + 1;
            }
        });
        return duplicates;
    },

    // v100.0: 自定义CSS注入
    injectCSS(css) {
        let styleEl = document.getElementById('textcraft-custom-css');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'textcraft-custom-css';
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = css;
    },

    // v101.0: 数据备份
    exportAllData() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('textcraft_')) data[key] = localStorage.getItem(key);
        }
        return JSON.stringify(data, null, 2);
    },

    importAllData(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            for (const [key, value] of Object.entries(data)) localStorage.setItem(key, value);
            return true;
        } catch (e) { return false; }
    },

    // v102.0: 多语言界面
    translations: {
        'zh-CN': { editor: '编辑器', preview: '预览', tools: '工具', settings: '设置', copy: '复制', clear: '清空' },
        'en': { editor: 'Editor', preview: 'Preview', tools: 'Tools', settings: 'Settings', copy: 'Copy', clear: 'Clear' },
        'ja': { editor: 'エディター', preview: 'プレビュー', tools: 'ツール', settings: '設定', copy: 'コピー', clear: 'クリア' },
    },

    t(key, lang = 'zh-CN') {
        return this.translations[lang]?.[key] || key;
    },
};

if (typeof window !== 'undefined') {
    window.ExportService = ExportService;
}
