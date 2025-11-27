# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

### Building
```bash
npm run compile          # Full build
npm run watch            # Incremental watch mode (recommended for development)
npm run watch-client     # Watch client code only
```

### Running VS Code
```bash
./scripts/code.sh        # macOS/Linux
scripts/code.bat         # Windows
./scripts/code-web.sh    # Web version
```

### Testing
```bash
# Unit tests
scripts/test.sh                           # All unit tests
scripts/test.sh --grep "pattern"          # Filter tests by pattern

# Integration tests (files ending in .integrationTest.ts or in /extensions/)
scripts/test-integration.sh

# Specific test commands
npm run test-node                         # Node.js unit tests
npm run test-browser                      # Browser unit tests
npm run test-extension                    # Extension tests
npm run smoketest                         # UI automation tests
```

### Linting and Validation
```bash
npm run eslint                    # ESLint
npm run stylelint                 # CSS/SCSS linting
npm run valid-layers-check        # Check architectural layer violations
```

**IMPORTANT**: Always check TypeScript compilation output for errors before running tests. Never run tests if there are compilation errors.

## Architecture Overview

VS Code uses a layered architecture with strict dependency rules (lower layers cannot depend on higher layers):

### Layer Hierarchy (bottom to top)
1. **`src/vs/base/`** - Foundation utilities, cross-platform abstractions (no VS Code dependencies)
2. **`src/vs/platform/`** - Platform services and dependency injection (90+ services)
3. **`src/vs/editor/`** - Monaco text editor implementation
4. **`src/vs/workbench/`** - Main application UI and features
5. **`src/vs/code/`** - Electron main process specific code
6. **`src/vs/server/`** - Server/remote specific code

### Key Directories
- `src/vs/workbench/contrib/` - Feature contributions (git, debug, terminal, chat, etc.)
- `src/vs/workbench/api/` - Extension host and VS Code API implementation
- `src/vs/workbench/services/` - Workbench service implementations
- `extensions/` - Built-in extensions (95+ including TypeScript, Git, themes)
- `build/` - Build scripts and gulp tasks
- `test/` - Integration tests and test infrastructure

### Dependency Injection
Services use constructor injection with decorators:
```typescript
export const IMyService = createDecorator<IMyService>('myService');

class MyClass {
    constructor(@IMyService private myService: IMyService) { }
}
```

### Process Architecture (Electron)
- **Main Process** (`src/main.ts`, `src/vs/code/`) - Node.js context, manages windows and IPC
- **Renderer Process** - Browser context, VS Code UI
- **Extension Host** - Isolated process for extensions (debug port 5870)
- **Shared Process** - Shared services (debug port 5879)

## Coding Guidelines

### Formatting
- Use **tabs**, not spaces
- Use arrow functions `=>` over anonymous function expressions
- Always use curly braces for loop and conditional bodies
- Open curly braces on the same line

### Naming
- `PascalCase` for types and enum values
- `camelCase` for functions, methods, properties, local variables
- Use whole words, avoid abbreviations

### Strings
- Double quotes `"..."` for user-facing strings (must be localized via `vs/nls`)
- Single quotes `'...'` for internal strings
- Use placeholders `{0}` instead of string concatenation for localized strings

### Types
- Avoid `any` or `unknown` unless absolutely necessary
- Don't export types/functions unless shared across multiple components
- Prefer named regex capture groups over numbered ones

### Code Quality
- All files must include Microsoft copyright header
- Prefer `async/await` over `Promise.then()`
- Use `export function` instead of `export const fn = () =>` for better stack traces
- Never duplicate imports
- User-facing messages must be localized using `nls.localize()`
