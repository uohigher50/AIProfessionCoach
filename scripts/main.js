document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const messagesContainer = document.querySelector('.messages-container');

    // 存储对话历史
    let conversationHistory = [];

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

    // 发送按钮点击事件
    sendButton.addEventListener('click', () => {
        const message = userInput.value.trim();
        if (message) {
            addMessage(message, true);
            sendMessage(message);
        }
    });

    // 按Enter键发送消息（Shift+Enter换行）
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendButton.click();
        }
    });
});