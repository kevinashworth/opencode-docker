# Development Notes

## Versioning

This project uses [Semantic Versioning](https://semver.org/) with [Conventional Commits](https://www.conventionalcommits.org/).

| Commit type        | SemVer bump |
| ------------------ | ----------- |
| `fix:`             | Patch       |
| `feat:`            | Minor       |
| `BREAKING CHANGE:` | Major       |

Commit messages are validated by commitlint on every `git commit`. The allowed types are `feat`, `fix`, `docs`, `style`, `chore`, `refactor`, `test`, `perf`, `build`, `ci`, and `revert`.

### Creating a release

```sh
npm run release        # automatic bump based on commits since last tag
npm run release:dry    # preview the next version without writing anything
npm run release:minor  # force a minor bump
npm run release:major  # force a major bump
```

This will:

1. Scan commits since the last tag to determine the next version.
2. Bump `package.json` version, update `CHANGELOG.md`, create a git tag (`vX.Y.Z`), and commit all of it.
3. It does **not** push the tag or publish anything. That is left to you (e.g., manually or via CI).
