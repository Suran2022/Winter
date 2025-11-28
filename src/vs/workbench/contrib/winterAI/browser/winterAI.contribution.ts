/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ViewContainerExtensions, IViewContainersRegistry, ViewContainerLocation, IViewsRegistry } from '../../../common/views.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { WinterAIViewPane } from './winterAIView.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IWorkbenchContribution, IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { LifecyclePhase } from '../../../services/lifecycle/common/lifecycle.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';

const VIEW_CONTAINER_ID = 'workbench.view.winterAI';
const VIEW_ID = 'workbench.view.winterAI.chat';

// 1. Register View Container
const viewContainer = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({
    id: VIEW_CONTAINER_ID,
    title: { value: localize('winterAI', "Winter AI"), original: 'Winter AI' },
    icon: Codicon.hubot,
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
    storageId: VIEW_CONTAINER_ID,
    hideIfEmpty: false,
    order: 1
}, ViewContainerLocation.AuxiliaryBar);

// 2. Register View
Registry.as<IViewsRegistry>(ViewContainerExtensions.ViewsRegistry).registerViews([{
    id: VIEW_ID,
    name: { value: localize('winterAIChat', "Chat"), original: 'Chat' },
    ctorDescriptor: new SyncDescriptor(WinterAIViewPane),
    canToggleVisibility: true,
    canMoveView: true,
    order: 1
}], viewContainer);

// 3. Register Title Actions
// New Chat (+)
registerAction2(class NewChatAction extends Action2 {
    constructor() {
        super({
            id: 'winterAI.action.newChat',
            title: { value: localize('newChat', "New Chat"), original: 'New Chat' },
            icon: Codicon.add,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                order: 1,
                when: ContextKeyExpr.equals('view', VIEW_ID)
            }
        });
    }
    run() { console.log('New Chat'); }
});

// History (Clock)
registerAction2(class HistoryAction extends Action2 {
    constructor() {
        super({
            id: 'winterAI.action.history',
            title: { value: localize('history', "History"), original: 'History' },
            icon: Codicon.history,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                order: 2,
                when: ContextKeyExpr.equals('view', VIEW_ID)
            }
        });
    }
    run() { console.log('History'); }
});

// Settings (Gear)
registerAction2(class SettingsAction extends Action2 {
    constructor() {
        super({
            id: 'winterAI.action.settings',
            title: { value: localize('settings', "Settings"), original: 'Settings' },
            icon: Codicon.settingsGear,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                order: 3,
                when: ContextKeyExpr.equals('view', VIEW_ID)
            }
        });
    }
    run() { console.log('Settings'); }
});

// 4. Auto-open Winter AI on startup
class WinterAIStartupContribution implements IWorkbenchContribution {
    constructor(
        @IPaneCompositePartService private readonly paneCompositeService: IPaneCompositePartService
    ) {
        this.openWinterAI();
    }

    private async openWinterAI(): Promise<void> {
        // Open Winter AI in the auxiliary bar by default
        await this.paneCompositeService.openPaneComposite(VIEW_CONTAINER_ID, ViewContainerLocation.AuxiliaryBar, false);
    }
}

Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
    .registerWorkbenchContribution(WinterAIStartupContribution, LifecyclePhase.Restored);
