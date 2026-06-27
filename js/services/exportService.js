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
};

if (typeof window !== 'undefined') {
    window.ExportService = ExportService;
}
