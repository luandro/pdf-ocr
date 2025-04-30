import fs from 'fs';
import path from 'path';
import { Command } from 'commander';
import { PDFDocument } from 'pdf-lib';
import { createCli, processPdf } from '../src/cli';

// Mock the modules we'll use
jest.mock('fs');
jest.mock('path');
jest.mock('../src/ocr');
jest.mock('../src/textToPdf');
jest.mock('../src/splitPdf');
jest.mock('../src/mergePdfs');

// Mock process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
  throw new Error(`Process.exit called with code ${code}`);
});

// Import the mocked modules
import { performOcr } from '../src/ocr';
import { textToPdf } from '../src/textToPdf';
import { splitPdf } from '../src/splitPdf';
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
    // Mock sleep to make tests run faster
    jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      cb();
      return 0 as any;
    });
    // Process a PDF
    await processPdf('input.pdf', 'output.pdf', 2);

    // Verify each step was called with the correct arguments
    expect(fs.readFileSync).toHaveBeenCalledWith('input.pdf');
    expect(splitPdf).toHaveBeenCalledWith(expect.any(Buffer), undefined);
    expect(performOcr).toHaveBeenCalledWith(expect.any(Buffer), undefined);
    expect(textToPdf).toHaveBeenCalledWith('OCR text result');
    expect(mergePdfs).toHaveBeenCalledWith([
      Buffer.from('text pdf content'),
      Buffer.from('text pdf content'),
    ]);
    expect(fs.writeFileSync).toHaveBeenCalledWith('output.pdf', expect.any(Buffer));
  });

  test('should handle concurrency parameter', async () => {
    // Mock sleep to make tests run faster
    jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      cb();
      return 0 as any;
    });
    // Process with concurrency of 2
    // Note: Concurrency parameter is no longer used with direct PDF upload
    await processPdf('input.pdf', 'output.pdf', 2);

    // Verify that the processing was done correctly
    // Note: With the new implementation, we process each page individually
    expect(performOcr).toHaveBeenCalledTimes(2);
    expect(textToPdf).toHaveBeenCalledTimes(2);
  });

  test('should handle errors gracefully', async () => {
    // Mock performOcr to throw an error
    (performOcr as jest.Mock).mockRejectedValue(new Error('OCR failed'));

    // Verify that the error is propagated
    await expect(processPdf('input.pdf', 'output.pdf', 2)).rejects.toThrow('OCR failed');
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
    // Mock sleep to make tests run faster
    jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      cb();
      return 0 as any;
    });
    // Reset the mocks to ensure clean state
    jest.clearAllMocks();

    // Mock splitPdf to return only one page when max-pages is set to 1
    (splitPdf as jest.Mock).mockResolvedValue([Buffer.from('page 1')]);

    // Process a PDF with max-pages set to 1
    await processPdf('input.pdf', 'output.pdf', 2, 1);

    // Verify that splitPdf was called with the max-pages parameter
    expect(splitPdf).toHaveBeenCalledWith(expect.any(Buffer), 1);

    // Verify that only one page was processed
    expect(performOcr).toHaveBeenCalledTimes(1);
    expect(textToPdf).toHaveBeenCalledTimes(1);
    expect(mergePdfs).toHaveBeenCalledWith([Buffer.from('text pdf content')]);
  });

  test('should pass OCR options to performOcr', async () => {
    // Mock sleep to make tests run faster
    jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      cb();
      return 0 as any;
    });
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
