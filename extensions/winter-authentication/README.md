# Winter Authentication Extension

This extension provides authentication for Winter services in VS Code.

## Features

- OAuth 2.0 authentication flow with PKCE
- Secure token storage
- Sign in/Sign out commands
- Session management

## Usage

### Sign In

1. Open Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`)
2. Type "Sign in to Winter"
3. Browser will open for authentication
4. Complete the login process in your browser
5. Return to VS Code - you're now signed in!

### Sign Out

1. Open Command Palette
2. Type "Sign out of Winter"
3. Confirm sign out

## Development

### Backend Integration

To connect to your actual backend, update the following constants in `src/winterAuthProvider.ts`:

```typescript
private readonly AUTH_URL = 'https://your-backend.com/oauth/authorize';
private readonly TOKEN_URL = 'https://your-backend.com/oauth/token';
private readonly USER_INFO_URL = 'https://your-backend.com/api/user';
private readonly CLIENT_ID = 'your-client-id';
```

Then uncomment and implement the actual API calls in:
- `exchangeCodeForToken()` - Exchange authorization code for access token
- `getUserInfo()` - Fetch user information from your backend

### OAuth Flow

1. User clicks "Sign in to Winter"
2. Extension opens browser to `AUTH_URL` with PKCE challenge
3. User authenticates on your website
4. Your backend redirects to `vscode://winter.winter-authentication/callback?code=xxx&state=yyy`
5. Extension exchanges code for access token
6. Extension fetches user info and creates session
7. Session is stored securely

## Security

- Uses PKCE (Proof Key for Code Exchange) for enhanced security
- Tokens are stored in VS Code's secure storage
- State parameter prevents CSRF attacks

## License

MIT
