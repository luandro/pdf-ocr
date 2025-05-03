# Contributing to PDF-OCR CLI

Thank you for considering contributing to PDF-OCR CLI! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project.

## How to Contribute

1. Fork the repository
2. Create a new branch for your feature or bugfix
3. Make your changes
4. Write tests for your changes
5. Run the test suite to ensure all tests pass
6. Submit a pull request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/pdf-ocr-cli.git
cd pdf-ocr-cli

# Install dependencies
npm install

# Create a .env file with your API keys
cp .env.example .env
# Edit .env with your actual API keys
```

## Testing

This project follows Test-Driven Development (TDD) principles. Please write tests for any new features or bugfixes.

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Pull Request Process

1. Update the README.md with details of changes if applicable
2. Update the version number in package.json following [Semantic Versioning](https://semver.org/)
3. The pull request will be merged once it has been reviewed and approved

## Style Guide

- Use TypeScript for all code
- Follow the existing code style
- Use descriptive variable names
- Add JSDoc comments for all functions and classes
- Keep functions small and focused on a single task

## Commit Message Format

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types:
- feat: A new feature
- fix: A bug fix
- docs: Documentation only changes
- style: Changes that do not affect the meaning of the code
- refactor: A code change that neither fixes a bug nor adds a feature
- perf: A code change that improves performance
- test: Adding missing tests or correcting existing tests
- chore: Changes to the build process or auxiliary tools

Example:
```
feat(ocr): add support for language detection

Add automatic language detection to the OCR process to improve accuracy.

Closes #123
```

## License

By contributing to this project, you agree that your contributions will be licensed under the project's ISC license.
