# Contributing to PTV MCP Server 🚂

Thank you for your interest in contributing to the PTV MCP Server! This document provides guidelines for contributing to the project.

## 🚀 Development Setup

### Prerequisites

Before you begin, ensure you have the following installed:

- **Bun** (latest version) - Primary runtime and package manager
- **Node.js** 18+ - Required for npm publishing workflow
- **Git** - Version control
- **PTV Developer Credentials** - For testing against the live API

### Initial Setup

1. **Fork and Clone the Repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ptv_mcp.git
   cd ptv_mcp
   ```

2. **Install Dependencies**
   ```bash
   bun install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your PTV credentials
   ```

4. **Verify Setup**
   ```bash
   bun run lint    # TypeScript type checking
   bun test        # Run test suite
   bun run build   # Build project
   ```

## 🧪 Testing Requirements

### Running Tests

All contributions must include appropriate tests and pass the existing test suite:

```bash
# Run all tests
bun test

# Run tests with coverage
bun test --coverage

# Run specific test file
bun test tests/signing.test.ts

# Run tests in watch mode during development
bun test --watch
```

### Test Structure

- **Unit Tests**: `/tests/*.test.ts` - Test individual components
- **Integration Tests**: `/tests/integration/*.test.ts` - Test tool orchestration
- **Test Conventions**: 
  - Use descriptive test names
  - Include top-level comment explaining test goals
  - Never modify production code to make tests pass
  - Test both success and error scenarios

### Test Requirements for PRs

- All existing tests must pass
- New features must include corresponding tests
- Bug fixes should include regression tests
- Test coverage should not decrease
- Mock external dependencies (PTV API calls)

## 📝 Code Style Guidelines

### TypeScript Standards

This project uses **TypeScript strict mode** with comprehensive type checking:

```bash
# Type checking (must pass)
bun run lint

# Code formatting
bun run format
```

### Code Style Rules

- **Strict TypeScript**: All code must compile without errors in strict mode
- **Prettier Formatting**: Code is automatically formatted using Prettier
- **ESLint Integration**: Follow TypeScript best practices
- **Explicit Types**: Prefer explicit return types on public methods
- **Error Handling**: Use structured error format with actionable messages

### File Organization

```
src/
├── config.ts              # Environment configuration
├── mcp/
│   └── server.ts           # MCP server entry point
├── ptv/                   # PTV API client layer
│   ├── signing.ts          # HMAC-SHA1 authentication
│   ├── http.ts             # HTTP client with retries
│   ├── client.ts           # API endpoints
│   ├── types.ts            # TypeScript interfaces
│   └── cache.ts            # TTL caching
└── features/              # Tool implementations
    ├── next_train/
    ├── line_timetable/
    └── how_far/
```

## 🔄 Pull Request Guidelines

### Before Submitting a PR

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Ensure Quality**
   ```bash
   bun run lint       # Must pass
   bun test           # Must pass
   bun run format     # Format code
   bun run build      # Must complete successfully
   ```

3. **Update Documentation**
   - Update README.md if adding features
   - Update API documentation in `/docs/`
   - Include JSDoc comments for public APIs

### PR Checklist

- [ ] All tests pass locally
- [ ] TypeScript compilation succeeds
- [ ] Code is properly formatted (Prettier)
- [ ] New features include tests
- [ ] Documentation is updated
- [ ] Commit messages are descriptive
- [ ] PR description explains the change

### Commit Message Format

Use descriptive commit messages:

```
feat: add vehicle tracking to how-far tool
fix: handle missing platform data in departures
docs: update API reference with new endpoints
test: add integration tests for next-train tool
refactor: improve error handling in PTV client
```

## 🏗️ Architecture Guidelines

### Design Principles

- **Separation of Concerns**: Clear layered architecture
- **Type Safety**: Comprehensive TypeScript typing
- **Error Handling**: Structured errors with user guidance
- **Caching**: TTL-based caching for static data
- **Retry Logic**: Exponential backoff for API failures
- **Real-time Data**: No caching for live departures/vehicles

### Adding New Features

1. **Tool Implementation**: Create in `src/features/your_tool/`
2. **API Integration**: Extend `src/ptv/client.ts` if needed
3. **Type Definitions**: Add to `src/ptv/types.ts`
4. **MCP Registration**: Register tool in `src/mcp/server.ts`
5. **Tests**: Add comprehensive test coverage
6. **Documentation**: Update tool usage examples

### Error Handling Standards

Use the structured error format:

```typescript
interface MCPError {
  code: string;
  message: string;
  status?: number;
  path?: string;
  cause?: unknown;
  retryAfter?: number;
  correlationId?: string;
}
```

## 🔐 Security Guidelines

- **Never commit credentials**: Use environment variables only
- **Validate inputs**: Sanitize all user inputs
- **API key handling**: Redact from logs and error messages
- **HMAC verification**: Maintain signature integrity
- **Rate limiting**: Respect PTV API rate limits

## 📦 Publishing Process (Maintainers Only)

### Prerequisites

Repository must have `NPM_TOKEN` secret configured in GitHub Settings.

### Release Steps

1. **Update Version**
   ```bash
   npm version patch    # Bug fixes
   npm version minor    # New features  
   npm version major    # Breaking changes
   ```

2. **Push Release Tag**
   ```bash
   git push origin main --tags
   ```

3. **GitHub Actions Workflow**
   - Automatically triggers on version tags (`v*.*.*`)
   - Runs full test suite (must pass)
   - Performs TypeScript type checking
   - Builds project and verifies output
   - Publishes to npm with provenance
   - Creates GitHub release

### NPM Token Setup

Repository maintainers need to configure the NPM_TOKEN secret:

1. Create npm access token at https://www.npmjs.com/settings/tokens
2. Add to GitHub repository secrets as `NPM_TOKEN`
3. Ensure token has publish permissions for `@thesammykins` scope

### Manual Publishing (Emergency)

```bash
# Build and test locally
bun run build
bun test
bun run lint

# Publish with dry run first
npm publish --dry-run

# Actual publish (maintainers only)
npm publish --access public
```

## 🐛 Bug Reports

### Creating Issues

When reporting bugs, please include:

- **Environment**: Bun version, OS, Node.js version
- **PTV API Details**: Endpoint, parameters, response
- **Steps to Reproduce**: Minimal reproduction case
- **Expected vs Actual**: What should happen vs what happens
- **Error Messages**: Full error output and stack traces
- **Tool Context**: Which MCP tool was being used

### Debugging Tips

```bash
# Enable detailed logging
LOG_LEVEL=debug bun run mcp:dev

# Test individual components
bun test tests/signing.test.ts
bun test tests/http.test.ts

# Test API connectivity
bun run examples/test-tools.ts
```

## 💡 Feature Requests

### Before Requesting

- Check existing issues for similar requests
- Review the [project roadmap](docs/plan.md)
- Consider if the feature aligns with MCP goals

### Feature Request Format

- **Use Case**: Why is this feature needed?
- **Proposed Solution**: How should it work?
- **Alternatives**: Other approaches considered?
- **Implementation**: Technical considerations?

## 🤝 Getting Help

- **Documentation**: Check `/docs/` directory
- **Issues**: Search existing GitHub issues
- **Discussions**: Use GitHub Discussions for questions
- **API Reference**: Review PTV API v3 documentation

## 📄 License

By contributing to PTV MCP Server, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to PTV MCP Server! Your efforts help make Melbourne's public transport data more accessible to AI assistants and developers. 🚂✨
