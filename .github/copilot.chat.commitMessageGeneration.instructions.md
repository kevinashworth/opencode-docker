# Commit Message Instructions

This project uses **Conventional Commits**

## Format

```
<type>(<scope>): <subject>

<body> (optional)

<footer> (optional)
```

Rules: type and subject required; scope, body and footer optional; subject lowercase, no period

## Type

| Type        | Description      |
| ----------- | ---------------- |
| `feat:`     | New feature      |
| `fix:`      | Bug fix          |
| `docs:`     | Documentation    |
| `style:`    | Formatting       |
| `chore:`    | Maintenance      |
| `refactor:` | Code restructure |
| `test:`     | Tests            |
| `perf:`     | Performance      |
| `build:`    | Build tools      |
| `ci:`       | CI/CD            |
| `revert:`   | Revert commit    |

Only use feat: for user-facing new features. Do NOT use feat: for dependency updates, config changes, test, or internal improvements. Use test: for test-only changes (unit tests, cypress, test helpers, mocks). Never use feat: unless behavior visible to end users is introduced. When in doubt, default to fix: or chore: unless there's a clear user-facing feature.

## Scope (Optional)

Scope is optional (e.g., `feat(campaigns):`). The scope of the change (e.g., component or file name). Include this if the change is specific to a particular part of the codebase.

## Subject

A brief summary of the change.

## Body (Optional)

The `body` should provide additional context and details about the change.

- Explain why the change was made.
- Describe what is being used and why.
- Include any relevant information that might be useful for understanding the change in the future.

## Footer (Optional)

If the commit introduces a breaking change, include `BREAKING CHANGE: <description of the breaking change>` as a footer.
