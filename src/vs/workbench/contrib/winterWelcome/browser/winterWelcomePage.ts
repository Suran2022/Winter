/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { $, append, addDisposableListener, EventType } from '../../../../base/browser/dom.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { WINTER_COLORS, SUPPORTED_LANGUAGES, THEME_OPTIONS, KEYMAP_OPTIONS, DETECTABLE_EDITORS, getLocalizedString } from '../common/winterWelcomeContent.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { URI } from '../../../../base/common/uri.js';
import { isWindows, isMacintosh } from '../../../../base/common/platform.js';
import { IWorkbenchThemeService } from '../../../services/themes/common/workbenchThemeService.js';
import { IConfigurationService, ConfigurationTarget } from '../../../../platform/configuration/common/configuration.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { ILocaleService } from '../../../services/localization/common/locale.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { Language } from '../../../../base/common/platform.js';


const STORAGE_KEY_WINTER_WELCOME_SHOWN = 'winter.welcome.shown';
const STORAGE_KEY_WINTER_LANGUAGE = 'winter.language';
const STORAGE_KEY_WINTER_THEME = 'winter.theme';
const STORAGE_KEY_WINTER_KEYMAP = 'winter.keymap';

export class WinterWelcomePage extends Disposable {

    private currentStep: number = 1;
    private selectedLanguage: string = 'en';
    private selectedTheme: string = 'olive';
    private selectedKeymap: string = 'vscode';
    private selectedImportId: string = '';

    private detectedEditors: string[] = [];
    private activeContainer: HTMLElement | undefined;
    private lastStep: number = 0;
    private languageChanged: boolean = false;

    constructor(
        private readonly container: HTMLElement,
        @IStorageService private readonly storageService: IStorageService,
        @IFileService private readonly fileService: IFileService,
        @IWorkbenchThemeService private readonly themeService: IWorkbenchThemeService,
        @IConfigurationService private readonly configurationService: IConfigurationService,
        @IPathService private readonly pathService: IPathService,
        @ILocaleService private readonly localeService: ILocaleService,
        @IHostService private readonly hostService: IHostService
    ) {
        super();
        this.loadSavedSettings();
        this.render();
    }

    private loadSavedSettings(): void {
        this.selectedLanguage = this.storageService.get(STORAGE_KEY_WINTER_LANGUAGE, StorageScope.PROFILE, 'en');
        this.selectedTheme = this.storageService.get(STORAGE_KEY_WINTER_THEME, StorageScope.PROFILE, 'olive');
        this.selectedKeymap = this.storageService.get(STORAGE_KEY_WINTER_KEYMAP, StorageScope.PROFILE, 'vscode');
    }

    private saveSettings(): void {
        this.storageService.store(STORAGE_KEY_WINTER_LANGUAGE, this.selectedLanguage, StorageScope.PROFILE, StorageTarget.USER);
        this.storageService.store(STORAGE_KEY_WINTER_THEME, this.selectedTheme, StorageScope.PROFILE, StorageTarget.USER);
        this.storageService.store(STORAGE_KEY_WINTER_KEYMAP, this.selectedKeymap, StorageScope.PROFILE, StorageTarget.USER);
    }

    private async resolvePath(path: string): Promise<URI> {
        if (path.startsWith('~/')) {
            const userHome = await this.pathService.userHome();
            return URI.joinPath(userHome, path.substring(2));
        }
        return URI.file(path);
    }

    private async detectEditors(): Promise<void> {
        this.detectedEditors = [];

        for (const editor of DETECTABLE_EDITORS) {
            let pathToCheck: string | undefined;

            if (isMacintosh && editor.macPath) {
                pathToCheck = editor.macPath;
            } else if (isWindows && editor.winPath) {
                pathToCheck = editor.winPath;
            } else if (editor.linuxPath) {
                pathToCheck = editor.linuxPath;
            }

            if (pathToCheck) {
                try {
                    const uri = await this.resolvePath(pathToCheck);
                    const exists = await this.fileService.exists(uri);
                    if (exists) {
                        this.detectedEditors.push(editor.id);
                    }
                } catch (error) {
                    // Ignore
                }
            }
        }

        if (this.detectedEditors.length > 0) {
            this.selectedImportId = this.detectedEditors[0];
        } else {
            this.selectedImportId = 'none';
        }
    }

    private async importSettings(editorId: string): Promise<void> {
        const editor = DETECTABLE_EDITORS.find(e => e.id === editorId);
        if (!editor) return;

        let settingsPath: string | undefined;
        if (isMacintosh) settingsPath = editor.macSettingsPath;
        else if (isWindows) settingsPath = editor.winSettingsPath;
        else settingsPath = editor.linuxSettingsPath;

        if (!settingsPath) return;

        try {
            const uri = await this.resolvePath(settingsPath);
            const content = await this.fileService.readFile(uri);
            const settings = JSON.parse(content.value.toString());

            for (const key in settings) {
                await this.configurationService.updateValue(key, settings[key], ConfigurationTarget.USER);
            }
        } catch (error) {
            console.error(`Failed to import settings from ${editor.name}:`, error);
        }
    }

    private createIcon(name: string, cls: string = ''): HTMLElement {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '24');
        svg.setAttribute('height', '24');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        if (cls) svg.setAttribute('class', cls);

        const createChild = (tag: string, attrs: { [key: string]: string }) => {
            const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
            for (const key in attrs) {
                el.setAttribute(key, attrs[key]);
            }
            return el;
        };

        switch (name) {
            case 'snowflake':
                svg.appendChild(createChild('line', { x1: '2', y1: '12', x2: '22', y2: '12' }));
                svg.appendChild(createChild('line', { x1: '12', y1: '2', x2: '12', y2: '22' }));
                svg.appendChild(createChild('path', { d: 'M20 16l-4-4 4-4' }));
                svg.appendChild(createChild('path', { d: 'M4 8l4 4-4 4' }));
                svg.appendChild(createChild('path', { d: 'M16 4l-4 4-4-4' }));
                svg.appendChild(createChild('path', { d: 'M8 20l4-4 4 4' }));
                break;
            case 'globe':
                svg.appendChild(createChild('circle', { cx: '12', cy: '12', r: '10' }));
                svg.appendChild(createChild('line', { x1: '2', y1: '12', x2: '22', y2: '12' }));
                svg.appendChild(createChild('path', { d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' }));
                break;
            case 'palette':
                svg.appendChild(createChild('circle', { cx: '13.5', cy: '6.5', r: '.5' }));
                svg.appendChild(createChild('circle', { cx: '17.5', cy: '10.5', r: '.5' }));
                svg.appendChild(createChild('circle', { cx: '8.5', cy: '7.5', r: '.5' }));
                svg.appendChild(createChild('circle', { cx: '6.5', cy: '12.5', r: '.5' }));
                svg.appendChild(createChild('path', { d: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z' }));
                break;
            case 'keyboard':
                svg.appendChild(createChild('rect', { x: '2', y: '4', width: '20', height: '16', rx: '2', ry: '2' }));
                svg.appendChild(createChild('line', { x1: '6', y1: '8', x2: '6', y2: '8' }));
                svg.appendChild(createChild('line', { x1: '10', y1: '8', x2: '10', y2: '8' }));
                svg.appendChild(createChild('line', { x1: '14', y1: '8', x2: '14', y2: '8' }));
                svg.appendChild(createChild('line', { x1: '18', y1: '8', x2: '18', y2: '8' }));
                svg.appendChild(createChild('line', { x1: '6', y1: '12', x2: '6', y2: '12' }));
                svg.appendChild(createChild('line', { x1: '10', y1: '12', x2: '10', y2: '12' }));
                svg.appendChild(createChild('line', { x1: '14', y1: '12', x2: '14', y2: '12' }));
                svg.appendChild(createChild('line', { x1: '18', y1: '12', x2: '18', y2: '12' }));
                svg.appendChild(createChild('line', { x1: '6', y1: '16', x2: '6', y2: '16' }));
                svg.appendChild(createChild('line', { x1: '10', y1: '16', x2: '14', y2: '16' }));
                svg.appendChild(createChild('line', { x1: '18', y1: '16', x2: '18', y2: '16' }));
                break;
            case 'chevron-down':
                svg.appendChild(createChild('polyline', { points: '6 9 12 15 18 9' }));
                break;
            case 'check':
                svg.appendChild(createChild('polyline', { points: '20 6 9 17 4 12' }));
                break;
            case 'code':
                svg.appendChild(createChild('polyline', { points: '16 18 22 12 16 6' }));
                svg.appendChild(createChild('polyline', { points: '8 6 2 12 8 18' }));
                break;
        }

        const span = $('span');
        span.style.display = 'flex';
        span.appendChild(svg);
        return span;
    }

    private render(): void {
        // Ensure global styles are added (only once)
        if (!this.container.querySelector('#winter-styles')) {
            this.addStyles();
        }

        const isStepChange = this.currentStep !== this.lastStep;
        this.lastStep = this.currentStep;

        // Create new container for this step
        const stepContainer = $('.winter-step-container');
        stepContainer.style.position = 'absolute';
        stepContainer.style.top = '0';
        stepContainer.style.left = '0';
        stepContainer.style.width = '100%';
        stepContainer.style.height = '100%';
        stepContainer.style.display = 'flex';
        stepContainer.style.flexDirection = 'column';
        stepContainer.style.overflow = 'hidden';

        // Apply background
        this.applyBackground(stepContainer);

        // Render content
        this.renderStepContent(stepContainer);

        if (this.activeContainer && isStepChange) {
            // Transition
            stepContainer.style.zIndex = '10';
            stepContainer.style.clipPath = 'circle(0% at 50% 50%)';
            stepContainer.style.transition = 'clip-path 0.8s cubic-bezier(0.25, 1, 0.5, 1)';

            append(this.container, stepContainer);

            // Force reflow
            stepContainer.offsetHeight;

            stepContainer.style.clipPath = 'circle(150% at 50% 50%)';

            const oldContainer = this.activeContainer;
            setTimeout(() => {
                oldContainer.remove();
                stepContainer.style.clipPath = 'none';
                stepContainer.style.zIndex = '1';
            }, 800);

            this.activeContainer = stepContainer;
        } else {
            // Initial or same step update
            if (this.activeContainer) {
                this.activeContainer.remove();
            }
            stepContainer.style.zIndex = '1';
            append(this.container, stepContainer);
            this.activeContainer = stepContainer;
        }
    }

    private applyBackground(element: HTMLElement): void {
        element.className = 'winter-step-container'; // Reset
        if (this.currentStep >= 3) {
            if (this.selectedTheme === 'brown') {
                element.classList.add('bg-brown');
            } else if (this.selectedTheme === 'monochrome') {
                element.classList.add('bg-black');
            } else {
                element.classList.add('bg-zinc-900');
            }
        } else {
            element.classList.add('bg-zinc-900');
        }
    }

    private renderStepContent(container: HTMLElement): void {
        // Progress Bar
        const progressBarContainer = $('.winter-progress-bar-container');
        const progressBar = $('.winter-progress-bar');
        progressBar.style.width = `${(this.currentStep / 5) * 100}%`;
        append(progressBarContainer, progressBar);
        append(container, progressBarContainer);

        const mainContainer = $('.winter-main-container');
        const contentArea = $('.winter-content-area');

        switch (this.currentStep) {
            case 1: this.renderWelcomeStep(contentArea); break;
            case 2: this.renderLanguageStep(contentArea); break;
            case 3: this.renderThemeStep(contentArea); break;
            case 4: this.renderImportStep(contentArea); break;
            case 5: this.renderCompleteStep(contentArea); break;
        }

        append(mainContainer, contentArea);

        const footer = $('.winter-footer');
        footer.textContent = `STEP ${this.currentStep} / 5`;
        append(mainContainer, footer);

        append(container, mainContainer);
    }



    private addStyles(): void {
        const style = $('style');
        style.id = 'winter-styles';
        style.textContent = `
            .winter-welcome-page {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                color: ${WINTER_COLORS.cream};
                overflow: hidden;
            }
            
            .winter-step-container {
                transition: background-color 0.7s ease-in-out;
            }

            .bg-zinc-900 { background-color: ${WINTER_COLORS.background}; }
            .bg-brown { background-color: ${WINTER_COLORS.brown}; }
            .bg-black { background-color: ${WINTER_COLORS.black}; }

            .winter-progress-bar-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 4px;
                background-color: rgba(255, 255, 255, 0.05);
                z-index: 50;
            }

            .winter-progress-bar {
                height: 100%;
                background-color: ${WINTER_COLORS.olive};
                transition: width 0.5s ease;
            }

            .winter-main-container {
                position: relative;
                width: 100%;
                height: 100%;
                max-width: 1024px;
                margin: 0 auto;
                padding: 32px 16px;
                display: flex;
                flex-direction: column;
            }

            .winter-content-area {
                flex-grow: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                width: 100%;
                animation: fadeIn 0.5s ease-out;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); filter: blur(4px); }
                to { opacity: 1; transform: translateY(0); filter: blur(0); }
            }

            .winter-footer {
                position: absolute;
                bottom: 32px;
                left: 0;
                width: 100%;
                text-align: center;
                color: ${WINTER_COLORS.zinc600};
                font-size: 14px;
                font-family: monospace;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                pointer-events: none;
            }

            /* Typography */
            h1 { font-size: 48px; font-weight: 700; margin: 0; letter-spacing: -0.02em; color: ${WINTER_COLORS.cream}; }
            h2 { font-size: 30px; font-weight: 600; margin: 0 0 40px 0; color: ${WINTER_COLORS.cream}; text-align: center; }
            h3 { font-size: 20px; font-weight: 500; margin: 0; color: #d4d4d8; }
            p { color: ${WINTER_COLORS.zinc400}; margin: 16px 0 0 0; font-size: 16px; }

            /* Components */
            .winter-logo-box {
                width: 96px;
                height: 96px;
                background-color: ${WINTER_COLORS.surface};
                border-radius: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                margin-bottom: 24px;
                border: 1px solid ${WINTER_COLORS.zinc700};
                color: ${WINTER_COLORS.cream};
            }

            .winter-btn {
                background-color: ${WINTER_COLORS.olive};
                color: ${WINTER_COLORS.cream};
                border: none;
                border-radius: 9999px;
                padding: 12px 32px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                margin-top: 48px;
            }
            .winter-btn:hover { background-color: ${WINTER_COLORS.oliveHover}; transform: translateY(-1px); }
            .winter-btn-secondary {
                background-color: transparent;
                color: ${WINTER_COLORS.cream};
                border: 1px solid ${WINTER_COLORS.cream};
            }
            .winter-btn-secondary:hover { background-color: rgba(245, 245, 220, 0.1); }

            /* Custom Select */
            .winter-select-container {
                position: relative;
                width: 100%;
                max-width: 400px;
            }
            .winter-select-trigger {
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px;
                background-color: rgba(39, 39, 42, 0.5);
                border: 1px solid ${WINTER_COLORS.zinc700};
                border-radius: 12px;
                color: ${WINTER_COLORS.cream};
                cursor: pointer;
                transition: all 0.2s;
                font-size: 16px;
                box-sizing: border-box;
            }
            .winter-select-trigger:hover { border-color: ${WINTER_COLORS.zinc500}; }
            .winter-select-trigger.open { border-color: ${WINTER_COLORS.olive}; ring: 1px solid rgba(85, 107, 47, 0.5); }
            
            .winter-select-dropdown {
                position: absolute;
                top: calc(100% + 4px);
                left: 0;
                width: 100%;
                background-color: ${WINTER_COLORS.background};
                border: 1px solid ${WINTER_COLORS.zinc700};
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                z-index: 100;
                overflow: hidden;
                display: none;
                max-height: 240px;
                overflow-y: auto;
            }
            .winter-select-dropdown.open { display: block; animation: slideDown 0.15s ease-out; }
            
            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px) scale(0.98); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            
            /* Exit Transition */
            .winter-exit-blur {
                background-color: rgba(0, 0, 0, 0.4) !important;
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            }
            
            .winter-loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid rgba(255, 255, 255, 0.1);
                border-left-color: ${WINTER_COLORS.olive};
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .winter-select-option {
                padding: 12px 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: pointer;
                transition: background-color 0.15s;
                border-bottom: 1px solid rgba(63, 63, 70, 0.5);
            }
            .winter-select-option:last-child { border-bottom: none; }
            .winter-select-option:hover { background-color: ${WINTER_COLORS.surface}; }
            .winter-select-option.selected .winter-option-label { color: ${WINTER_COLORS.olive}; }

            .winter-option-content { display: flex; align-items: flex-start; gap: 12px; }
            .winter-option-label { font-weight: 500; color: ${WINTER_COLORS.cream}; }
            .winter-option-sub { font-size: 12px; color: ${WINTER_COLORS.zinc500}; display: block; }
            
            /* Theme Grid */
            .winter-theme-grid {
                display: grid;
                gap: 16px;
                width: 100%;
            }
            .winter-theme-card {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 16px;
                border-radius: 12px;
                border: 2px solid ${WINTER_COLORS.zinc700};
                background-color: rgba(39, 39, 42, 0.3);
                cursor: pointer;
                transition: all 0.2s;
            }
            .winter-theme-card:hover { border-color: ${WINTER_COLORS.zinc600}; }
            .winter-theme-card.selected { border-color: ${WINTER_COLORS.olive}; background-color: rgba(85, 107, 47, 0.1); }
            
            /* Confetti */
            .winter-confetti-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                overflow: hidden;
                z-index: 0;
            }
            .winter-confetti {
                position: absolute;
                top: -20px;
                width: 10px;
                height: 20px;
                opacity: 0.8;
                animation: fall linear 1 forwards;
            }
            @keyframes fall {
                0% { transform: translateY(-20px) rotate(0deg); }
                100% { transform: translateY(100vh) rotate(720deg); }
            }
            
            .winter-emoji-animate {
                display: inline-block;
                animation: popScale 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                font-size: 48px;
                line-height: 1;
            }
            @keyframes popScale {
                0% { transform: scale(0.5); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
            }

            .winter-theme-swatch {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                border: 2px solid rgba(255,255,255,0.1);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 12px;
            }

            /* Code Preview */
            .winter-code-preview {
                margin-top: 16px;
                padding: 24px;
                border-radius: 12px;
                background-color: #09090b; /* zinc-950 */
                border: 1px solid ${WINTER_COLORS.surface};
                font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
                font-size: 12px;
                color: ${WINTER_COLORS.zinc500};
                box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
                width: 100%;
                box-sizing: border-box;
            }
            .winter-window-controls { display: flex; gap: 8px; margin-bottom: 16px; }
            .winter-window-dot { width: 12px; height: 12px; border-radius: 50%; }
            .bg-red { background-color: rgba(239, 68, 68, 0.5); }
            .bg-yellow { background-color: rgba(234, 179, 8, 0.5); }
            .bg-green { background-color: rgba(34, 197, 94, 0.5); }

            .text-purple { color: #c084fc; }
            .text-blue { color: #60a5fa; }
            .text-green { color: #4ade80; }
            .text-yellow { color: #facc15; }
            .text-orange { color: #fdba74; }
            .text-zinc { color: #52525b; }

            /* Layout Helpers */
            .flex-col { display: flex; flex-direction: column; }
            .items-center { align-items: center; }
            .w-full { width: 100%; }
            .max-w-md { max-width: 448px; }
            .gap-2 { gap: 8px; }
            .mb-2 { margin-bottom: 8px; }
            .text-sm { font-size: 14px; }
            .text-zinc-400 { color: ${WINTER_COLORS.zinc400}; }
            .font-medium { font-weight: 500; }
            
            /* Step 3 Layout */
            .step3-layout {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 64px;
                width: 100%;
                max-width: 896px;
            }
            .section-header {
                display: flex;
                align-items: center;
                gap: 8px;
                border-bottom: 1px solid ${WINTER_COLORS.zinc700};
                padding-bottom: 8px;
                margin-bottom: 24px;
            }
        `;
        append(this.container, style);
    }

    private createCustomSelect(options: any[], selectedId: string, onChange: (id: string) => void): HTMLElement {
        const container = $('.winter-select-container');

        const trigger = $('.winter-select-trigger');
        const selectedOption = options.find(o => o.id === selectedId) || options[0];

        const content = $('.winter-option-content');

        // Icon for selected option if available (simplified logic)
        if (selectedOption.id === 'en' || selectedOption.id === 'zh-cn' || selectedOption.id === 'zh-tw' || selectedOption.id === 'ja') {
            const icon = this.createIcon('globe', 'text-zinc-400 w-4 h-4');
            icon.style.width = '16px';
            icon.style.height = '16px';
            icon.style.color = WINTER_COLORS.zinc400;
            icon.style.marginTop = '2px';
            append(content, icon);
        } else if (selectedOption.id === 'vscode' || selectedOption.id === 'github' || selectedOption.id === 'idea') {
            const icon = this.createIcon('code', 'text-zinc-400 w-4 h-4');
            icon.style.width = '16px';
            icon.style.height = '16px';
            icon.style.color = WINTER_COLORS.zinc400;
            icon.style.marginTop = '2px';
            append(content, icon);
        }

        const labelDiv = $('.flex-col');
        const label = $('.winter-option-label');
        label.textContent = selectedOption.label || selectedOption.name;
        append(labelDiv, label);

        if (selectedOption.sub || selectedOption.subName) {
            const sub = $('.winter-option-sub');
            sub.textContent = selectedOption.sub || selectedOption.subName;
            append(labelDiv, sub);
        }
        append(content, labelDiv);
        append(trigger, content);

        const arrow = this.createIcon('chevron-down');
        arrow.style.width = '20px';
        arrow.style.height = '20px';
        arrow.style.color = WINTER_COLORS.zinc400;
        append(trigger, arrow);

        append(container, trigger);

        const dropdown = $('.winter-select-dropdown');

        options.forEach(opt => {
            const optionEl = $('.winter-select-option');
            if (opt.id === selectedId) optionEl.classList.add('selected');

            const optContent = $('.winter-option-content');

            // Icon in dropdown
            if (opt.id === 'en' || opt.id === 'zh-cn' || opt.id === 'zh-tw' || opt.id === 'ja') {
                const icon = this.createIcon('globe', 'text-zinc-400 w-4 h-4');
                icon.style.width = '16px';
                icon.style.height = '16px';
                icon.style.color = WINTER_COLORS.zinc400;
                icon.style.marginTop = '2px';
                append(optContent, icon);
            } else if (opt.id === 'vscode' || opt.id === 'github' || opt.id === 'idea') {
                const icon = this.createIcon('code', 'text-zinc-400 w-4 h-4');
                icon.style.width = '16px';
                icon.style.height = '16px';
                icon.style.color = WINTER_COLORS.zinc400;
                icon.style.marginTop = '2px';
                append(optContent, icon);
            }

            const optLabelDiv = $('.flex-col');
            const optLabel = $('.winter-option-label');
            optLabel.textContent = opt.label || opt.name;
            append(optLabelDiv, optLabel);

            if (opt.sub || opt.subName) {
                const optSub = $('.winter-option-sub');
                optSub.textContent = opt.sub || opt.subName;
                append(optLabelDiv, optSub);
            }
            append(optContent, optLabelDiv);
            append(optionEl, optContent);

            if (opt.id === selectedId) {
                const check = this.createIcon('check');
                check.style.width = '16px';
                check.style.height = '16px';
                check.style.color = WINTER_COLORS.olive;
                append(optionEl, check);
            }

            this._register(addDisposableListener(optionEl, EventType.CLICK, (e) => {
                e.stopPropagation();
                onChange(opt.id);
                dropdown.classList.remove('open');
                trigger.classList.remove('open');
            }));

            append(dropdown, optionEl);
        });

        append(container, dropdown);

        this._register(addDisposableListener(trigger, EventType.CLICK, (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.contains('open');
            if (isOpen) {
                dropdown.classList.remove('open');
                trigger.classList.remove('open');
            } else {
                document.querySelectorAll('.winter-select-dropdown.open').forEach(el => el.classList.remove('open'));
                document.querySelectorAll('.winter-select-trigger.open').forEach(el => el.classList.remove('open'));

                dropdown.classList.add('open');
                trigger.classList.add('open');
            }
        }));

        this._register(addDisposableListener(document, EventType.CLICK, (e) => {
            if (!container.contains(e.target as Node)) {
                dropdown.classList.remove('open');
                trigger.classList.remove('open');
            }
        }));

        return container;
    }

    private renderWelcomeStep(parent: HTMLElement): void {
        const logoBox = $('.winter-logo-box');
        const snowflake = this.createIcon('snowflake');
        const svg = snowflake.querySelector('svg');
        if (svg) {
            svg.setAttribute('width', '56');
            svg.setAttribute('height', '56');
        }
        append(logoBox, snowflake);
        append(parent, logoBox);

        const title = $('h1');
        title.textContent = 'Winter';
        append(parent, title);

        const subtitle = $('p');
        subtitle.textContent = 'Code strictly. Code beautifully.';
        subtitle.style.maxWidth = '400px';
        subtitle.style.textAlign = 'center';
        append(parent, subtitle);

        const button = $('button', { class: 'winter-btn' });
        button.textContent = 'Get Started →';
        this._register(addDisposableListener(button, EventType.CLICK, () => {
            this.currentStep = 2;
            this.render();
        }));
        append(parent, button);
    }

    private renderLanguageStep(parent: HTMLElement): void {
        const container = $('.w-full.max-w-md.flex-col.items-center');
        container.style.maxWidth = '400px';

        const title = $('h2');
        title.textContent = getLocalizedString('language.title', this.selectedLanguage);
        append(container, title);

        const label = $('.text-sm.text-zinc-400.font-medium.mb-2');
        const labelText = getLocalizedString('language.label', this.selectedLanguage);
        console.log(`[WinterWelcome] renderLanguageStep: selectedLanguage=${this.selectedLanguage}, label=${labelText}`);
        label.textContent = labelText;
        label.style.alignSelf = 'flex-start';
        append(container, label);

        const select = this.createCustomSelect(SUPPORTED_LANGUAGES, this.selectedLanguage, async (id) => {
            console.log(`[WinterWelcome] Language selected: ${id}`);
            this.selectedLanguage = id;
            this.saveSettings(); // Save immediately so it persists
            await this.applyLanguage(id);
            console.log(`[WinterWelcome] Re-rendering with language: ${this.selectedLanguage}`);
            this.render();
        });
        append(container, select);

        const button = $('button', { class: 'winter-btn' });
        button.textContent = getLocalizedString('language.next', this.selectedLanguage) + ' →';
        this._register(addDisposableListener(button, EventType.CLICK, () => {
            this.saveSettings();
            this.currentStep = 3;
            this.render();
        }));

        const btnContainer = $('.flex.justify-center.w-full');
        btnContainer.style.display = 'flex';
        btnContainer.style.justifyContent = 'center';
        append(btnContainer, button);
        append(container, btnContainer);
        append(parent, container);
    }

    private async applyLanguage(languageId: string): Promise<void> {
        // Map our language IDs to language pack items
        const languagePackMap: { [key: string]: { id: string; label: string; } } = {
            'en': { id: 'en', label: 'English' },
            'zh-cn': { id: 'zh-cn', label: '简体中文' },
            'zh-tw': { id: 'zh-tw', label: '繁體中文' },
            'ja': { id: 'ja', label: '日本語' }
        };

        const langPack = languagePackMap[languageId];
        if (!langPack) {
            console.error('[WinterWelcome] Unknown language:', languageId);
            return;
        }

        try {
            // Check if language is actually changing
            const currentLanguage = Language.value();
            if (langPack.id !== currentLanguage) {
                this.languageChanged = true;

                // Use ILocaleService to set the locale properly
                // skipDialog=true means we won't restart immediately
                await this.localeService.setLocale({
                    id: langPack.id,
                    label: langPack.label,
                    extensionId: undefined,
                    galleryExtension: undefined
                }, true);

                console.log(`[WinterWelcome] Language preference saved: ${languageId}, will restart after welcome completes`);
            }
        } catch (error) {
            console.error('[WinterWelcome] Failed to set language:', error);
        }
    }

    private async applyTheme(themeId: string): Promise<void> {
        // Map custom theme IDs to actual VSCode theme IDs
        const themeMap: { [key: string]: string } = {
            'olive': 'Default Dark Modern',
            'brown': 'Monokai',
            'monochrome': 'Default Dark Modern'
        };

        const vscodeTheme = themeMap[themeId] || 'Default Dark Modern';

        try {
            // Apply theme immediately to the workbench
            await this.themeService.setColorTheme(vscodeTheme, undefined);

            // Persist theme to user settings so it survives restart
            await this.configurationService.updateValue('workbench.colorTheme', vscodeTheme, ConfigurationTarget.USER);

            console.log(`[WinterWelcome] Theme applied: ${themeId} -> ${vscodeTheme}`);
        } catch (error) {
            console.error('[WinterWelcome] Failed to set theme:', error);
        }
    }

    private renderThemeStep(parent: HTMLElement): void {
        const title = $('h2');
        title.textContent = getLocalizedString('theme.title', this.selectedLanguage);
        append(parent, title);

        const layout = $('.step3-layout');

        // Left Column: Theme
        const leftCol = $('.flex-col');
        const themeHeader = $('.section-header');
        const themeIcon = this.createIcon('palette');
        themeIcon.style.color = WINTER_COLORS.zinc400;
        append(themeHeader, themeIcon);
        const themeTitle = $('h3');
        themeTitle.textContent = getLocalizedString('theme.sectionTheme', this.selectedLanguage);
        append(themeHeader, themeTitle);
        append(leftCol, themeHeader);

        const themeGrid = $('.winter-theme-grid');
        THEME_OPTIONS.forEach(theme => {
            const card = $('.winter-theme-card');
            if (this.selectedTheme === theme.id) card.classList.add('selected');

            const swatch = $('.winter-theme-swatch');
            swatch.style.backgroundColor = theme.primaryColor;
            swatch.style.borderColor = theme.borderColor;
            const ag = $('span');
            ag.textContent = 'Ag';
            ag.style.color = theme.textColor;
            append(swatch, ag);
            append(card, swatch);

            const name = $('span');
            name.textContent = theme.name;
            name.style.fontWeight = '500';
            name.style.color = WINTER_COLORS.cream;
            append(card, name);

            this._register(addDisposableListener(card, EventType.CLICK, async () => {
                this.selectedTheme = theme.id;
                this.saveSettings();
                await this.applyTheme(theme.id);
                this.render();
            }));

            append(themeGrid, card);
        });
        append(leftCol, themeGrid);
        append(layout, leftCol);

        // Right Column: Keymap & Preview
        const rightCol = $('.flex-col');
        const keymapHeader = $('.section-header');
        const keymapIcon = this.createIcon('keyboard');
        keymapIcon.style.color = WINTER_COLORS.zinc400;
        append(keymapHeader, keymapIcon);
        const keymapTitle = $('h3');
        keymapTitle.textContent = getLocalizedString('theme.sectionKeymap', this.selectedLanguage);
        append(keymapHeader, keymapTitle);
        append(rightCol, keymapHeader);

        const label = $('.text-sm.text-zinc-400.font-medium.mb-2');
        label.textContent = getLocalizedString('theme.presetProfile', this.selectedLanguage);
        append(rightCol, label);

        const keymapSelect = this.createCustomSelect(KEYMAP_OPTIONS.map(k => ({ id: k.id, label: k.name })), this.selectedKeymap, (id) => {
            this.selectedKeymap = id;
            this.render();
        });
        append(rightCol, keymapSelect);

        // Code Preview
        const preview = $('.winter-code-preview');
        const controls = $('.winter-window-controls');
        append(controls, $('.winter-window-dot.bg-red'));
        append(controls, $('.winter-window-dot.bg-yellow'));
        append(controls, $('.winter-window-dot.bg-green'));
        append(preview, controls);

        const code = $('div');

        const line1 = $('div');
        const spanConst = $('span'); spanConst.className = 'text-purple'; spanConst.textContent = 'const';
        const spanConfig = $('span'); spanConfig.className = 'text-blue'; spanConfig.textContent = ' config';
        const spanEq = $('span'); spanEq.textContent = ' = ';
        const spanAwait = $('span'); spanAwait.className = 'text-green'; spanAwait.textContent = 'await';
        const spanWinter = $('span'); spanWinter.className = 'text-yellow'; spanWinter.textContent = ' Winter';
        const spanSetup = $('span'); spanSetup.textContent = '.setup();';
        append(line1, spanConst); append(line1, spanConfig); append(line1, spanEq); append(line1, spanAwait); append(line1, spanWinter); append(line1, spanSetup);
        append(code, line1);

        append(code, document.createElement('br'));

        const line2 = $('div');
        line2.className = 'text-zinc';
        line2.textContent = '// User preferences';
        append(code, line2);

        const line3 = $('div');
        const spanConfig2 = $('span'); spanConfig2.textContent = 'config.';
        const spanApply = $('span'); spanApply.className = 'text-blue'; spanApply.textContent = 'apply';
        const spanBrace = $('span'); spanBrace.textContent = '({';
        append(line3, spanConfig2); append(line3, spanApply); append(line3, spanBrace);
        append(code, line3);

        const line4 = $('div');
        line4.style.paddingLeft = '16px';
        const spanTheme = $('span'); spanTheme.textContent = 'theme: ';
        const spanThemeVal = $('span'); spanThemeVal.className = 'text-orange'; spanThemeVal.textContent = `'${this.selectedTheme}'`;
        const spanComma = $('span'); spanComma.textContent = ',';
        append(line4, spanTheme); append(line4, spanThemeVal); append(line4, spanComma);
        append(code, line4);

        const line5 = $('div');
        line5.style.paddingLeft = '16px';
        const spanKeymap = $('span'); spanKeymap.textContent = 'keymap: ';
        const spanKeymapVal = $('span'); spanKeymapVal.className = 'text-orange'; spanKeymapVal.textContent = `'${this.selectedKeymap}'`;
        const spanComma2 = $('span'); spanComma2.textContent = ',';
        append(line5, spanKeymap); append(line5, spanKeymapVal); append(line5, spanComma2);
        append(code, line5);

        const line6 = $('div');
        line6.textContent = '});';
        append(code, line6);

        append(preview, code);
        append(rightCol, preview);

        append(layout, rightCol);
        append(parent, layout);

        const button = $('button', { class: 'winter-btn' });
        button.textContent = getLocalizedString('theme.next', this.selectedLanguage) + ' →';
        this._register(addDisposableListener(button, EventType.CLICK, async () => {
            this.saveSettings();
            await this.detectEditors();
            this.currentStep = 4;
            this.render();
        }));

        const btnContainer = $('.flex.justify-center.w-full');
        btnContainer.style.display = 'flex';
        btnContainer.style.justifyContent = 'center';
        append(btnContainer, button);
        append(parent, btnContainer);
    }

    private renderImportStep(parent: HTMLElement): void {
        const title = $('h2');
        title.textContent = getLocalizedString('import.title', this.selectedLanguage);
        append(parent, title);

        const container = $('.w-full.max-w-md.flex-col.items-center');
        container.style.maxWidth = '400px';

        // Label
        const label = $('.text-sm.text-zinc-400.font-medium.mb-2');
        label.textContent = 'Configuration Source'; // Hardcoded for now as it's not in content
        label.style.alignSelf = 'flex-start';
        append(container, label);

        // Dropdown
        let options: any[] = [];
        if (this.detectedEditors.length > 0) {
            options = this.detectedEditors.map(id => {
                const editor = DETECTABLE_EDITORS.find(e => e.id === id);
                return { id: editor!.id, label: editor!.name };
            });
        } else {
            options = [{ id: 'none', label: 'No configuration to import' }];
        }

        const select = this.createCustomSelect(options, this.selectedImportId, (id) => {
            this.selectedImportId = id;
            this.render();
        });
        append(container, select);

        // Buttons
        const btnGroup = $('.flex.gap-2');
        btnGroup.style.display = 'flex';
        btnGroup.style.gap = '16px';
        btnGroup.style.marginTop = '48px';
        btnGroup.style.justifyContent = 'center';
        btnGroup.style.width = '100%';

        if (this.detectedEditors.length > 0 && this.selectedImportId !== 'none') {
            const importBtn = $('button', { class: 'winter-btn' });
            const selectedEditor = DETECTABLE_EDITORS.find(e => e.id === this.selectedImportId);
            importBtn.textContent = getLocalizedString('import.importFrom', this.selectedLanguage).replace('{0}', selectedEditor?.name || '');
            importBtn.style.marginTop = '0';
            this._register(addDisposableListener(importBtn, EventType.CLICK, async () => {
                await this.importSettings(this.selectedImportId);
                this.currentStep = 5;
                this.render();
            }));
            append(btnGroup, importBtn);

            const skipBtn = $('button', { class: 'winter-btn winter-btn-secondary' });
            skipBtn.textContent = getLocalizedString('import.skip', this.selectedLanguage);
            skipBtn.style.marginTop = '0';
            this._register(addDisposableListener(skipBtn, EventType.CLICK, () => {
                this.currentStep = 5;
                this.render();
            }));
            append(btnGroup, skipBtn);
        } else {
            const skipBtn = $('button', { class: 'winter-btn' });
            skipBtn.textContent = getLocalizedString('import.skip', this.selectedLanguage) + ' →';
            skipBtn.style.marginTop = '0';
            this._register(addDisposableListener(skipBtn, EventType.CLICK, () => {
                this.currentStep = 5;
                this.render();
            }));
            append(btnGroup, skipBtn);
        }

        append(container, btnGroup);
        append(parent, container);
    }

    private renderCompleteStep(parent: HTMLElement): void {
        // Confetti
        const confettiContainer = $('.winter-confetti-container');
        const colors = ['#ff718d', '#fdfa66', '#85ffd3', '#a3a3ff', '#ffb86c'];
        for (let i = 0; i < 60; i++) {
            const confetti = $('.winter-confetti');
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.animationDuration = `${Math.random() * 3 + 2}s`;
            confetti.style.animationDelay = `${Math.random() * 4}s`;
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            // Randomize shape slightly
            append(confettiContainer, confetti);
        }
        append(parent, confettiContainer);

        // Emoji without box
        const emojiContainer = $('div');
        emojiContainer.style.fontSize = '80px';
        emojiContainer.style.marginBottom = '24px';
        emojiContainer.style.zIndex = '1';
        emojiContainer.style.lineHeight = '1';

        const emoji = $('span');
        emoji.textContent = '🎉';
        emoji.className = 'winter-emoji-animate';
        append(emojiContainer, emoji);
        append(parent, emojiContainer);

        const title = $('h1');
        title.textContent = getLocalizedString('complete.title', this.selectedLanguage);
        title.style.zIndex = '1';
        append(parent, title);

        const message = $('p');
        message.textContent = getLocalizedString('complete.message', this.selectedLanguage);
        message.style.maxWidth = '400px';
        message.style.textAlign = 'center';
        message.style.zIndex = '1';
        append(parent, message);

        const button = $('button', { class: 'winter-btn' });
        button.textContent = getLocalizedString('complete.start', this.selectedLanguage) + ' →';
        button.style.zIndex = '1';
        this._register(addDisposableListener(button, EventType.CLICK, () => {
            this.startExitSequence();
        }));
        append(parent, button);
    }

    private startExitSequence(): void {
        if (this.activeContainer) {
            this.activeContainer.remove();
            this.activeContainer = undefined;
        }

        this.container.classList.add('winter-exit-blur');

        const spinner = $('div', { class: 'winter-loading-spinner' });
        append(this.container, spinner);

        const hostService = this.hostService;
        const shouldRestart = this.languageChanged;

        setTimeout(async () => {
            console.log('[WinterWelcome] Storing shown flag and closing...');
            this.storageService.store(STORAGE_KEY_WINTER_WELCOME_SHOWN, true, StorageScope.PROFILE, StorageTarget.USER);
            this.close();

            // If language was changed, restart VSCode to apply it
            if (shouldRestart) {
                console.log('[WinterWelcome] Restarting VSCode to apply language change...');
                try {
                    await hostService.restart();
                } catch (error) {
                    console.error('[WinterWelcome] Restart failed:', error);
                }
            }
        }, 2500);
    }

    private close(): void {
        if (this.container && this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
        this.dispose();
    }

    public static shouldShow(storageService: IStorageService): boolean {
        return !storageService.getBoolean(STORAGE_KEY_WINTER_WELCOME_SHOWN, StorageScope.PROFILE, false);
    }
}
