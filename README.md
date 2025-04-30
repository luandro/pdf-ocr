# PDF-OCR CLI Tool

A TypeScript CLI application that:
- Takes a PDF file input
- Splits it into individual pages
- Uses Mistral API to OCR each page
- Reassembles the OCR'd content back into a single PDF

This tool is useful for making scanned PDFs searchable and for extracting text from image-based PDFs.

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/pdf-ocr.git
cd pdf-ocr

# Install dependencies
npm install

# Build the project
npm run build

# Create a .env file with your Mistral API key
cp .env.example .env
# Edit .env with your actual API key
```

## Usage

```bash
# Basic usage
npm start -- --input input.pdf --output output.pdf

# With processing options
npm start -- --input input.pdf --output output.pdf --concurrency 3 --max-pages 10

# With OCR options for handling network issues
npm start -- --input input.pdf --output output.pdf --retries 5 --timeout 60000 --retry-delay 2000 --verbose
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
- `--verbose, -v`: Enable verbose logging for OCR process

## Development

This project follows Test-Driven Development principles:

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build the project
npm run build

# Run in development mode
npm run dev -- --input input.pdf --output output.pdf
```

## Architecture

The application is composed of several modules:

1. **PDF Splitter** (`src/splitPdf.ts`): Splits a multi-page PDF into individual single-page PDFs.
2. **PDF-to-PNG Renderer** (`src/renderPdfToPng.ts`): Converts a single-page PDF to a PNG image.
3. **OCR Module** (`src/ocr.ts`): Uses Mistral API to extract text from images.
4. **Text-to-PDF Converter** (`src/textToPdf.ts`): Converts extracted text back to a PDF document.
5. **PDF Merger** (`src/mergePdfs.ts`): Combines multiple PDFs into a single document.
6. **CLI** (`src/cli.ts`): Provides a command-line interface and orchestrates the workflow.

The processing pipeline works as follows:

1. The input PDF is split into individual pages.
2. Each page is rendered as a PNG image.
3. The PNG images are sent to Mistral API for OCR.
4. The extracted text is converted back to PDF format.
5. All the individual PDFs are merged into a single output PDF.

## Requirements

- Node.js 14 or higher
- Mistral API key (sign up at https://mistral.ai)

## Limitations

- The OCR quality depends on the Mistral API's capabilities.
- Very large PDFs may take a long time to process.
- Some special characters or complex layouts might not be preserved perfectly.

## Troubleshooting

- **Error: MISTRAL_API_KEY environment variable is not set**: Make sure you've created a `.env` file with your API key.
- **Error: Invalid PDF**: The input file might be corrupted or password-protected.
- **Slow processing**: Try increasing the concurrency parameter (`--concurrency`) to process more pages in parallel.
- **Network errors during OCR**: If you encounter network errors like "socket connection was closed unexpectedly", try the following:
  - Increase the timeout with `--timeout 60000` (60 seconds)
  - Increase the number of retries with `--retries 5`
  - Increase the delay between retries with `--retry-delay 2000` (2 seconds)
  - Use the `--verbose` flag to see detailed logs of the OCR process

## License

ISC
