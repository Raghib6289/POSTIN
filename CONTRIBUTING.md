---
### `CONTRIBUTING.md` (Root or `.github/` folder)



## Code of Conduct

By participating in this project, you agree to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before collaborating.

---

## How Can I Contribute?

### 1. Reporting Bugs
Before filing a bug report:
- Check existing [GitHub Issues](https://github.com/YOUR_USERNAME/instagram-caption-agent/issues) to avoid duplicates.
- Reproduce the bug on the latest `main` branch.

When opening an issue, include:
- A clear, descriptive title.
- Steps to reproduce the bug.
- Expected behavior vs. actual behavior.
- Relevant logs, screenshots, Node version, and browser/OS information.

### 2. Suggesting Enhancements
Feature requests are tracked as GitHub Issues. Provide:
- A clear explanation of the user problem or use case.
- Proposed solution or architecture change (e.g., changes to LangGraph agent nodes or DB schema).
- Alternatives considered.

### 3. Pull Requests (PRs)
To submit a contribution:

1. **Fork the repository** and create a descriptive branch name from `main`:
   ```bash
   git checkout -b feat/add-carousel-support
   # or
   git checkout -b fix/image-base64-buffer-overflow

Make your changes:

Keep pull requests focused on a single change or cohesive feature.

Write clean, documented code consistent with existing patterns.

Update schema.sql or .env.example if you add database columns or secrets.

Commit your changes:

Use conventional commit messages: feat: add export to CSV, fix: handle invalid image MIME types, docs: clarify Neon setup.

Push to your fork:

Bash
git push origin feat/add-carousel-support
Open a Pull Request:

Fill out the PR template completely.

Link any related issues (Fixes #12).

Local Development Standards
Environment Hygiene: Never check .env files or API credentials into git.

Code Style: Run the linter/formatter prior to submitting changes:

Bash
npm run lint
npm run format
Agent Architecture: Keep LangGraph agent node functions modular and ensure every external Gemini call handles rate limits and API errors gracefully.

Review Process
Maintainers review PRs based on:

Scope and readability of the diff.

Backward compatibility with existing Neon schemas.

Adherence to serverless constraints (zero local disk reliance).
