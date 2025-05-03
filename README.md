# PDF-OCR CLI Tool

[![Test Coverage](https://github.com/yourusername/pdf-ocr-cli/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/yourusername/pdf-ocr-cli/actions/workflows/npm-publish.yml)
[![npm version](https://badge.fury.io/js/pdf-ocr-cli.svg)](https://badge.fury.io/js/pdf-ocr-cli)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

A TypeScript CLI application that:
- Takes a PDF file input
- Splits it into individual pages
- Uses Mistral API to OCR each page
- Reassembles the OCR'd content back into a single PDF

This tool is useful for making scanned PDFs searchable and for extracting text from image-based PDFs.

## Installation

### Option 1: Install from npm

```bash
# Install globally
npm install -g pdf-ocr-cli

# Create a .env file in your working directory
echo "MISTRAL_API_KEY=your_mistral_api_key_here" > .env
# If you want to use content verification, also add:
echo "TOGETHER_API_KEY=your_together_api_key_here" >> .env
```

### Option 2: Install from source

```bash
# Clone the repository
git clone https://github.com/yourusername/pdf-ocr-cli.git
cd pdf-ocr-cli

# Install dependencies
npm install

# Build the project
npm run build

# Create a .env file with your API keys
cp .env.example .env
# Edit .env with your actual API keys
```

## Usage

```bash
# Basic usage
npm start -- --input input.pdf --output output.pdf

# With processing options
npm start -- --input input.pdf --output output.pdf --concurrency 3 --max-pages 10

# With OCR options for handling network issues
npm start -- --input input.pdf --output output.pdf --retries 5 --timeout 60000 --retry-delay 2000 --verbose

# Process one page at a time with a longer sleep between pages
npm start -- --input input.pdf --output output.pdf --max-pages 10 --sleep 10000 --verbose

# Verify and improve OCR text using DeepSeek LLM
npm start -- --input input.pdf --output output.pdf --verify --verbose
```

Or if installed globally:

```bash
pdf-ocr --input input.pdf --output output.pdf
```

## Options

### Basic Options
- `--input, -i`: Input PDF file path (required)
- `--output, -o`: Output PDF file path (required)
- `--concurrency, -c`: Number of pages to process in parallel (default: 2)
- `--max-pages, -m`: Maximum number of pages to process (default: all)
- `--help, -h`: Display help information
- `--version, -v`: Display version information

### OCR Options
- `--retries, -r`: Maximum number of OCR retry attempts (default: 3)
- `--retry-delay, -d`: Delay between OCR retries in milliseconds (default: 1000)
- `--timeout, -t`: Timeout for OCR API requests in milliseconds (default: 30000)
- `--sleep, -s`: Time to sleep between processing pages in milliseconds (default: 5000)
- `--verbose, -v`: Enable verbose logging for OCR process

### Content Verification Options
- `--verify`: Verify and improve OCR text using DeepSeek LLM
- `--max-tokens`: Maximum number of tokens for LLM verification (default: 1000)
- `--temperature`: Temperature for LLM verification (default: 0.7)
- `--top-p`: Top-p for LLM verification (default: 0.9)

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

This project maintains high test coverage to ensure code quality:

- All tests are located in the `test/` directory
- Coverage reports are generated in the `coverage/` directory
- Coverage thresholds are set to 80% for branches, functions, lines, and statements

To view the coverage report:

```bash
# Run tests with coverage
npm test

# Open the HTML coverage report
open coverage/lcov-report/index.html
```

### Continuous Integration

This project uses GitHub Actions for continuous integration and automatic publishing to npm:

- Every push to the main branch triggers the test suite with coverage checks
- Coverage reports are uploaded as artifacts for each build
- If tests pass and coverage meets thresholds, the package is automatically published to npm
- To set up automatic publishing, add your NPM_TOKEN as a secret in your GitHub repository settings

The workflow configuration is located in `.github/workflows/npm-publish.yml`.

## Architecture

The application is composed of several modules:

1. **PDF Splitter** (`src/splitPdf.ts`): Splits a multi-page PDF into individual single-page PDFs.
2. **PDF-to-PNG Renderer** (`src/renderPdfToPng.ts`): Converts a single-page PDF to a PNG image.
3. **OCR Module** (`src/ocr.ts`): Uses Mistral API to extract text from images.
4. **Content Verification** (`src/contentVerification.ts`): Uses DeepSeek LLM to verify and improve OCR text.
5. **Text-to-PDF Converter** (`src/textToPdf.ts`): Converts extracted text back to a PDF document.
6. **PDF Merger** (`src/mergePdfs.ts`): Combines multiple PDFs into a single document.
7. **CLI** (`src/cli.ts`): Provides a command-line interface and orchestrates the workflow.

The processing pipeline works as follows:

1. The input PDF is split into individual pages.
2. Each page is processed one at a time with a configurable sleep between pages:
   - The PDF page is sent directly to Mistral API for OCR.
   - (Optional) The extracted text is verified and improved using DeepSeek LLM.
   - The extracted text is converted back to PDF format.
3. All the individual PDFs are merged into a single output PDF.

## Requirements

- Node.js 14 or higher
- Mistral API key (sign up at https://mistral.ai)
- (Optional) Together.ai API key for content verification (sign up at https://together.ai)

## Limitations

- The OCR quality depends on the Mistral API's capabilities.
- Very large PDFs may take a long time to process.
- Some special characters or complex layouts might not be preserved perfectly.

## Troubleshooting

- **Error: MISTRAL_API_KEY environment variable is not set**: Make sure you've created a `.env` file with your API key.
- **Error: TOGETHER_API_KEY environment variable is not set**: Make sure you've added your Together.ai API key to the `.env` file if you're using the `--verify` option.
- **Error: Invalid PDF**: The input file might be corrupted or password-protected.
- **Slow processing**: Try increasing the concurrency parameter (`--concurrency`) to process more pages in parallel.
- **Network errors during OCR**: If you encounter network errors like "socket connection was closed unexpectedly", try the following:
  - Process one page at a time with a sleep between pages: `--sleep 10000` (10 seconds)
  - Increase the timeout with `--timeout 60000` (60 seconds)
  - Increase the number of retries with `--retries 5`
  - Increase the delay between retries with `--retry-delay 2000` (2 seconds)
  - Use the `--verbose` flag to see detailed logs of the OCR process
  - Limit the number of pages processed at once with `--max-pages 5`
- **Poor OCR quality**: Try using the `--verify` option to improve the OCR text using DeepSeek LLM.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of all notable changes to this project.

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.
