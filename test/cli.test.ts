import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { PDFDocument } from 'pdf-lib';
import { createCli, processPdf } from '../src/cli';

// Mock the modules we'll use
jest.mock('fs');
jest.mock('path');
jest.mock('../src/splitPdf');
jest.mock('../src/renderPdfToPng');
jest.mock('../src/ocr');
jest.mock('../src/textToPdf');
jest.mock('../src/mergePdfs');

// Import the mocked modules
import { splitPdf } from '../src/splitPdf';
import { renderPdfToPng } from '../src/renderPdfToPng';
import { performOcr } from '../src/ocr';
import { textToPdf } from '../src/textToPdf';
import { mergePdfs } from '../src/mergePdfs';

describe('CLI', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fs.readFileSync and fs.writeFileSync
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('mock pdf content'));
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

    // Mock path.resolve
    (path.resolve as jest.Mock).mockImplementation((p) => p);

    // Mock the PDF processing functions
    (splitPdf as jest.Mock).mockResolvedValue([
      Buffer.from('page 1'),
      Buffer.from('page 2'),
    ]);
    (renderPdfToPng as jest.Mock).mockResolvedValue(Buffer.from('png content'));
    (performOcr as jest.Mock).mockResolvedValue('OCR text result');
    (textToPdf as jest.Mock).mockResolvedValue(Buffer.from('text pdf content'));
    (mergePdfs as jest.Mock).mockResolvedValue(Buffer.from('merged pdf content'));
  });

  test('should parse arguments correctly', () => {
    // Create a new CLI instance
    const program = createCli();

    // Parse arguments
    program.parse(['node', 'cli.js', '--input', 'input.pdf', '--output', 'output.pdf', '--concurrency', '3']);

    // Get the parsed options
    const options = program.opts();

    // Verify the options were parsed correctly
    expect(options.input).toBe('input.pdf');
    expect(options.output).toBe('output.pdf');
    expect(options.concurrency).toBe(3);
  });

  test('should execute the full pipeline when given valid arguments', async () => {
    // Process a PDF
    await processPdf('input.pdf', 'output.pdf', 2);

    // Verify each step was called with the correct arguments
    expect(fs.readFileSync).toHaveBeenCalledWith('input.pdf');
    expect(splitPdf).toHaveBeenCalledWith(expect.any(Buffer), undefined);
    expect(renderPdfToPng).toHaveBeenCalledTimes(2);
    expect(performOcr).toHaveBeenCalledTimes(2);
    expect(textToPdf).toHaveBeenCalledTimes(2);
    expect(mergePdfs).toHaveBeenCalledWith([
      Buffer.from('text pdf content'),
      Buffer.from('text pdf content'),
    ]);
    expect(fs.writeFileSync).toHaveBeenCalledWith('output.pdf', Buffer.from('merged pdf content'));
  });

  test('should handle concurrency parameter', async () => {
    // Mock a larger PDF with more pages
    (splitPdf as jest.Mock).mockResolvedValue([
      Buffer.from('page 1'),
      Buffer.from('page 2'),
      Buffer.from('page 3'),
      Buffer.from('page 4'),
    ]);

    // Process with concurrency of 2
    await processPdf('input.pdf', 'output.pdf', 2);

    // Verify that the processing was done in batches
    // This is hard to test directly, but we can verify that all pages were processed
    expect(renderPdfToPng).toHaveBeenCalledTimes(4);
    expect(performOcr).toHaveBeenCalledTimes(4);
    expect(textToPdf).toHaveBeenCalledTimes(4);
    expect(mergePdfs).toHaveBeenCalledWith([
      Buffer.from('text pdf content'),
      Buffer.from('text pdf content'),
      Buffer.from('text pdf content'),
      Buffer.from('text pdf content'),
    ]);
  });

  test('should handle errors gracefully', async () => {
    // Mock splitPdf to throw an error
    (splitPdf as jest.Mock).mockRejectedValue(new Error('Failed to split PDF'));

    // Verify that the error is propagated
    await expect(processPdf('input.pdf', 'output.pdf', 2)).rejects.toThrow('Failed to split PDF');
  });

  test('should handle CLI with custom options', async () => {
    // Create a CLI instance with custom options
    const program = createCli();

    // Parse arguments with custom options including OCR options
    program.parse([
      'node', 'cli.js',
      '--input', 'custom.pdf',
      '--output', 'result.pdf',
      '--concurrency', '5',
      '--max-pages', '10',
      '--retries', '5',
      '--retry-delay', '2000',
      '--timeout', '60000',
      '--verbose'
    ]);

    // Get the parsed options
    const options = program.opts();

    // Verify the options were parsed correctly
    expect(options.input).toBe('custom.pdf');
    expect(options.output).toBe('result.pdf');
    expect(options.concurrency).toBe(5);
    expect(options.maxPages).toBe(10);
    expect(options.retries).toBe(5);
    expect(options.retryDelay).toBe(2000);
    expect(options.timeout).toBe(60000);
    expect(options.verbose).toBe(true);
  });

  test('should handle max-pages parameter', async () => {
    // Reset the mocks to ensure clean state
    jest.clearAllMocks();

    // Mock splitPdf to return only one page when max-pages is set to 1
    (splitPdf as jest.Mock).mockResolvedValue([Buffer.from('page 1')]);

    // Process a PDF with max-pages set to 1
    await processPdf('input.pdf', 'output.pdf', 2, 1);

    // Verify that splitPdf was called with the max-pages parameter
    expect(splitPdf).toHaveBeenCalledWith(expect.any(Buffer), 1);

    // Verify that only one page was processed
    expect(renderPdfToPng).toHaveBeenCalledTimes(1);
    expect(performOcr).toHaveBeenCalledTimes(1);
    expect(textToPdf).toHaveBeenCalledTimes(1);
    expect(mergePdfs).toHaveBeenCalledWith([Buffer.from('text pdf content')]);
  });

  test('should pass OCR options to performOcr', async () => {
    // Reset the mocks to ensure clean state
    jest.clearAllMocks();

    // Create custom OCR options
    const ocrOptions = {
      maxRetries: 5,
      retryDelay: 2000,
      timeout: 60000,
      verbose: true
    };

    // Process a PDF with OCR options
    await processPdf('input.pdf', 'output.pdf', 2, undefined, ocrOptions);

    // Verify that performOcr was called with the OCR options
    expect(performOcr).toHaveBeenCalledWith(
      expect.any(Buffer),
      ocrOptions
    );
  });
});
