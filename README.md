# PDF-OCR CLI Tool

A TypeScript CLI application that:
- Takes a PDF file input
- Splits it into individual pages
- Uses Mistral API to OCR each page
- Reassembles the OCR'd content back into a single PDF

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

## License

ISC
