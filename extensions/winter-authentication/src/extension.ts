/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Winter Team. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { WinterAuthenticationProvider } from './winterAuthProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Winter Authentication extension is now active!');

    const provider = new WinterAuthenticationProvider(context);
    context.subscriptions.push(provider);

    // Initialize context key
    vscode.commands.executeCommand('setContext', 'winterAccountState', 'signedOut');

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'winter.showUserProfile';
    context.subscriptions.push(statusBarItem);

    const updateStatusBar = async () => {
        const session = await vscode.authentication.getSession('winter', ['user:email'], { createIfNone: false });
        if (session) {
            vscode.commands.executeCommand('setContext', 'winterAccountState', 'signedIn');
            statusBarItem.text = `$(account) ${session.account.label}`;
            statusBarItem.tooltip = 'Winter Account: Click to show profile';
            statusBarItem.command = 'winter.showUserProfile';
            statusBarItem.show();
        } else {
            vscode.commands.executeCommand('setContext', 'winterAccountState', 'signedOut');
            statusBarItem.text = '$(account) Winter: Sign In';
            statusBarItem.tooltip = 'Click to sign in to Winter Account';
            statusBarItem.command = 'winter.signIn';
            statusBarItem.show();
        }
    };

    // Check initial status
    updateStatusBar();

    // Listen for changes
    context.subscriptions.push(vscode.authentication.onDidChangeSessions(e => {
        if (e.provider.id === 'winter') {
            updateStatusBar();
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('winter.signIn', async () => {
        try {
            await vscode.authentication.getSession('winter', ['user:email'], { createIfNone: true });
        } catch (e) {
            vscode.window.showErrorMessage(`Sign in failed: ${e}`);
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('winter.signOut', async () => {
        vscode.window.showInformationMessage('Please use the Accounts menu to sign out.');
    }));

    // Show user profile command
    context.subscriptions.push(vscode.commands.registerCommand('winter.showUserProfile', async () => {
        const session = await vscode.authentication.getSession('winter', ['user:email'], { createIfNone: false });
        if (!session) return;

        try {
            // Get detailed user info using the provider instance
            const userInfo = await provider.getUserInfo(session.accessToken);

            const items: vscode.QuickPickItem[] = [
                {
                    label: userInfo.name,
                    description: 'Nickname',
                    iconPath: vscode.Uri.parse(userInfo.avatar) // Show avatar
                },
                {
                    label: userInfo.email,
                    description: 'Email',
                    iconPath: new vscode.ThemeIcon('mail')
                },
                {
                    label: 'Sign Out',
                    description: 'Log out from Winter Account',
                    iconPath: new vscode.ThemeIcon('sign-out')
                }
            ];

            const selection = await vscode.window.showQuickPick(items, {
                placeHolder: 'Winter Account Profile',
                matchOnDescription: true
            });

            if (selection && selection.label === 'Sign Out') {
                vscode.window.showInformationMessage('Please use the Accounts menu to sign out.');
            }

        } catch (e) {
            vscode.window.showErrorMessage(`Failed to load user profile: ${e}`);
        }
    }));

    // Check credits command (called from Winter AI view)
    context.subscriptions.push(vscode.commands.registerCommand('winter.checkCredits', async (accessToken: string) => {
        return new Promise((resolve, reject) => {
            const http = require('http');
            const options = {
                hostname: '127.0.0.1',
                port: 8081,
                path: '/api/chat/credits/balance',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            };

            const req = http.request(options, (res: any) => {
                let data = '';
                res.on('data', (chunk: any) => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        resolve(result);
                    } catch (e) {
                        reject(new Error('Failed to parse response'));
                    }
                });
            });

            req.on('error', (e: Error) => {
                reject(e);
            });

            req.end();
        });
    }));

    // Send chat request command (called from Winter AI view)
    context.subscriptions.push(vscode.commands.registerCommand('winter.sendChatRequest',
        async (accessToken: string, message: string) => {
            return new Promise((resolve, reject) => {
                const http = require('http');
                const postData = JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'user', content: message }
                    ],
                    stream: true // 使用流式
                });

                const options = {
                    hostname: '127.0.0.1',
                    port: 8081,
                    path: '/api/chat/completions',
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };

                const req = http.request(options, (res: any) => {
                    let fullContent = '';
                    let buffer = '';

                    res.on('data', (chunk: any) => {
                        buffer += chunk.toString();
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            const trimmedLine = line.trim();
                            if (trimmedLine.startsWith('data:')) {
                                const jsonStr = trimmedLine.substring(5).trim();
                                if (jsonStr && jsonStr !== '[DONE]') {
                                    try {
                                        const data = JSON.parse(jsonStr);
                                        if (data.content) {
                                            fullContent += data.content;
                                        }
                                    } catch (e) {
                                        // 忽略解析错误
                                    }
                                }
                            }
                        }
                    });

                    res.on('end', () => {
                        resolve(fullContent);
                    });
                });

                req.on('error', (e: Error) => {
                    reject(e);
                });

                req.write(postData);
                req.end();
            });
        }
    ));
}

export function deactivate() { }
