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
import * as DOM from '../../../../base/browser/dom.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';

export class WinterAIViewPane extends ViewPane {

    private container!: HTMLElement;
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
    ) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
    }

    protected override renderBody(container: HTMLElement): void {
        super.renderBody(container);

        this.container = DOM.append(container, DOM.$('.winter-ai-container'));

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
    }

    private currentAgentMode: string = 'Agent';

    private createDropdown(parent: HTMLElement, text: string): void {
        const dropdown = DOM.append(parent, DOM.$('.winter-ai-dropdown'));
        dropdown.setAttribute('data-dropdown-type', text);
        const textSpan = DOM.append(dropdown, DOM.$('span', undefined, text));
        textSpan.classList.add('winter-ai-dropdown-text');
        const chevron = DOM.append(dropdown, DOM.$('span'));
        chevron.classList.add(...ThemeIcon.asClassNameArray(Codicon.chevronDown));

        // Add click handler for Agent dropdown
        if (text === 'Agent') {
            dropdown.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleAgentMenu(dropdown);
            });
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
}
