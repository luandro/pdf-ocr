# Test Directory Structure

This directory contains tests for the PDF OCR application.

## Directory Structure

- `fixtures/`: Contains test fixtures like sample PDFs
- `output/`: Contains generated files from tests (gitignored)
- `scripts/`: Contains test scripts for real-world testing
- `*.test.ts`: Unit tests for the application

## Test Scripts

### Unit Tests

Run the unit tests with:

```bash
npm test
```

### Real-World Test Scripts

The `scripts/` directory contains real-world test scripts that can be used to test the application with actual PDFs:

- `test-sample.js`: Tests OCR on a single-page PDF
- `test-multi-page.js`: Tests OCR on a multi-page PDF
- `verify-multi-page.js`: Verifies the OCR output from a multi-page PDF

Run these scripts with:

```bash
node test/scripts/test-sample.js
node test/scripts/test-multi-page.js
node test/scripts/verify-multi-page.js
```

## Test Fixtures

The `fixtures/` directory contains sample PDFs for testing:

- `sample.pdf`: A sample PDF from pdfobject.com

## Test Output

The `output/` directory contains files generated during testing:

- `sample-ocr.pdf`: OCR output from the sample PDF
- `multi-page.pdf`: Generated multi-page PDF
- `multi-page-ocr.pdf`: OCR output from the multi-page PDF
- `ocr.txt`: Extracted text from the OCR output
- `multi-page-ocr.txt`: Extracted text from the multi-page OCR output

Note: The `output/` directory is gitignored, so you won't see these files in the repository.
