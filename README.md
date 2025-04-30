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

# With options
npm start -- --input input.pdf --output output.pdf --concurrency 3 --max-pages 10
```

Or if installed globally:

```bash
pdf-ocr --input input.pdf --output output.pdf
```

## Options

- `--input, -i`: Input PDF file path (required)
- `--output, -o`: Output PDF file path (required)
- `--concurrency, -c`: Number of pages to process in parallel (default: 2)
- `--max-pages, -m`: Maximum number of pages to process (default: all)
- `--help, -h`: Display help information
- `--version, -v`: Display version information

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

## License

ISC
