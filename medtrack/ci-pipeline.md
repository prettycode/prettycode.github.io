# Medication Tracker CI Pipeline

This document describes the continuous integration (CI) pipeline for the Medication Tracker application.

## Local CI Process

The local CI process can be run with:

```bash
npm run build:local:ci
```

This script performs the following steps:

1. **Entry Point Check**: Verifies that source entry point exists
2. **TypeScript Type Checking**: Validates that all TypeScript types are correct
3. **ESLint Code Analysis**: Checks for code quality issues and potential bugs
4. **Development Build**: Creates a development build to verify bundling works correctly

## CI Pipeline Success Criteria

The CI pipeline is considered successful if:

- All TypeScript types are valid (no type errors)
- ESLint does not report critical errors
- The application successfully builds with Vite

## How to Fix Common Issues

### Entry Point Issues

If you encounter the "Could not resolve entry module 'index.html'" error:

1. Make sure you have an `index.html` file in the project root
2. Verify the file includes the correct script tag pointing to your entry point, for example:
   ```html
   <script type="module" src="/src/index.tsx"></script>
   ```
3. In Vite projects, the `index.html` file should be in the root directory, not in the `public` folder

### TypeScript Type Errors

If you encounter TypeScript errors:

1. Review the error messages in the console
2. Check import paths are correct after any code reorganization
3. Ensure that component props and state have proper typings
4. Add proper type declarations for external modules if needed

### ESLint Warnings or Errors

For ESLint issues:

1. Follow the suggested fixes in the error messages
2. Run `npm run lint -- --fix` to automatically fix some issues
3. Consider disabling specific rules in special cases (add comments explaining why)

### Build Failures

If the build fails:

1. Check that all required dependencies are installed
2. Verify that the entry point file (index.tsx) is correct
3. Look for import/export issues that might affect bundling
4. Check for circular dependencies

## Best Practices

To avoid CI pipeline failures:

1. Run `npm run type-check` frequently during development
2. Use a VS Code or other IDE with TypeScript and ESLint integration
3. Address warnings as they appear rather than letting them accumulate
4. Consider running the CI script before committing or submitting a pull request 