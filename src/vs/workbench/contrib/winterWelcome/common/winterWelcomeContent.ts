/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../nls.js';

// Winter Welcome Color Palette (Based on Prototype)
export const WINTER_COLORS = {
    background: '#18181b', // zinc-900
    surface: '#27272a',    // zinc-800
    olive: '#556B2F',      // Primary Olive
    oliveHover: '#4A5C2F',
    cream: '#F5F5DC',      // Text Cream
    zinc400: '#a1a1aa',    // Subtext
    zinc500: '#71717a',
    zinc600: '#52525b',
    zinc700: '#3f3f46',    // Borders
    white: '#FFFFFF',
    black: '#000000',
    brown: '#3E2723',      // Deep Brown
    brownText: '#EFEBE9'   // Brown theme text
};

// Language Options
export interface LanguageOption {
    id: string;
    name: string;
    nativeName: string;
    subName?: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
    { id: 'en', name: 'English', nativeName: 'English', subName: 'English' },
    { id: 'zh-cn', name: 'Simplified Chinese', nativeName: '简体中文', subName: 'Simplified Chinese' },
    { id: 'zh-tw', name: 'Traditional Chinese', nativeName: '繁體中文', subName: 'Traditional Chinese' },
    { id: 'ja', name: 'Japanese', nativeName: '日本語', subName: 'Japanese' }
];

// Theme Options
export interface ThemeOption {
    id: string;
    name: string;
    primaryColor: string;
    secondaryColor: string;
    borderColor: string;
    textColor: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
    {
        id: 'olive',
        name: 'Olive & Cream',
        primaryColor: WINTER_COLORS.olive,
        secondaryColor: WINTER_COLORS.cream,
        borderColor: WINTER_COLORS.cream,
        textColor: WINTER_COLORS.cream
    },
    {
        id: 'brown',
        name: 'Mocha & Beige',
        primaryColor: WINTER_COLORS.brown,
        secondaryColor: '#EFEBE9',
        borderColor: '#EFEBE9',
        textColor: '#EFEBE9'
    },
    {
        id: 'monochrome',
        name: 'Classic Mono',
        primaryColor: WINTER_COLORS.black,
        secondaryColor: WINTER_COLORS.white,
        borderColor: WINTER_COLORS.white,
        textColor: WINTER_COLORS.white
    }
];

// Keymap Options
export interface KeymapOption {
    id: string;
    name: string;
}

export const KEYMAP_OPTIONS: KeymapOption[] = [
    { id: 'vscode', name: 'VsCode' },
    { id: 'github', name: 'Github' },
    { id: 'idea', name: 'IntelliJ IDEA' }
];

// Detectable Editors
export interface DetectableEditor {
    id: string;
    name: string;
    macPath?: string;
    winPath?: string;
    linuxPath?: string;
    macSettingsPath?: string;
    winSettingsPath?: string;
    linuxSettingsPath?: string;
}

export const DETECTABLE_EDITORS: DetectableEditor[] = [
    {
        id: 'cursor',
        name: 'Cursor',
        macPath: '/Applications/Cursor.app',
        winPath: '%LOCALAPPDATA%\\Programs\\Cursor',
        linuxPath: '~/.local/share/cursor',
        macSettingsPath: '~/Library/Application Support/Cursor/User/settings.json',
        winSettingsPath: '%APPDATA%\\Cursor\\User\\settings.json',
        linuxSettingsPath: '~/.config/Cursor/User/settings.json'
    },
    {
        id: 'windsurf',
        name: 'Windsurf',
        macPath: '/Applications/Windsurf.app',
        winPath: '%LOCALAPPDATA%\\Programs\\Windsurf',
        linuxPath: '~/.local/share/windsurf',
        macSettingsPath: '~/Library/Application Support/Windsurf/User/settings.json',
        winSettingsPath: '%APPDATA%\\Windsurf\\User\\settings.json',
        linuxSettingsPath: '~/.config/Windsurf/User/settings.json'
    }
];

// Localization Strings
export const WinterWelcomeStrings = {
    welcome: {
        title: 'Winter',
        subtitle: 'Code strictly. Code beautifully.',
        getStarted: 'Get Started'
    },
    language: {
        title: localize('winter.language.title', 'Select Language'),
        titleZhCn: '选择语言',
        titleZhTw: '選擇語言',
        titleJa: '言語を選択',
        label: 'Language',
        labelZhCn: '语言',
        labelZhTw: '語言',
        labelJa: '言語',
        next: localize('winter.next', 'Next'),
        nextZhCn: '下一步',
        nextZhTw: '下一步',
        nextJa: '次へ'
    },
    theme: {
        title: localize('winter.theme.title', 'Customize Appearance'),
        titleZhCn: '自定义外观',
        titleZhTw: '自訂外觀',
        titleJa: '外観をカスタマイズ',
        sectionTheme: localize('winter.theme.sectionTheme', 'Color Theme'),
        sectionThemeZhCn: '颜色主题',
        sectionThemeZhTw: '顏色主題',
        sectionThemeJa: 'カラーテーマ',
        sectionKeymap: localize('winter.theme.sectionKeymap', 'Keymap Binding'),
        sectionKeymapZhCn: '按键映射',
        sectionKeymapZhTw: '按鍵映射',
        sectionKeymapJa: 'キーマップ',
        presetProfile: 'Preset Profile',
        presetProfileZhCn: '预设配置',
        presetProfileZhTw: '預設設定檔',
        presetProfileJa: 'プリセットプロファイル',
        next: localize('winter.next', 'Next'),
        nextZhCn: '下一步',
        nextZhTw: '下一步',
        nextJa: '次へ'
    },
    import: {
        title: localize('winter.import.title', 'Import Settings'),
        titleZhCn: '导入设置',
        titleZhTw: '匯入設定',
        titleJa: '設定をインポート',
        importFrom: localize('winter.import.importFrom', 'Import from {0}'),
        importFromZhCn: '从 {0} 导入配置',
        importFromZhTw: '從 {0} 匯入設定',
        importFromJa: '{0} からインポート',
        skip: localize('winter.import.skip', 'Skip for Now'),
        skipZhCn: '暂时跳过',
        skipZhTw: '暫時跳過',
        skipJa: 'スキップ'
    },
    complete: {
        title: localize('winter.complete.title', 'All Set!'),
        titleZhCn: '一切就绪!',
        titleZhTw: '一切就緒!',
        titleJa: '準備完了!',
        message: localize('winter.complete.message', 'Your Winter development environment is ready to use.'),
        messageZhCn: '您的 Winter 开发环境已准备就绪。',
        messageZhTw: '您的 Winter 開發環境已準備就緒。',
        messageJa: 'Winter 開発環境の準備が整いました。',
        start: localize('winter.complete.start', 'Start Coding'),
        startZhCn: '开始编码',
        startZhTw: '開始編碼',
        startJa: 'コーディングを開始'
    }
};

export function getLocalizedString(key: string, lang: string): string {
    const parts = key.split('.');
    let obj: any = WinterWelcomeStrings;

    // Navigate to the correct section
    for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]];
        if (!obj) return key;
    }

    const lastPart = parts[parts.length - 1];

    // Try to get the localized version first
    if (lang === 'zh-cn') {
        const localizedKey = lastPart + 'ZhCn';
        if (obj[localizedKey]) return obj[localizedKey];
    } else if (lang === 'zh-tw') {
        const localizedKey = lastPart + 'ZhTw';
        if (obj[localizedKey]) return obj[localizedKey];
    } else if (lang === 'ja') {
        const localizedKey = lastPart + 'Ja';
        if (obj[localizedKey]) return obj[localizedKey];
    }

    // Fall back to the base key (English)
    return obj[lastPart] || key;
}
