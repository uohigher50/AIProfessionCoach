import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const port = 3000;

// 启用CORS
app.use(cors());
app.use(express.json());

// 配置静态文件服务
app.use(express.static('.'));
app.use('/styles', express.static('styles'));
app.use('/scripts', express.static('scripts'));

// DeepSeek R1 API配置
const API_KEY = 'ab2da8c4-ae5a-4a79-bcb1-378c71a6bae1';
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// 检查消息是否在允许的领域范围内
function isInAllowedDomain(message) {
    const allowedKeywords = [
        // 半导体生产安全管理关键词
        '半导体', '生产安全', '安全管理', '生产流程', '安全规范',
        '风险控制', '应急预案', '安全培训', '设备维护', '环境监控',
        // 甲醇加注安全规范关键词
        '甲醇', '加注', '操作流程', '防护措施', '应急处理',
        '储存要求', '运输安全', '泄漏处理', '安全设备'
    ];
    
    return allowedKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

// 处理聊天请求
app.post('/chat', async (req, res) => {
    try {
        // 验证请求体格式
        if (!req.body.messages || !Array.isArray(req.body.messages) || req.body.messages.length === 0) {
            return res.status(400).json({
                error: '请求格式错误：缺少消息历史'
            });
        }

        // 检查用户输入是否在允许的领域范围内
        const userMessage = req.body.messages[req.body.messages.length - 1].content;
        if (!isInAllowedDomain(userMessage)) {
            return res.status(400).json({
                error: '抱歉，我只能回答半导体生产安全和甲醇加注安全相关的问题。'
            });
        }

        // 添加系统提示词
        const messages = [
            {
                role: 'system',
                content: '你是一个专业的安全顾问，专注于半导体生产安全管理和甲醇加注安全规范领域。请提供准确、专业的建议，确保回答符合行业标准和安全规范。'
            },
            ...req.body.messages
        ];

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-r1-250120',
                messages: messages,
                temperature: 0.6,
                stream: true
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '与AI服务通信失败');
        }

        // 设置响应头以支持流式输出
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 转发API响应
        response.body.pipe(res);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message || '服务器内部错误' });
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});