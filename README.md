# PDF-OCR CLI Tool

[![codecov](https://codecov.io/gh/luandro/pdf-ocr/graph/badge.svg?token=JEQ78WHEBA)](https://codecov.io/gh/luandro/pdf-ocr)
[![npm publish](https://github.com/luandro/pdf-ocr/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/luandro/pdf-ocr/actions/workflows/npm-publish.yml)
[![npm version](https://badge.fury.io/js/pdf-ocr-cli.svg)](https://badge.fury.io/js/pdf-ocr-cli)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

## Overview

A powerful TypeScript CLI tool that transforms scanned PDFs into searchable documents by:

- Taking a PDF file input
- Processing each page with Mistral API's OCR capabilities
- Optionally verifying and improving text quality with Together.ai's free LLM
- Reassembling everything into a searchable PDF

Perfect for digitizing paper documents, making image-based PDFs searchable, and extracting text from scanned materials.

## Quick Start

### Prerequisites

- Node.js 14 or higher
- Mistral API key ([sign up here](https://mistral.ai))
- Together.ai API key for verification feature ([sign up here](https://together.ai))

### Installation

```bash
# Install globally
npm install -g pdf-ocr-cli

# Or use without installing
npx pdf-ocr-cli --input input.pdf --output output.pdf
```

### Set Up API Keys

Create a `.env` file in your working directory:

```bash
echo "MISTRAL_API_KEY=your_mistral_api_key_here" > .env
echo "TOGETHER_API_KEY=your_together_api_key_here" >> .env
```

Or set environment variables in your shell:

```bash
export MISTRAL_API_KEY=your_mistral_api_key_here
export TOGETHER_API_KEY=your_together_api_key_here
```

### Basic Usage

```bash
# Process a PDF file
pdf-ocr --input input.pdf --output output.pdf

# With verification to improve OCR quality
pdf-ocr --input input.pdf --output output.pdf --verify
```

## Common Use Cases

### Process Large Documents Efficiently

```bash
# Process 3 pages at a time
pdf-ocr --input input.pdf --output output.pdf --concurrency 3
```

### Handle Network Issues

```bash
# Increase retries and timeout for unstable connections
pdf-ocr --input input.pdf --output output.pdf --retries 5 --timeout 60000
```

### Process Carefully with Detailed Logs

```bash
# Process one page at a time with longer pauses and verbose logging
pdf-ocr --input input.pdf --output output.pdf --concurrency 1 --sleep 10000 --verbose
```

## Command Options

### Basic Options
| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--input` | `-i` | Input PDF file path | *Required* |
| `--output` | `-o` | Output PDF file path | *Required* |
| `--concurrency` | `-c` | Pages to process in parallel | 2 |
| `--max-pages` | `-m` | Maximum pages to process | All |
| `--help` | `-h` | Display help information | |
| `--version` | `-v` | Display version information | |

### OCR Options
| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--retries` | `-r` | Maximum OCR retry attempts | 3 |
| `--retry-delay` | `-d` | Delay between retries (ms) | 1000 |
| `--timeout` | `-t` | OCR API request timeout (ms) | 30000 |
| `--sleep` | `-s` | Time between processing pages (ms) | 5000 |
| `--verbose` | `-v` | Enable detailed logging | |

### Verification Options
| Option | Description | Default |
|--------|-------------|---------|
| `--verify` | Enable LLM verification | |
| `--max-tokens` | Maximum tokens for verification | 1000 |
| `--temperature` | Temperature for verification | 0.7 |
| `--top-p` | Top-p for verification | 0.9 |

## Advanced Installation

### Install from Source

```bash
# Clone and build
git clone https://github.com/luandro/pdf-ocr.git
cd pdf-ocr
npm install
npm run build

# Set up environment
cp .env.example .env
# Edit .env with your API keys
```

## Development

This project follows Test-Driven Development principles:

```bash
# Run tests with coverage
npm test

# Run tests in watch mode
npm run test:watch

# Build the project
npm run build

# Run in development mode
npm run dev -- --input input.pdf --output output.pdf
```

### Test Coverage

The project maintains high test coverage (>80%) for quality assurance:

```bash
# Run tests with coverage
npm test

# View coverage report
open coverage/lcov-report/index.html
```

### Continuous Integration

GitHub Actions automates testing and publishing:
- Tests run on every push to main
- Coverage reports are generated
- Automatic npm publishing when tests pass

## Architecture

The application consists of these key modules:

1. **PDF Splitter** (`src/splitPdf.ts`): Divides PDFs into individual pages
2. **OCR Module** (`src/ocr.ts`): Extracts text using Mistral API
3. **Content Verification** (`src/contentVerification.ts`): Improves text with LLM
4. **Text-to-PDF Converter** (`src/textToPdf.ts`): Converts text back to PDF
5. **PDF Merger** (`src/mergePdfs.ts`): Combines processed pages
6. **CLI** (`src/cli.ts`): Provides the command interface

### Processing Pipeline

1. Split input PDF into individual pages
2. Process each page sequentially:
   - Extract text with Mistral API OCR
   - Optionally verify/improve text with Together.ai
   - Convert text back to PDF format
3. Merge all processed pages into final PDF

## Troubleshooting

- **API Key Errors**: Ensure your `.env` file contains valid API keys
- **Network Issues**: Try increasing `--retries`, `--timeout`, and `--retry-delay`
- **Poor OCR Quality**: Enable `--verify` to improve text with LLM
- **Processing Large Files**: Reduce `--concurrency` and increase `--sleep`
- **Memory Issues**: Process fewer pages at once with `--max-pages`

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on contributing to this project.

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.
