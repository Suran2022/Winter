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

export class WinterAIViewPane extends ViewPane {

    private container!: HTMLElement;
    private messagesContainer!: HTMLElement;
    private inputBox!: HTMLElement;
    private inputElement!: HTMLTextAreaElement;

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
     * 说明: 处理发送消息事件
     */
    /**
     * 方法名: handleSendMessage
     * 说明: 处理发送消息事件
     */
    private async handleSendMessage(): Promise<void> {
        const message = this.inputElement.value.trim();
        if (!message) {
            return;
        }

        // 0. 检查当前模式是否为 Ask
        if (this.currentAgentMode !== 'Ask') {
            this.notificationService.info(`${this.currentAgentMode} 模式即将开放，敬请期待！`);
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

        // 5. 显示 AI 加载状态
        const aiMessageElement = this.displayMessage('assistant', '');
        const loadingSpinner = DOM.append(aiMessageElement, DOM.$('.winter-ai-loading-spinner'));

        // 6. 关键：动态调整底部空间并滚动
        // 先移除 overflow 类，检查自然高度是否溢出
        this.messagesContainer.classList.remove('has-overflow');

        // 使用 setTimeout 确保 DOM 更新后计算高度
        setTimeout(() => {
            const isOverflowing = this.messagesContainer.scrollHeight > this.messagesContainer.clientHeight;

            if (isOverflowing) {
                // 只有当内容溢出时，才增加底部空间以允许置顶
                this.messagesContainer.classList.add('has-overflow');

                // 强制重排，确保 CSS 生效
                void this.messagesContainer.offsetHeight;

                // 瞬间滚动到新消息顶部
                userMessageElement.scrollIntoView({ behavior: 'auto', block: 'start' });
            } else {
                // 内容未溢出，不需要额外空间
                this.messagesContainer.classList.remove('has-overflow');
            }
        }, 50);

        // 7. 发送聊天请求
        try {
            await this.sendChatRequest(message, session.accessToken, aiMessageElement, loadingSpinner);
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
}
