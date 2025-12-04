/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Winter Team. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as crypto from 'crypto';

interface SessionData {
    id: string;
    account: {
        label: string;
        id: string;
    };
    scopes: string[];
    accessToken: string;
    userInfo: {
        id: string;
        name: string;
        email: string;
        avatar: string;
    };
}

export class WinterAuthenticationProvider implements vscode.AuthenticationProvider, vscode.Disposable {
    private _sessionChangeEmitter = new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();
    private _disposable: vscode.Disposable;
    private _pendingStates: string[] = [];
    private _codeExchangePromises = new Map<string, { promise: Promise<string>; cancel: vscode.EventEmitter<void> }>();

    // Backend Endpoints
    private readonly AUTH_URL = 'http://localhost:8081/oauth/authorize';
    private readonly TOKEN_URL = 'http://localhost:8081/oauth/token';
    private readonly USER_INFO_URL = 'http://localhost:8081/api/userinfo';
    private readonly CLIENT_ID = 'winter-vscode-extension';
    private readonly REDIRECT_URI = 'winter://winter.winter-authentication/callback';

    constructor(private readonly context: vscode.ExtensionContext) {
        // Register the authentication provider
        this._disposable = vscode.authentication.registerAuthenticationProvider(
            'winter',
            'Winter Account',
            this,
            { supportsMultipleAccounts: false }
        );

        // Register URI handler for OAuth callback
        this.context.subscriptions.push(
            vscode.window.registerUriHandler({
                handleUri: async (uri: vscode.Uri) => {
                    if (uri.path === '/callback') {
                        await this.handleOAuthCallback(uri);
                    }
                }
            })
        );
    }

    get onDidChangeSessions(): vscode.Event<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent> {
        return this._sessionChangeEmitter.event;
    }

    /**
     * Get existing sessions
     */
    async getSessions(scopes?: readonly string[]): Promise<vscode.AuthenticationSession[]> {
        const allSessions = await this.context.secrets.get('winter.sessions');

        if (allSessions) {
            try {
                const sessions: SessionData[] = JSON.parse(allSessions);
                // 过滤并转换 session，确保数据格式正确
                return sessions
                    .filter(session => session.account && typeof session.account.id === 'string')
                    .map(session => this.convertToAuthenticationSession(session));
            } catch (e) {
                console.error('Failed to parse sessions:', e);
                // 如果解析失败，清除损坏的数据
                this.context.secrets.delete('winter.sessions');
            }
        }

        return [];
    }

    /**
     * Create a new session (login)
     */
    async createSession(scopes: readonly string[]): Promise<vscode.AuthenticationSession> {
        try {
            // Generate state for CSRF protection
            const state = crypto.randomBytes(32).toString('hex');
            this._pendingStates.push(state);

            // Generate PKCE code verifier and challenge
            const codeVerifier = crypto.randomBytes(32).toString('base64url');
            const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

            // Build authorization URL
            const scopeString = scopes.join(' ');
            const authUrl = `${this.AUTH_URL}?` + new URLSearchParams({
                client_id: this.CLIENT_ID,
                redirect_uri: this.REDIRECT_URI,
                response_type: 'code',
                scope: scopeString,
                state: state,
                code_challenge: codeChallenge,
                code_challenge_method: 'S256'
            }).toString();

            // Open browser for user to authenticate
            await vscode.env.openExternal(vscode.Uri.parse(authUrl));

            // Wait for the OAuth callback
            const code = await this.waitForOAuthCallback(state);

            // Exchange code for token
            const accessToken = await this.exchangeCodeForToken(code, codeVerifier);

            // Get user info
            const userInfo = await this.getUserInfo(accessToken);

            // Create session
            const session: SessionData = {
                id: crypto.randomUUID(),
                account: {
                    label: userInfo.name, // 移除 (Winter) 后缀，保持简洁
                    id: userInfo.id.toString() // 确保转换为字符串
                },
                scopes: Array.from(scopes),
                accessToken: accessToken,
                userInfo: userInfo
            };

            // Store session
            await this.storeSessions([session]);

            // Notify listeners
            this._sessionChangeEmitter.fire({ added: [this.convertToAuthenticationSession(session)], removed: [], changed: [] });

            return this.convertToAuthenticationSession(session);

        } catch (error) {
            vscode.window.showErrorMessage(`Sign in failed: ${error}`);
            throw error;
        }
    }

    /**
     * Remove a session (logout)
     */
    async removeSession(sessionId: string): Promise<void> {
        const allSessions = await this.context.secrets.get('winter.sessions');

        if (allSessions) {
            try {
                let sessions: SessionData[] = JSON.parse(allSessions);
                const sessionIndex = sessions.findIndex(s => s.id === sessionId);

                if (sessionIndex > -1) {
                    const session = sessions[sessionIndex];
                    sessions.splice(sessionIndex, 1);

                    await this.storeSessions(sessions);

                    this._sessionChangeEmitter.fire({
                        added: [],
                        removed: [this.convertToAuthenticationSession(session)],
                        changed: []
                    });
                }
            } catch (e) {
                console.error('Failed to remove session:', e);
            }
        }
    }

    /**
     * Handle OAuth callback from browser
     */
    private async handleOAuthCallback(uri: vscode.Uri): Promise<void> {
        const query = new URLSearchParams(uri.query);
        const code = query.get('code');
        const state = query.get('state');

        if (!code || !state) {
            vscode.window.showErrorMessage('Invalid OAuth callback');
            return;
        }

        // Verify state
        const stateIndex = this._pendingStates.indexOf(state);
        if (stateIndex === -1) {
            vscode.window.showErrorMessage('Invalid state parameter');
            return;
        }

        this._pendingStates.splice(stateIndex, 1);

        // Resolve the waiting promise
        const codeExchangePromise = this._codeExchangePromises.get(state);
        if (codeExchangePromise) {
            this._codeExchangePromises.delete(state);
            // Resolve with the code
            (codeExchangePromise.promise as any).resolve(code);
        }
    }

    /**
     * Wait for OAuth callback
     */
    private waitForOAuthCallback(state: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const cancel = new vscode.EventEmitter<void>();
            let innerResolve: ((value: string) => void) | undefined;

            const promise = new Promise<string>((res, rej) => {
                innerResolve = res;

                cancel.event(() => {
                    rej('Cancelled');
                    this._codeExchangePromises.delete(state);
                });

                // Timeout after 5 minutes
                setTimeout(() => {
                    rej('Authentication timeout');
                    this._codeExchangePromises.delete(state);
                }, 5 * 60 * 1000);
            });

            // Store the resolve function for handleOAuthCallback to call
            (promise as any).resolve = innerResolve;

            this._codeExchangePromises.set(state, { promise, cancel });

            promise.then(resolve, reject);
        });
    }

    /**
     * Exchange authorization code for access token
     */
    private async exchangeCodeForToken(code: string, codeVerifier: string): Promise<string> {
        console.log('Exchanging code for token...');

        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('client_id', this.CLIENT_ID);
        params.append('redirect_uri', this.REDIRECT_URI);
        params.append('code_verifier', codeVerifier);

        try {
            const response = await fetch(this.TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
            }

            const data = await response.json() as any;
            return data.access_token;
        } catch (error) {
            console.error('Token exchange error:', error);
            throw error;
        }
    }

    /**
     * Get user information
     */
    public async getUserInfo(accessToken: string): Promise<{ id: string; name: string; email: string; avatar: string }> {
        console.log('Getting user info...');

        try {
            const response = await fetch(this.USER_INFO_URL, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Get user info failed: ${response.status}`);
            }

            const data = await response.json() as any;
            return {
                id: data.id,
                name: data.nickname || data.email,
                email: data.email,
                avatar: data.avatar
            };
        } catch (error) {
            console.error('Get user info error:', error);
            throw error;
        }
    }

    /**
     * Store sessions in secure storage
     */
    private async storeSessions(sessions: SessionData[]): Promise<void> {
        await this.context.secrets.store('winter.sessions', JSON.stringify(sessions));
    }

    /**
     * Convert internal session data to VS Code authentication session
     */
    private convertToAuthenticationSession(session: SessionData): vscode.AuthenticationSession {
        return {
            id: session.id,
            accessToken: session.accessToken,
            account: {
                label: session.account.label,
                id: session.account.id
            },
            scopes: session.scopes
        };
    }

    dispose() {
        this._disposable.dispose();
        this._sessionChangeEmitter.dispose();
    }
}
