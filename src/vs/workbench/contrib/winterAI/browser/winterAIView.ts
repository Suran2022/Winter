/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/winterAI.css';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IViewPaneOptions, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import * as DOM from '../../../../base/browser/dom.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IMarkdownRendererService } from '../../../../platform/markdown/browser/markdownRenderer.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { URI } from '../../../../base/common/uri.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IconLabel } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { FileKind } from '../../../../platform/files/common/files.js';


export class WinterAIViewPane extends ViewPane {

    private container!: HTMLElement;
    private messagesContainer!: HTMLElement;
    private inputBox!: HTMLElement;
    private inputElement!: HTMLTextAreaElement;

    // 渲染队列：确保消息和步骤按顺序展示
    private renderQueue: Promise<void> = Promise.resolve();

    constructor(
        options: IViewPaneOptions,
        @IKeybindingService keybindingService: IKeybindingService,
        @IContextMenuService contextMenuService: IContextMenuService,
        @IConfigurationService configurationService: IConfigurationService,
        @IContextKeyService contextKeyService: IContextKeyService,
        @IViewDescriptorService viewDescriptorService: IViewDescriptorService,
        @IInstantiationService instantiationService: IInstantiationService,
        @IOpenerService openerService: IOpenerService,
        @IThemeService themeService: IThemeService,
        @IHoverService hoverService: IHoverService,
        @IAuthenticationService private readonly authenticationService: IAuthenticationService,
        @INotificationService private readonly notificationService: INotificationService,
        @ICommandService private readonly commandService: ICommandService,
        @IMarkdownRendererService private readonly markdownRendererService: IMarkdownRendererService,
        @IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
        @IModelService private readonly modelService: IModelService,
        @ILanguageService private readonly languageService: ILanguageService,
    ) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
    }

    protected override renderBody(container: HTMLElement): void {
        super.renderBody(container);

        this.container = DOM.append(container, DOM.$('.winter-ai-container'));

        // 1. Chat Messages Area (initially hidden)
        this.messagesContainer = DOM.append(this.container, DOM.$('.winter-ai-messages'));
        this.messagesContainer.style.display = 'none'; // Hidden until first message

        // 1. Welcome / Empty State
        const welcomeContainer = DOM.append(this.container, DOM.$('.winter-ai-welcome'));

        const icon = DOM.append(welcomeContainer, DOM.$('div.winter-ai-welcome-icon'));
        icon.classList.add(...ThemeIcon.asClassNameArray(Codicon.commentDiscussion)); // Use chat icon

        DOM.append(welcomeContainer, DOM.$('div.winter-ai-welcome-title', undefined, 'Winter Code Engineer'));

        const subtitle = DOM.append(welcomeContainer, DOM.$('div.winter-ai-welcome-subtitle'));
        subtitle.append('If you are interested, welcome to have in-depth discussions with us. You can contact us through "');
        const link = DOM.append(subtitle, DOM.$('a.winter-ai-link', undefined, 'Winter Official Website')) as HTMLAnchorElement;
        link.href = '#';
        link.addEventListener('click', (e) => {
            e.preventDefault();
            this.openerService.open('https://github.com/Suran2022/Winter');
        });
        subtitle.append('".');

        // 2. Suggested Actions
        // Suggested Actions
        const suggestionsWrapper = DOM.append(this.container, DOM.$('.winter-ai-suggestions-wrapper'));

        const suggestionsHeader = DOM.append(suggestionsWrapper, DOM.$('.winter-ai-suggestions-header'));
        suggestionsHeader.innerText = 'SUGGESTED ACTIONS';

        const suggestionsButtons = DOM.append(suggestionsWrapper, DOM.$('.winter-ai-suggestions-buttons'));

        const suggestion1 = DOM.append(suggestionsButtons, DOM.$('button.winter-ai-suggestion-btn'));
        suggestion1.innerText = 'Build Workspace';

        const suggestion2 = DOM.append(suggestionsButtons, DOM.$('button.winter-ai-suggestion-btn'));
        suggestion2.innerText = 'Show Config';

        // 3. Input Area
        const inputContainer = DOM.append(this.container, DOM.$('.winter-ai-input-container'));
        this.inputBox = DOM.append(inputContainer, DOM.$('.winter-ai-input-box'));

        // Add Context Button
        const contextBtn = DOM.append(this.inputBox, DOM.$('.winter-ai-context-btn'));
        const paperclip = DOM.append(contextBtn, DOM.$('span'));
        paperclip.classList.add(...ThemeIcon.asClassNameArray(Codicon.attach));
        DOM.append(contextBtn, DOM.$('span', undefined, 'Add Context...'));

        // Textarea
        this.inputElement = DOM.append(this.inputBox, DOM.$('textarea.winter-ai-textarea')) as HTMLTextAreaElement;
        this.inputElement.placeholder = 'Describe what to build next';
        this.inputElement.rows = 1;

        // Footer
        const footer = DOM.append(this.inputBox, DOM.$('.winter-ai-input-footer'));

        // Left Actions
        const leftActions = DOM.append(footer, DOM.$('.winter-ai-input-actions-left'));
        this.createDropdown(leftActions, 'Agent');
        this.createDropdown(leftActions, 'Pick Model');
        this.createIconBtn(leftActions, Codicon.tools); // Tools icon

        // Right Actions
        const rightActions = DOM.append(footer, DOM.$('.winter-ai-input-actions-right'));
        this.createIconBtn(rightActions, Codicon.cloudUpload); // Cloud icon
        const sendBtn = this.createIconBtn(rightActions, Codicon.send);
        sendBtn.classList.add('winter-ai-send-btn');

        // Event Listeners
        this.inputElement.addEventListener('focus', () => this.inputBox.classList.add('focused'));
        this.inputElement.addEventListener('blur', () => this.inputBox.classList.remove('focused'));

        // Send button click handler
        sendBtn.addEventListener('click', () => this.handleSendMessage());

        // Enter key handler (Shift+Enter for new line, Enter to send)
        this.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });
    }

    private currentAgentMode: string = 'Ask';
    private _currentModel: string = 'DeepSeek'; // 预留：将来支持多模型时使用

    private createDropdown(parent: HTMLElement, text: string): void {
        const dropdown = DOM.append(parent, DOM.$('.winter-ai-dropdown'));
        dropdown.setAttribute('data-dropdown-type', text);
        const textSpan = DOM.append(dropdown, DOM.$('span', undefined, text));
        textSpan.classList.add('winter-ai-dropdown-text');
        const chevron = DOM.append(dropdown, DOM.$('span'));
        chevron.classList.add(...ThemeIcon.asClassNameArray(Codicon.chevronDown));

        // Add click handler for dropdowns
        if (text === 'Agent') {
            dropdown.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleAgentMenu(dropdown);
            });
            // Set initial text to Ask
            this.updateDropdownText(dropdown, 'Ask');
        } else if (text === 'Pick Model') {
            dropdown.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleModelMenu(dropdown);
            });
            // Set initial text to DeepSeek
            this.updateDropdownText(dropdown, 'DeepSeek');
        }
    }

    private toggleAgentMenu(anchorElement: HTMLElement): void {
        // Remove existing menu if any
        const existingMenu = anchorElement.lastElementChild;
        if (existingMenu && existingMenu.classList.contains('winter-ai-agent-menu')) {
            existingMenu.remove();
            return;
        }

        // Create menu attached to the dropdown itself
        const menu = DOM.append(anchorElement, DOM.$('.winter-ai-agent-menu'));

        // Agent option
        const agentItem = DOM.append(menu, DOM.$(`.winter-ai-agent-menu-item${this.currentAgentMode === 'Agent' ? '.selected' : ''}`));
        if (this.currentAgentMode === 'Agent') {
            const checkIcon = DOM.append(agentItem, DOM.$('span'));
            checkIcon.classList.add(...ThemeIcon.asClassNameArray(Codicon.check));
        }
        DOM.append(agentItem, DOM.$('span', undefined, 'Agent'));

        // Add keyboard shortcut for Agent
        DOM.append(agentItem, DOM.$('span.winter-ai-menu-shortcut', undefined, '⌘⇧I'));

        agentItem.addEventListener('click', () => {
            this.currentAgentMode = 'Agent';
            this.updateDropdownText(anchorElement, 'Agent');
            menu.remove();
        });

        // Ask option
        const askItem = DOM.append(menu, DOM.$(`.winter-ai-agent-menu-item${this.currentAgentMode === 'Ask' ? '.selected' : ''}`));
        if (this.currentAgentMode === 'Ask') {
            const checkIcon = DOM.append(askItem, DOM.$('span'));
            checkIcon.classList.add(...ThemeIcon.asClassNameArray(Codicon.check));
        }
        DOM.append(askItem, DOM.$('span', undefined, 'Ask'));
        askItem.addEventListener('click', () => {
            this.currentAgentMode = 'Ask';
            this.updateDropdownText(anchorElement, 'Ask');
            menu.remove();
        });

        // Edit option
        const editItem = DOM.append(menu, DOM.$(`.winter-ai-agent-menu-item${this.currentAgentMode === 'Edit' ? '.selected' : ''}`));
        if (this.currentAgentMode === 'Edit') {
            const checkIcon = DOM.append(editItem, DOM.$('span'));
            checkIcon.classList.add(...ThemeIcon.asClassNameArray(Codicon.check));
        }
        DOM.append(editItem, DOM.$('span', undefined, 'Edit'));

        // Add keyboard shortcut for Edit
        DOM.append(editItem, DOM.$('span.winter-ai-menu-shortcut', undefined, '⌘I'));

        editItem.addEventListener('click', () => {
            this.currentAgentMode = 'Edit';
            this.updateDropdownText(anchorElement, 'Edit');
            menu.remove();
        });

        // Separator
        DOM.append(menu, DOM.$('.winter-ai-agent-menu-separator'));

        // Configure option
        const configureItem = DOM.append(menu, DOM.$('.winter-ai-agent-menu-item.configure'));
        DOM.append(configureItem, DOM.$('span', undefined, 'Configure Custom Agents...'));
        configureItem.addEventListener('click', () => {
            console.log('Configure Custom Agents');
            menu.remove();
        });

        // Close menu when clicking outside
        const closeMenu = (e: MouseEvent) => {
            if (!menu.contains(e.target as Node) && !anchorElement.contains(e.target as Node)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }

    private toggleModelMenu(anchorElement: HTMLElement): void {
        // Remove existing menu if any
        const existingMenu = anchorElement.lastElementChild;
        if (existingMenu && existingMenu.classList.contains('winter-ai-agent-menu')) {
            existingMenu.remove();
            return;
        }

        // Create menu attached to the dropdown itself
        const menu = DOM.append(anchorElement, DOM.$('.winter-ai-agent-menu'));

        // DeepSeek option (only option for now)
        const isSelected = this._currentModel === 'DeepSeek';
        const deepseekItem = DOM.append(menu, DOM.$(`.winter-ai-agent-menu-item${isSelected ? '.selected' : ''}`));
        if (isSelected) {
            const checkIcon = DOM.append(deepseekItem, DOM.$('span'));
            checkIcon.classList.add(...ThemeIcon.asClassNameArray(Codicon.check));
        }
        DOM.append(deepseekItem, DOM.$('span', undefined, 'DeepSeek'));

        deepseekItem.addEventListener('click', () => {
            this._currentModel = 'DeepSeek';
            this.updateDropdownText(anchorElement, 'DeepSeek');
            menu.remove();
        });

        // Close menu when clicking outside
        const closeMenu = (e: MouseEvent) => {
            if (!menu.contains(e.target as Node) && !anchorElement.contains(e.target as Node)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }

    private updateDropdownText(dropdown: HTMLElement, text: string): void {
        const textSpan = dropdown.firstElementChild;
        if (textSpan) {
            textSpan.textContent = text;
        }
    }

    private createIconBtn(parent: HTMLElement, icon: ThemeIcon): HTMLElement {
        const btn = DOM.append(parent, DOM.$('.winter-ai-icon-btn'));
        btn.classList.add(...ThemeIcon.asClassNameArray(icon));
        return btn;
    }

    protected override layoutBody(height: number, width: number): void {
        super.layoutBody(height, width);
    }

    /**
     * 方法名: handleSendMessage
     * 说明: 处理发送消息事件，根据当前模式（Ask/Agent）调用不同的 API
     */
    private async handleSendMessage(): Promise<void> {
        const message = this.inputElement.value.trim();
        if (!message) {
            return;
        }

        // 1. 检查登录状态
        const session = await this.checkLogin();
        if (!session) {
            return;
        }

        // 2. 检查学分余额
        const hasCredits = await this.checkCredits(session.accessToken);
        if (!hasCredits) {
            return;
        }

        // 3. 清空输入框
        this.inputElement.value = '';

        // 4. 显示用户消息
        const userMessageElement = this.displayMessage('user', message);

        // 5. 根据模式调用不同的处理逻辑
        if (this.currentAgentMode === 'Agent') {
            // Agent 模式：支持工具调用
            await this.handleAgentMode(message, session.accessToken, userMessageElement);
        } else if (this.currentAgentMode === 'Ask') {
            // Ask 模式：仅聊天
            await this.handleAskMode(message, session.accessToken, userMessageElement);
        } else {
            // Edit 模式或其他模式：暂未开放
            this.notificationService.info(`${this.currentAgentMode} 模式即将开放，敬请期待！`);
            // 移除已显示的用户消息
            userMessageElement.remove();
        }
    }

    /**
     * 方法名: handleAskMode
     * 参数: message - 用户消息, accessToken - Access Token, userMessageElement - 用户消息元素
     * 说明: 处理 Ask 模式的聊天（原有逻辑）
     */
    private async handleAskMode(message: string, accessToken: string, userMessageElement: HTMLElement): Promise<void> {
        // 显示 AI 加载状态
        const aiMessageElement = this.displayMessage('assistant', '');
        const loadingSpinner = DOM.append(aiMessageElement, DOM.$('.winter-ai-loading-spinner'));

        // 动态调整底部空间并滚动
        this.messagesContainer.classList.remove('has-overflow');

        setTimeout(() => {
            const isOverflowing = this.messagesContainer.scrollHeight > this.messagesContainer.clientHeight;

            if (isOverflowing) {
                this.messagesContainer.classList.add('has-overflow');
                void this.messagesContainer.offsetHeight;
                userMessageElement.scrollIntoView({ behavior: 'auto', block: 'start' });
            } else {
                this.messagesContainer.classList.remove('has-overflow');
            }
        }, 50);

        // 发送聊天请求
        try {
            await this.sendChatRequest(message, accessToken, aiMessageElement, loadingSpinner);
        } catch (error) {
            loadingSpinner.remove();
            aiMessageElement.textContent = `错误: ${error}`;
        }
    }

    /**
     * 方法名: handleAgentMode
     * 参数: message - 用户消息, accessToken - Access Token, userMessageElement - 用户消息元素
     * 说明: 处理 Agent 模式的聊天（支持工具调用）
     */
    private async handleAgentMode(message: string, accessToken: string, userMessageElement: HTMLElement): Promise<void> {
        // 显示 AI 消息容器（Agent 模式有特殊结构）
        const aiMessageElement = this.displayMessage('assistant', '');
        const loadingSpinner = DOM.append(aiMessageElement, DOM.$('.winter-ai-loading-spinner'));

        // 动态调整底部空间并滚动
        this.messagesContainer.classList.remove('has-overflow');

        setTimeout(() => {
            const isOverflowing = this.messagesContainer.scrollHeight > this.messagesContainer.clientHeight;

            if (isOverflowing) {
                this.messagesContainer.classList.add('has-overflow');
                void this.messagesContainer.offsetHeight;
                userMessageElement.scrollIntoView({ behavior: 'auto', block: 'start' });
            } else {
                this.messagesContainer.classList.remove('has-overflow');
            }
        }, 50);

        // 发送 Agent 请求
        try {
            await this.sendAgentRequest(message, accessToken, aiMessageElement, loadingSpinner);
        } catch (error) {
            loadingSpinner.remove();
            aiMessageElement.textContent = `错误: ${error}`;
        }
    }

    /**
     * 方法名: checkLogin
     * 说明: 检查用户登录状态
     * 返回: Promise<any | null>
     */
    private async checkLogin(): Promise<any | null> {
        try {
            const session = await this.authenticationService.getSessions('winter');
            if (!session || session.length === 0) {
                // 触发登录
                this.notificationService.info('请先登录 Winter 账户');
                await this.authenticationService.createSession('winter', ['user:email']);
                return null;
            }
            return session[0];
        } catch (error) {
            this.notificationService.error('登录失败，请重试');
            return null;
        }
    }

    /**
     * 方法名: checkCredits
     * 参数: accessToken - 用户 Access Token
     * 说明: 检查用户学分余额
     * 返回: Promise<boolean> - 是否有足够学分
     */
    private async checkCredits(accessToken: string): Promise<boolean> {
        try {
            const data = await this.commandService.executeCommand<{ balance: number; sufficient: boolean; message: string }>('winter.checkCredits', accessToken);

            if (!data || !data.sufficient) {
                this.notificationService.warn(`学分不足！当前余额: ${data?.balance ?? 0}，请充值后继续使用`);
                return false;
            }

            return true;
        } catch (error) {
            this.notificationService.error(`查询学分失败: ${error}`);
            return false;
        }
    }

    /**
     * 方法名: sendChatRequest
     * 参数: message - 用户消息, accessToken - Access Token, aiMessageElement - AI 消息元素, loadingSpinner - 加载动画元素
     * 说明: 发送聊天请求并处理流式响应
     */
    private async sendChatRequest(
        message: string,
        accessToken: string,
        aiMessageElement: HTMLElement,
        loadingSpinner: HTMLElement
    ): Promise<void> {
        try {
            // 调用扩展命令发送请求，绕过 CSP 限制
            const content = await this.commandService.executeCommand<string>('winter.sendChatRequest', accessToken, message);

            // 移除加载动画
            if (loadingSpinner.parentElement) {
                loadingSpinner.remove();
            }

            if (!content) {
                throw new Error('未收到回复内容');
            }

            // 打字机效果
            // 为了性能和体验，每次增加一定数量的字符，而不是逐个字符
            const chunkSize = 2;
            let currentLength = 0;

            while (currentLength < content.length) {
                currentLength += chunkSize;
                if (currentLength > content.length) {
                    currentLength = content.length;
                }

                const currentContent = content.substring(0, currentLength);
                this.renderMarkdown(currentContent, aiMessageElement);

                // 智能滚动：确保 AI 回复的最新内容可见
                // 使用 block: 'end' 强制对齐到底部，确保看到最新生成的文字
                aiMessageElement.scrollIntoView({ behavior: 'auto', block: 'end' });

                // 延时
                await new Promise(resolve => setTimeout(resolve, 5));
            }

            // 确保最后渲染完整内容
            this.renderMarkdown(content, aiMessageElement);
            // 最后也确保可见
            aiMessageElement.scrollIntoView({ behavior: 'auto', block: 'end' });

        } catch (error) {
            // 移除加载动画
            if (loadingSpinner.parentElement) {
                loadingSpinner.remove();
            }
            throw error;
        }
    }

    /**
     * 方法名: renderMarkdown
     * 参数: content - Markdown 内容, container - 容器元素
     * 说明: 渲染 Markdown 并美化代码块
     */
    private stepElements = new Map<string, HTMLElement>();

    /**
     * 方法名: sendAgentRequest
     * 参数: message - 用户消息, accessToken - Access Token, aiMessageElement - AI 消息元素, loadingSpinner - 加载动画元素
     * 说明: 发送 Agent 请求并处理 SSE 流式响应（通过 Extension Host 代理轮询）支持步骤和确认
     */
    private async sendAgentRequest(
        message: string,
        accessToken: string,
        aiMessageElement: HTMLElement,
        loadingSpinner: HTMLElement
    ): Promise<void> {
        this.stepElements.clear(); // 清理旧的步骤状态

        try {
            const workspaceRoot = this.workspaceContextService.getWorkspace().folders[0]?.uri.fsPath;
            if (!workspaceRoot) {
                throw new Error('No workspace folder open');
            }

            console.log('使用的工作目录:', workspaceRoot);

            // 1. 启动请求 (Extension Host 不受 CSP 限制)
            const requestId = await this.commandService.executeCommand<string>('winter.startAgentRequest', accessToken, message, workspaceRoot);

            // 移除加载动画，显示"思考中"指示器
            if (loadingSpinner.parentElement) {
                loadingSpinner.remove();
            }

            // 立即显示思考中状态
            const thinkingIndicator = DOM.append(aiMessageElement, DOM.$('.winter-ai-thinking-indicator'));
            DOM.append(thinkingIndicator, DOM.$('span.winter-ai-status-indicator'));
            const thinkingText = DOM.append(thinkingIndicator, DOM.$('span'));
            thinkingText.textContent = 'Thinking...';
            thinkingText.style.marginLeft = '8px';

            // 2. 轮询获取数据
            let buffer = '';
            while (true) {
                const response = await this.commandService.executeCommand<any>('winter.getAgentResponse', requestId);

                if (response.error) {
                    throw new Error(response.error);
                }

                if (response.chunks && response.chunks.length > 0) {
                    console.log('[WinterAI] Received chunks:', response.chunks.length);
                    for (const chunk of response.chunks) {
                        buffer += chunk;
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            const trimmedLine = line.trim();
                            if (trimmedLine.startsWith('data:')) {
                                const jsonStr = trimmedLine.substring(5).trim();
                                if (jsonStr && jsonStr !== '[DONE]') {
                                    try {
                                        const data = JSON.parse(jsonStr);
                                        console.log('[WinterAI] Received Agent data:', data);

                                        // 将处理逻辑加入渲染队列
                                        this.renderQueue = this.renderQueue.then(async () => {
                                            // 处理不同类型的消息
                                            if (!data.type || data.type === 'message') {
                                                // 实时渲染思考内容（reasoning_content）- 打字效果
                                                // 只在没有正式内容时显示思考内容（避免总结阶段重复显示）
                                                if (data.reasoningContent && (!data.content || data.content.trim().length === 0)) {
                                                    console.log('收到 reasoning_content:', data.reasoningContent.substring(0, 100));
                                                    // 移除思考指示器
                                                    const thinkingIndicator = aiMessageElement.querySelector('.winter-ai-thinking-indicator');
                                                    if (thinkingIndicator) {
                                                        thinkingIndicator.remove();
                                                    }

                                                    // 直接添加到 aiMessageElement，保持顺序
                                                    const reasoningContainer = DOM.append(aiMessageElement, DOM.$('.winter-ai-reasoning-content'));
                                                    reasoningContainer.style.opacity = '0.8';
                                                    reasoningContainer.style.fontStyle = 'italic';
                                                    reasoningContainer.style.marginBottom = '8px';

                                                    // 打字效果 (await 确保执行完才处理下一条)
                                                    await this.typewriterEffect(data.reasoningContent, reasoningContainer, 10);
                                                    this.scrollToBottom();
                                                }

                                                // 实时渲染正式内容（content）
                                                if (data.content) {
                                                    console.log('收到 content:', data.content.substring(0, 50));
                                                    // 移除思考指示器（如果还有）
                                                    const thinkingIndicator = aiMessageElement.querySelector('.winter-ai-thinking-indicator');
                                                    if (thinkingIndicator) {
                                                        thinkingIndicator.remove();
                                                    }

                                                    // 使用打字机效果
                                                    // 首先移除旧的内容容器（如果不是增量更新）- 这里我们假设每次都是增量或者独立的
                                                    // 为了支持 DeepSeek 的流式输出，通常是增量，但这里后端返回的是当前累积的还是增量？
                                                    // 假设是增量（chunks），直接 append
                                                    // 但如果 Agent 返回的是完整文本（某些实现），则需要清空
                                                    // 您的后端 AgentServiceImpl 似乎是一次返回一段？
                                                    // 无论如何，这里我们创建一个新的 div 来放这段 content
                                                    // 为了避免过多 DOM，我们可以尝试合并到最后一个 .winter-ai-content
                                                    let contentContainer = aiMessageElement.lastElementChild as HTMLElement;
                                                    if (!contentContainer || !contentContainer.classList.contains('winter-ai-content')) {
                                                        contentContainer = DOM.append(aiMessageElement, DOM.$('.winter-ai-content'));
                                                        contentContainer.style.marginBottom = '12px';
                                                    }

                                                    // 对 content 也使用打字机效果
                                                    await this.typewriterEffect(data.content, contentContainer, 15);
                                                    this.scrollToBottom();
                                                }
                                            } else if (data.type === 'step' && data.stepInfo) {
                                                console.log('收到 step:', data.stepInfo);
                                                // 渲染步骤状态
                                                this.renderAgentStep(data.stepInfo, aiMessageElement);
                                                this.scrollToBottom();

                                                // 如果是步骤开始，给一点视觉延迟
                                                if (data.stepInfo.status === 'running') {
                                                    await new Promise(resolve => setTimeout(resolve, 200));
                                                }
                                            } else if (data.type === 'confirmation_request' && data.requestId && data.stepInfo) { // 确保有 requestId 和 stepInfo
                                                console.log('收到确认请求:', data.stepInfo);
                                                this.renderConfirmationRequest(data.stepInfo, aiMessageElement, data.requestId, accessToken);
                                                this.scrollToBottom();
                                                // 确认请求需要等待用户操作，不需要 await 阻塞队列（因为它是最后的动作）
                                            }
                                        }).catch(err => {
                                            console.error('Error in render queue:', err);
                                        });

                                    } catch (e) {
                                        console.error('Failed to parse JSON chunk:', e);
                                    }
                                }
                            }
                        }
                    }
                }

                if (response.done) {
                    // 等待所有渲染完成
                    await this.renderQueue;
                    break;
                }

                // 避免轮询过快
                await new Promise(resolve => setTimeout(resolve, 100)); // 100ms 轮询间隔
            }

        } catch (error) {
            // 移除加载动画
            if (loadingSpinner.parentElement) {
                loadingSpinner.remove();
            }
            throw error;
        }
    }


    private renderAgentStep(stepInfo: any, container: HTMLElement): void {
        let stepEl = this.stepElements.get(stepInfo.id);

        if (!stepEl) {
            stepEl = DOM.append(container, DOM.$('.winter-ai-step'));
            this.stepElements.set(stepInfo.id, stepEl);
        }

        // 确保容器有正确的 Flex 布局类
        if (!stepEl.classList.contains('winter-ai-step-container')) {
            stepEl.classList.add('winter-ai-step-container');
        }

        // 清空内容重新构建 (为了更容易处理不同的布局，且避免状态混淆)
        // 注意：由于我们现在有特定的布局要求，增量更新变得复杂，
        // 最好是保留结构引用或在确定布局类型后更新。
        // 但为了简化实现 "Read file(s) [Pill]" 这种结构，完全重绘可能更安全，前提是不闪烁。
        // 之前的闪烁是因为 clearNode 导致高度塌陷。
        // 我们可以尝试复用元素。

        let icon = stepEl.querySelector('.winter-ai-step-icon') as HTMLElement;
        if (!icon) {
            icon = DOM.append(stepEl, DOM.$('span.winter-ai-step-icon'));
        }

        let label = stepEl.querySelector('.winter-ai-step-label') as HTMLElement;
        if (!label) {
            label = DOM.append(stepEl, DOM.$('span.winter-ai-step-label'));
        }

        // 移除旧的 Pill (如果有)
        const oldPill = stepEl.querySelector('.winter-ai-file-pill');
        if (oldPill) oldPill.remove();

        // 获取工具信息
        let toolName = '';
        let args: any = {};
        if (stepInfo.toolCall && stepInfo.toolCall.function) {
            toolName = stepInfo.toolCall.function.name;
            try {
                args = JSON.parse(stepInfo.toolCall.function.arguments);
            } catch (e) {
                // ignore
            }
        }

        const filePath = args.file_path || args.TargetFile || args.AbsolutePath || args.directory_path || args.path;

        // 设置图标和文本
        if (stepInfo.status === 'running') {
            // 使用转圈的加载图标
            icon.className = 'codicon codicon-loading codicon-modifier-spin winter-ai-step-icon';
            icon.style.color = 'var(--vscode-progressBar-background)';

            if (toolName.includes('read') || toolName.includes('view')) {
                label.textContent = 'Reading file(s)...';
            } else if (toolName.includes('write') || toolName.includes('edit') || toolName.includes('replace')) {
                label.textContent = 'Editing file...';
            } else if (toolName.includes('delete')) {
                label.textContent = 'Deleting file...';
            } else if (toolName.includes('command')) {
                label.textContent = 'Executing...';
            } else if (toolName.includes('list')) {
                label.textContent = 'Listing directory...';
            } else {
                label.textContent = toolName ? `${toolName}...` : 'Processing...';
            }

        } else if (stepInfo.status === 'completed') {
            // 图标
            if (toolName.includes('read') || toolName.includes('view')) {
                // 读文件：显示眼睛图标
                icon.className = 'codicon codicon-eye winter-ai-step-icon';
                icon.style.color = 'var(--vscode-textLink-foreground)';
                label.textContent = 'Read file(s)';
            } else {
                // 其他（写、执行）：显示绿色对勾
                icon.className = 'codicon codicon-check winter-ai-step-icon';
                icon.style.color = 'var(--vscode-testing-iconPassed)';

                if (toolName.includes('write') || toolName.includes('edit') || toolName.includes('replace')) {
                    label.textContent = 'Accepted edits to';
                } else if (toolName.includes('delete')) {
                    label.textContent = 'Deleted';
                } else {
                    label.textContent = 'Completed';
                }
            }
        } else if (stepInfo.status === 'failed') {
            icon.className = 'codicon codicon-error winter-ai-step-icon';
            icon.style.color = 'var(--vscode-testing-iconFailed)';
            label.textContent = 'Failed';
        }

        // 添加文件 Pill
        if (filePath) {
            const pill = DOM.append(stepEl, DOM.$('span.winter-ai-file-pill'));

            // 使用 IconLabel 显示官方文件图标
            const resource = URI.file(filePath);
            const fileKind = args.directory_path ? FileKind.FOLDER : FileKind.FILE;
            const classes = getIconClasses(this.modelService, this.languageService, resource, fileKind);

            const iconLabel = new IconLabel(pill, { supportHighlights: false });
            const labelText = filePath.split(/[/\\]/).pop() || filePath;

            iconLabel.setLabel(labelText, undefined, { extraClasses: classes });

            // 简单的样式调整
            const labelElement = iconLabel.element;
            labelElement.style.display = 'flex';
            labelElement.style.alignItems = 'center';

            pill.title = filePath;

            // 点击打开文件
            pill.onclick = (e) => {
                // 防止事件冒泡（虽然 IconLabel 内部可能有处理，但以防万一）
                e.stopPropagation();
                this.openerService.open(filePath);
            };
        }
    }

    private renderConfirmationRequest(stepInfo: any, container: HTMLElement, requestId: string, accessToken: string): void {
        // 检查是否已经渲染过
        const confirmId = `confirm-${stepInfo.id}`;
        if (container.querySelector(`#${confirmId}`)) return;

        const confirmEl = DOM.append(container, DOM.$('.winter-ai-confirmation'));
        confirmEl.id = confirmId;

        const title = DOM.append(confirmEl, DOM.$('.winter-ai-confirmation-title'));
        title.textContent = 'Waiting on your input.';

        const details = DOM.append(confirmEl, DOM.$('.winter-ai-confirmation-details'));
        details.textContent = stepInfo.content;
        details.style.marginBottom = '8px';
        details.style.fontSize = '0.9em';

        if (stepInfo.toolCall && stepInfo.toolCall.function && stepInfo.toolCall.function.arguments) {
            const codeBlock = DOM.append(confirmEl, DOM.$('pre'));
            codeBlock.style.backgroundColor = 'var(--vscode-editor-background)';
            codeBlock.style.padding = '4px';
            codeBlock.style.overflow = 'auto';
            codeBlock.style.maxHeight = '100px';
            codeBlock.textContent = stepInfo.toolCall.function.arguments;
        }

        const actions = DOM.append(confirmEl, DOM.$('.winter-ai-confirmation-actions'));
        actions.style.display = 'flex';
        actions.style.gap = '8px';

        const createBtn = (text: string, isPrimary: boolean, onClick: () => void) => {
            const btn = DOM.append(actions, DOM.$('button'));
            btn.textContent = text;
            btn.style.padding = '4px 8px';
            btn.style.border = 'none';
            btn.style.cursor = 'pointer';
            btn.style.borderRadius = '2px';
            if (isPrimary) {
                btn.style.backgroundColor = 'var(--vscode-button-background)';
                btn.style.color = 'var(--vscode-button-foreground)';
            } else {
                btn.style.backgroundColor = 'var(--vscode-button-secondaryBackground)';
                btn.style.color = 'var(--vscode-button-secondaryForeground)';
            }
            btn.onclick = onClick;
            return btn;
        };

        createBtn('Reject', false, async () => {
            confirmEl.remove();
            await this.commandService.executeCommand('winter.confirmAgentAction', requestId, 'reject', accessToken);
        });

        createBtn('Trust', true, async () => {
            confirmEl.remove();
            await this.commandService.executeCommand('winter.confirmAgentAction', requestId, 'approve', accessToken);
        });
    }

    /**
     * 方法名: renderMarkdown
     * 参数: content - Markdown 内容, container - 容器元素
     * 说明: 渲染 Markdown 并美化代码块
     */
    private renderMarkdown(content: string, container: HTMLElement): void {
        DOM.clearNode(container); // 使用 DOM 工具清空内容

        const markdown = new MarkdownString(content, {
            isTrusted: true,
            supportThemeIcons: true
        });

        const rendered = this.markdownRendererService.render(markdown);
        // 注意：rendered 是一个 Disposable，应该在不需要时 dispose。
        // 在这里，我们将其添加到 this._register(rendered) 如果我们希望它随视图销毁，
        // 或者我们需要一种机制来清理旧的渲染结果。
        // 更好的做法是：
        // this._currentRenderDisposable?.dispose();
        // this._currentRenderDisposable = rendered;

        const element = rendered.element;

        // 美化代码块：添加头部和边框
        const codeBlocks = element.querySelectorAll('pre code');
        codeBlocks.forEach(code => {
            const pre = code.parentElement as HTMLPreElement;
            // 避免重复处理
            if (pre.parentElement?.classList.contains('winter-ai-code-block')) {
                return;
            }

            const classes = code.className.split(/\s+/);
            const langClass = classes.find(c => c.startsWith('language-'));
            const lang = langClass ? langClass.replace('language-', '') : 'text';

            // 创建包装器
            const wrapper = DOM.$('.winter-ai-code-block');

            // 创建头部
            const header = DOM.append(wrapper, DOM.$('.winter-ai-code-header'));
            const langLabel = DOM.append(header, DOM.$('span.winter-ai-code-lang'));
            langLabel.textContent = lang;

            // 替换 DOM 结构
            if (pre.parentNode) {
                pre.parentNode.replaceChild(wrapper, pre);
                wrapper.appendChild(pre);
            }
        });

        // 处理文件路径：将文件路径转换为可点击的 pill
        const workspaceRoot = this.workspaceContextService.getWorkspace().folders[0]?.uri.fsPath;
        if (workspaceRoot) {
            const textNodes: Node[] = [];
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
            let node;
            while (node = walker.nextNode()) {
                // 跳过代码块中的文本
                let parent = node.parentElement;
                let inCodeBlock = false;
                while (parent && parent !== element) {
                    if (parent.tagName === 'CODE' || parent.tagName === 'PRE') {
                        inCodeBlock = true;
                        break;
                    }
                    parent = parent.parentElement;
                }
                if (!inCodeBlock) {
                    textNodes.push(node);
                }
            }

            // 文件路径正则：匹配常见的文件扩展名
            const filePathRegex = /([a-zA-Z0-9_\-./]+\.(py|js|ts|java|json|txt|md|xml|yaml|yml|css|html|sh|go|rs|cpp|c|h))/g;

            textNodes.forEach(textNode => {
                const text = textNode.textContent || '';
                const matches = Array.from(text.matchAll(filePathRegex));
                if (matches.length > 0) {
                    const fragment = document.createDocumentFragment();
                    let lastIndex = 0;

                    matches.forEach(match => {
                        const filePath = match[1];
                        const startIndex = match.index!;

                        // 添加匹配前的文本
                        if (startIndex > lastIndex) {
                            fragment.appendChild(document.createTextNode(text.substring(lastIndex, startIndex)));
                        }

                        // 创建文件 pill
                        const pill = DOM.$('span.winter-ai-file-pill');

                        // 构造完整路径以获取正确的图标
                        const fullPath = filePath.startsWith('/') ? filePath : `${workspaceRoot}/${filePath}`;
                        const resource = URI.file(fullPath);
                        const classes = getIconClasses(this.modelService, this.languageService, resource, FileKind.FILE);

                        // 使用 IconLabel 显示官方图标
                        const iconLabel = new IconLabel(pill, { supportHighlights: false });
                        const fileNameStr = filePath.split(/[/\\]/).pop() || filePath;

                        iconLabel.setLabel(fileNameStr, undefined, { extraClasses: classes });

                        // 样式调整确保 IconLabel 正确显示
                        const labelElement = iconLabel.element;
                        labelElement.style.display = 'flex';
                        labelElement.style.alignItems = 'center';

                        pill.title = fullPath;
                        pill.onclick = (e) => {
                            e.stopPropagation(); // 防止冒泡
                            this.commandService.executeCommand('vscode.open', URI.file(fullPath));
                        };
                        fragment.appendChild(pill);

                        lastIndex = startIndex + filePath.length;
                    });

                    // 添加剩余文本
                    if (lastIndex < text.length) {
                        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
                    }

                    textNode.parentNode?.replaceChild(fragment, textNode);
                }
            });
        }

        container.appendChild(element);
    }

    /**
     * 方法名: displayMessage
     * 参数: role - 角色 (user/assistant), content - 消息内容
     * 说明: 显示消息到对话区域
     * 返回: HTMLElement - 消息元素
     */
    private displayMessage(role: 'user' | 'assistant', content: string): HTMLElement {
        // 显示消息容器
        if (this.messagesContainer.style.display === 'none') {
            this.messagesContainer.style.display = 'flex';
            // 隐藏欢迎界面
            const welcome = this.container.querySelector('.winter-ai-welcome');
            const suggestions = this.container.querySelector('.winter-ai-suggestions-wrapper');
            if (welcome) (welcome as HTMLElement).style.display = 'none';
            if (suggestions) (suggestions as HTMLElement).style.display = 'none';
        }

        // 使用 append 在底部插入消息（标准顺序）
        const messageElement = DOM.append(this.messagesContainer, DOM.$(`.winter-ai-message.${role}`));
        const contentElement = DOM.append(messageElement, DOM.$('.winter-ai-message-content'));

        // 对于 assistant 消息，使用 Markdown 渲染
        if (role === 'assistant') {
            const markdown = new MarkdownString(content, {
                isTrusted: true,
                supportThemeIcons: true
            });
            const rendered = this.markdownRendererService.render(markdown);
            contentElement.appendChild(rendered.element);
        } else {
            // 用户消息保持纯文本
            contentElement.textContent = content;
        }

        return messageElement; // 返回消息容器元素，以便滚动
    }

    /**
            throw error;
        }
    }

    /**
     * 方法名: renderAgentThinking
     * 参数: reasoningContent - 思考内容, container - 容器元素
     * 说明: 渲染 Agent 的思考过程（可折叠，带光扫效果）
     */
    // @ts-ignore
    private renderAgentThinking(reasoningContent: string, container: HTMLElement): HTMLElement {
        // 创建思考容器
        const thinkingContainer = DOM.append(container, DOM.$('.winter-ai-thinking'));

        // 创建思考头部（可点击折叠/展开）
        const thinkingHeader = DOM.append(thinkingContainer, DOM.$('.winter-ai-thinking-header'));

        // 添加光扫效果
        // @ts-expect-error - shimmer 元素用于 CSS 动画，不需要在 TS 中引用
        const shimmer = DOM.append(thinkingHeader, DOM.$('.winter-ai-thinking-shimmer'));

        const thinkingLabel = DOM.append(thinkingHeader, DOM.$('span.winter-ai-thinking-label'));
        thinkingLabel.textContent = 'Thinking...';

        const chevron = DOM.append(thinkingHeader, DOM.$('span.winter-ai-thinking-chevron'));
        chevron.classList.add(...ThemeIcon.asClassNameArray(Codicon.chevronDown));

        // 创建思考内容（默认折叠）
        const thinkingContent = DOM.append(thinkingContainer, DOM.$('.winter-ai-thinking-content.collapsed'));
        thinkingContent.textContent = reasoningContent;

        // 点击头部切换折叠/展开
        thinkingHeader.addEventListener('click', () => {
            const isCollapsed = thinkingContent.classList.contains('collapsed');
            if (isCollapsed) {
                thinkingContent.classList.remove('collapsed');
                chevron.classList.remove(...ThemeIcon.asClassNameArray(Codicon.chevronDown));
                chevron.classList.add(...ThemeIcon.asClassNameArray(Codicon.chevronUp));
            } else {
                thinkingContent.classList.add('collapsed');
                chevron.classList.remove(...ThemeIcon.asClassNameArray(Codicon.chevronUp));
                chevron.classList.add(...ThemeIcon.asClassNameArray(Codicon.chevronDown));
            }
        });

        return thinkingContainer;
    }

    /**
     * 方法名: renderAgentToolCall
     * 参数: toolCall - 工具调用信息, container - 容器元素
     * 说明: 渲染 Agent 的工具调用（文件操作、命令执行等）
     */
    // @ts-ignore
    private renderAgentToolCall(toolCall: any, container: HTMLElement): HTMLElement {
        const toolContainer = DOM.append(container, DOM.$('.winter-ai-tool-call'));

        // 工具名称
        const toolHeader = DOM.append(toolContainer, DOM.$('.winter-ai-tool-header'));
        const toolIcon = DOM.append(toolHeader, DOM.$('span'));

        // 根据工具类型选择图标
        const iconMap: { [key: string]: ThemeIcon } = {
            'read_file': Codicon.fileCode,
            'write_file': Codicon.edit,
            'list_files': Codicon.folder,
            'execute_command': Codicon.terminal
        };
        const icon = iconMap[toolCall.function.name] || Codicon.tools;
        toolIcon.classList.add(...ThemeIcon.asClassNameArray(icon));

        const toolName = DOM.append(toolHeader, DOM.$('span.winter-ai-tool-name'));
        toolName.textContent = toolCall.function.name;

        // 工具参数
        const toolArgs = DOM.append(toolContainer, DOM.$('.winter-ai-tool-args'));
        try {
            const args = JSON.parse(toolCall.function.arguments);

            // 特殊处理文件路径（可点击打开）
            if (args.file_path) {
                const filePathLabel = DOM.append(toolArgs, DOM.$('span.winter-ai-file-path'));
                filePathLabel.textContent = args.file_path;
                filePathLabel.title = '点击打开文件';
                filePathLabel.addEventListener('click', () => {
                    this.commandService.executeCommand('vscode.open', URI.file(args.file_path));
                });
            }

            // 显示其他参数
            for (const [key, value] of Object.entries(args)) {
                if (key !== 'file_path') {
                    const argItem = DOM.append(toolArgs, DOM.$('.winter-ai-tool-arg'));
                    argItem.textContent = `${key}: ${value}`;
                }
            }
        } catch (e) {
            toolArgs.textContent = toolCall.function.arguments;
        }

        return toolContainer;
    }

    /**
     * 方法名: renderFileModificationConfirm
     * 参数: filePath - 文件路径, content - 文件内容, operation - 操作类型, container - 容器元素
     * 说明: 渲染文件修改确认对话框（支持预览、对比、确认/拒绝）
     * 注意: 此方法将在 Agent 模式完全集成后使用
     */
    // @ts-expect-error - 预留方法，将在 Agent 模式完全集成后使用
    private async renderFileModificationConfirm(
        filePath: string,
        content: string,
        operation: 'create' | 'modify' | 'delete',
        container: HTMLElement
    ): Promise<boolean> {
        return new Promise((resolve) => {
            const confirmContainer = DOM.append(container, DOM.$('.winter-ai-file-confirm'));

            // 标题
            const title = DOM.append(confirmContainer, DOM.$('.winter-ai-file-confirm-title'));
            const operationText = operation === 'create' ? '创建' : operation === 'modify' ? '修改' : '删除';
            title.textContent = `${operationText}文件: ${filePath}`;

            // 内容预览（仅创建和修改时显示）
            if (operation !== 'delete') {
                const preview = DOM.append(confirmContainer, DOM.$('.winter-ai-file-preview'));
                const pre = DOM.append(preview, DOM.$('pre'));
                const code = DOM.append(pre, DOM.$('code'));
                code.textContent = content;
            }

            // 按钮组
            const buttons = DOM.append(confirmContainer, DOM.$('.winter-ai-file-confirm-buttons'));

            const confirmBtn = DOM.append(buttons, DOM.$('button.winter-ai-btn.winter-ai-btn-primary'));
            confirmBtn.textContent = '确认';
            confirmBtn.addEventListener('click', () => {
                confirmContainer.remove();
                resolve(true);
            });

            const cancelBtn = DOM.append(buttons, DOM.$('button.winter-ai-btn.winter-ai-btn-secondary'));
            cancelBtn.textContent = '取消';
            cancelBtn.addEventListener('click', () => {
                confirmContainer.remove();
                resolve(false);
            });
        });
    }

    /**
     * 方法名: typewriterEffect
     * 参数: text - 要显示的文本, container - 容器元素, speed - 打字速度（毫秒/字符）
     * 说明: 实现打字机效果
     * 返回: Promise<void>
     */
    private async typewriterEffect(text: string, container: HTMLElement, speed: number = 15): Promise<void> {
        return new Promise((resolve) => {
            let index = 0;

            const typeNextChar = () => {
                if (index < text.length) {
                    // 清空 container 并重新渲染
                    DOM.clearNode(container);
                    this.renderMarkdown(text.substring(0, index + 1), container);
                    index++;

                    // 每打几个字就滚动一次
                    if (index % 5 === 0) {
                        this.scrollToBottom();
                    }

                    setTimeout(typeNextChar, speed);
                } else {
                    // 最后再滚动一次确保到底部
                    this.scrollToBottom();
                    resolve();
                }
            };

            typeNextChar();
        });
    }

    /**
     * 方法名: scrollToBottom
     * 说明: 滚动到消息容器底部
     */
    private scrollToBottom(): void {
        // 使用 requestAnimationFrame 确保 DOM 更新后再滚动
        requestAnimationFrame(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        });
    }
}
