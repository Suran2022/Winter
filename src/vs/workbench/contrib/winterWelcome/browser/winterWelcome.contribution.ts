/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions, IWorkbenchContribution } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { LifecyclePhase } from '../../../services/lifecycle/common/lifecycle.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { WinterWelcomePage } from './winterWelcomePage.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';


class WinterWelcomeContribution extends Disposable implements IWorkbenchContribution {

    constructor(
        @IInstantiationService private readonly instantiationService: IInstantiationService,
        @IStorageService private readonly storageService: IStorageService,
        @IWorkbenchLayoutService private readonly layoutService: IWorkbenchLayoutService
    ) {
        super();
        console.log('[WinterWelcome] Contribution initialized');

        // 检查是否应该显示欢迎页
        if (WinterWelcomePage.shouldShow(this.storageService)) {
            console.log('[WinterWelcome] shouldShow returned true, calling showWinterWelcome');
            this.showWinterWelcome();
        } else {
            console.log('[WinterWelcome] shouldShow returned false');
        }
    }

    private async showWinterWelcome(): Promise<void> {
        console.log('[WinterWelcome] Waiting for layout restored...');
        // 等待布局准备就绪
        await this.layoutService.whenRestored;
        console.log('[WinterWelcome] Layout restored, creating UI...');

        // 创建一个容器来显示欢迎页
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.zIndex = '10000'; // 增加 z-index
        container.style.backgroundColor = '#18181b';

        document.body.appendChild(container);
        console.log('[WinterWelcome] Container appended to body');

        // 创建欢迎页实例
        this.instantiationService.createInstance(WinterWelcomePage, container);
    }
}

// 注册贡献点
const workbenchRegistry = Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(WinterWelcomeContribution, LifecyclePhase.Restored);
