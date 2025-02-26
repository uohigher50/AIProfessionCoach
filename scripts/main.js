document.addEventListener('DOMContentLoaded', () => {
    // 声明为全局变量，以便在整个应用中访问
    let userInput, sendButton, messagesContainer;
    let conversationHistory = [];
    const navLinks = document.querySelectorAll('nav a');
    const mainContent = document.querySelector('.main-content');

    // 初始化页面
    initializePage();
    
    // 初始化页面函数
    function initializePage() {
        userInput = document.getElementById('userInput');
        sendButton = document.getElementById('sendButton');
        messagesContainer = document.querySelector('.messages-container');
        bindChatElements();
        setupNavigation();
    }

    // 路由处理
    function handleRoute(route) {
        // 移除所有active类
        navLinks.forEach(link => link.classList.remove('active'));
        
        // 根据路由显示不同内容
        switch(route) {
            case '#history':
                document.querySelector('a[href="#history"]').classList.add('active');
                mainContent.innerHTML = `
                    <div class="history-page">
                        <h2>历史对话记录</h2>
                        <div class="history-list">
                            ${conversationHistory.map((msg, index) => `
                                <div class="history-item" onclick="loadConversation(${index})">
                                    <span class="history-date">${new Date().toLocaleDateString()}</span>
                                    <p>${msg.content.substring(0, 50)}...</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                break;
            case '#about':
                document.querySelector('a[href="#about"]').classList.add('active');
                mainContent.innerHTML = `
                    <div class="about-page">
                        <h2>关于系统</h2>
                        <div class="about-content">
                            <p>欢迎使用AI专业顾问系统</p>
                            <p>这是一个为老同学设计的演示系统，专注于为半导体生产安全和甲醇加注安全管理提供专业咨询服务。</p>
                            <p>系统特点：</p>
                            <ul>
                                <li>智能对话：基于DeepSeek R1 API的智能对话系统</li>
                                <li>专业咨询：提供半导体生产安全和甲醇加注安全管理的专业建议</li>
                                <li>实时响应：流式文本输出，即时获得反馈</li>
                                <li>历史记录：保存对话历史，方便随时查看</li>
                            </ul>
                        </div>
                    </div>
                `;
                break;
            default:
                document.querySelector('a[href="#"]').classList.add('active');
                mainContent.innerHTML = `
                    <div class="chat-container">
                        <aside class="chat-history">
                            <h2>历史对话</h2>
                            <div class="history-list"></div>
                        </aside>
                        <section class="chat-main">
                            <div class="messages-container">
                                <div class="message system">
                                    <p>欢迎使用AI专业顾问系统。我可以为您提供以下服务：</p>
                                    <ul>
                                        <li>半导体生产安全管理咨询</li>
                                        <li>甲醇加注安全规范咨询</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="input-area">
                                <textarea id="userInput" placeholder="请输入您的问题..."></textarea>
                                <button id="sendButton">发送</button>
                            </div>
                        </section>
                    </div>
                `;
                // 重新绑定必要的DOM元素
                bindChatElements();
        }
    }

    // 绑定聊天相关的DOM元素
    function bindChatElements() {
        const newUserInput = document.getElementById('userInput');
        const newSendButton = document.getElementById('sendButton');
        const newMessagesContainer = document.querySelector('.messages-container');
        
        if (newUserInput && newSendButton && newMessagesContainer) {
            // 更新全局变量
            userInput = newUserInput;
            sendButton = newSendButton;
            messagesContainer = newMessagesContainer;
            
            // 移除旧的事件监听器
            sendButton.removeEventListener('click', handleSend);
            userInput.removeEventListener('keydown', handleKeyPress);
            
            // 添加新的事件监听器
            sendButton.addEventListener('click', handleSend);
            userInput.addEventListener('keydown', handleKeyPress);
            
            // 添加视觉反馈
            sendButton.style.transition = 'background-color 0.3s';
        }
    }

    // 监听路由变化
    window.addEventListener('hashchange', () => {
        handleRoute(window.location.hash);
    });

    // 初始化路由
    handleRoute(window.location.hash);

    // 设置导航事件
    function setupNavigation() {
        const navLinks = document.querySelectorAll('nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const route = link.getAttribute('href');
                window.location.hash = route === '#' ? '' : route.slice(1);
                handleRoute(route);
            });
        });
    }

    // 加载对话历史
    function loadConversation(index) {
        if (index >= 0 && index < conversationHistory.length) {
            const conversation = conversationHistory[index];
            // 切换到主页面
            window.location.hash = '';
            handleRoute('');
            // 显示选中的对话
            setTimeout(() => {
                addMessage(conversation.content, conversation.role === 'user');
            }, 100);
        }
    }

    // 添加消息到界面
    function addMessage(content, isUser = false, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : isError ? 'error' : 'ai'}`;
        messageDiv.style.backgroundColor = isUser ? '#e3f2fd' : isError ? '#ffebee' : '#f5f5f5';
        messageDiv.style.marginLeft = isUser ? 'auto' : '0';
        // 将换行符转换为<br>标签，保留空格
        const formattedContent = content.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
        messageDiv.innerHTML = formattedContent;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // 发送消息到服务器
    async function sendMessage(message) {
        try {
            // 禁用输入和发送按钮
            userInput.disabled = true;
            sendButton.disabled = true;
            sendButton.textContent = '发送中...';

            // 准备消息历史
            conversationHistory.push({ role: 'user', content: message });

            const response = await fetch('http://localhost:3000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: conversationHistory
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '网络请求失败');
            }

            // 处理流式响应
            const reader = response.body.getReader();
            let aiResponse = '';
            let aiMessageDiv = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // 解码响应数据
                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.choices && data.choices[0].delta.content) {
                                aiResponse += data.choices[0].delta.content;
                                // 实时更新AI回复
                                if (!aiMessageDiv) {
                                    addMessage(aiResponse, false);
                                    aiMessageDiv = document.querySelector('.message.ai:last-child');
                                } else {
                                    const formattedResponse = aiResponse.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
                                    aiMessageDiv.innerHTML = formattedResponse;
                                }
                            }
                        } catch (e) {
                            console.error('解析响应数据失败:', e);
                        }
                    }
                }
            }

            // 将AI回复添加到对话历史
            conversationHistory.push({ role: 'assistant', content: aiResponse });

        } catch (error) {
            console.error('发送消息失败:', error);
            addMessage(error.message || '抱歉，发送消息失败，请稍后重试。', false, true);
            // 发生错误时移除最后一条用户消息
            conversationHistory.pop();
        } finally {
            // 恢复输入和发送按钮
            userInput.disabled = false;
            sendButton.disabled = false;
            sendButton.textContent = '发送';
            userInput.value = '';
            userInput.focus();
        }
    }

    // 发送按钮点击事件处理函数
    function handleSend() {
        const message = userInput.value.trim();
        if (message) {
            addMessage(message, true);
            sendMessage(message);
        }
    }

    // 按键事件处理函数
    function handleKeyPress(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    // 绑定发送按钮点击事件
    sendButton.addEventListener('click', handleSend);

    // 绑定Enter键发送消息事件
    userInput.addEventListener('keydown', handleKeyPress);
});