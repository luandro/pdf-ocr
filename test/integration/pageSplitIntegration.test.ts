import { processPdf, ExtendedOcrOptions } from '../../src/cli';
import { Mistral } from '@mistralai/mistralai';
import { Together } from 'together-ai';
import fs from 'fs';
import path from 'path';

// Mock the Mistral client
jest.mock('@mistralai/mistralai');

// Mock the Together client
jest.mock('together-ai');

// Mock the fs module
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue(Buffer.from('mock-pdf-data')),
  writeFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  statSync: jest.fn().mockReturnValue({ size: 1024 })
}));

// Mock the splitPdf function
jest.mock('../../src/splitPdf', () => ({
  splitPdf: jest.fn().mockResolvedValue([
    Buffer.from('page-1-data'),
    Buffer.from('page-2-data')
  ])
}));

// Mock the mergePdfs function
jest.mock('../../src/mergePdfs', () => ({
  mergePdfs: jest.fn().mockResolvedValue(Buffer.from('merged-pdf-data'))
}));

// Mock the textToPdf function
jest.mock('../../src/textToPdf', () => ({
  textToPdf: jest.fn().mockResolvedValue(Buffer.from('text-to-pdf-data'))
}));

// Mock the detectPageSplit function
jest.mock('../../src/pageSplitDetection', () => ({
  detectPageSplit: jest.fn().mockImplementation(async (buffer) => {
    // Return different results based on the page
    if (buffer.toString() === 'page-1-data') {
      return {
        needsSplitting: true,
        margin: '-375',
        explanation: 'This is a double page.'
      };
    } else {
      return {
        needsSplitting: false,
        explanation: 'This is a single page.'
      };
    }
  })
}));

// Mock the splitPdfPage function
jest.mock('../../src/splitPdfPage', () => ({
  splitPdfPage: jest.fn().mockImplementation(async (buffer) => {
    // Return split pages
    return [
      Buffer.from('split-left-data'),
      Buffer.from('split-right-data')
    ];
  })
}));

describe('Page Split Integration', () => {
  // Mock OCR response
  const mockOcrResponse = {
    content: 'This is OCR text'
  };

  // Set up environment variables for testing
  beforeAll(() => {
    process.env.MISTRAL_API_KEY = 'test-mistral-key';
    process.env.TOGETHER_API_KEY = 'test-together-key';
  });

  // Clean up environment variables after testing
  afterAll(() => {
    delete process.env.MISTRAL_API_KEY;
    delete process.env.TOGETHER_API_KEY;
  });

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Mistral OCR process
    const mockOcrProcess = jest.fn().mockResolvedValue(mockOcrResponse);
    (Mistral as jest.MockedClass<typeof Mistral>).mockImplementation(() => ({
      ocr: {
        process: mockOcrProcess
      }
    } as unknown as Mistral));
    
    // Mock Together chat completions
    const mockChatCompletions = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: 'Verified text'
          }
        }
      ]
    });
    (Together as jest.MockedClass<typeof Together>).mockImplementation(() => ({
      chat: {
        completions: {
          create: mockChatCompletions
        }
      }
    } as unknown as Together));
  });

  test('should process PDF with page split detection', async () => {
    // Import the mocked functions
    const { splitPdf } = require('../../src/splitPdf');
    const { detectPageSplit } = require('../../src/pageSplitDetection');
    const { splitPdfPage } = require('../../src/splitPdfPage');
    const { textToPdf } = require('../../src/textToPdf');
    const { mergePdfs } = require('../../src/mergePdfs');
    
    // Create OCR options with page split detection enabled
    const ocrOptions: ExtendedOcrOptions = {
      verbose: true,
      detectPageSplits: true,
      pageSplitDetectionOptions: {
        verbose: true
      }
    };
    
    // Call the processPdf function
    await processPdf(
      'input.pdf',
      'output.pdf',
      1,
      undefined,
      ocrOptions,
      0
    );
    
    // Verify that splitPdf was called
    expect(splitPdf).toHaveBeenCalledWith(expect.any(Buffer), undefined);
    
    // Verify that detectPageSplit was called for each page
    expect(detectPageSplit).toHaveBeenCalledTimes(2);
    
    // Verify that splitPdfPage was called for the first page (which needs splitting)
    expect(splitPdfPage).toHaveBeenCalledWith(
      Buffer.from('page-1-data'),
      expect.objectContaining({
        margin: '-375',
        verbose: true
      })
    );
    
    // Verify that textToPdf was called for each processed page (3 total: 2 split + 1 normal)
    expect(textToPdf).toHaveBeenCalledTimes(3);
    
    // Verify that mergePdfs was called with all processed pages
    expect(mergePdfs).toHaveBeenCalledWith(expect.arrayContaining([
      expect.any(Buffer),
      expect.any(Buffer),
      expect.any(Buffer)
    ]));
    
    // Verify that writeFileSync was called to save the output
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      'output.pdf',
      expect.any(Buffer)
    );
  });

  test('should process PDF without page split detection when disabled', async () => {
    // Import the mocked functions
    const { splitPdf } = require('../../src/splitPdf');
    const { detectPageSplit } = require('../../src/pageSplitDetection');
    const { textToPdf } = require('../../src/textToPdf');
    const { mergePdfs } = require('../../src/mergePdfs');
    
    // Create OCR options with page split detection disabled
    const ocrOptions: ExtendedOcrOptions = {
      verbose: true,
      detectPageSplits: false
    };
    
    // Call the processPdf function
    await processPdf(
      'input.pdf',
      'output.pdf',
      1,
      undefined,
      ocrOptions,
      0
    );
    
    // Verify that splitPdf was called
    expect(splitPdf).toHaveBeenCalledWith(expect.any(Buffer), undefined);
    
    // Verify that detectPageSplit was not called
    expect(detectPageSplit).not.toHaveBeenCalled();
    
    // Verify that textToPdf was called for each page (2 total)
    expect(textToPdf).toHaveBeenCalledTimes(2);
    
    // Verify that mergePdfs was called with all processed pages
    expect(mergePdfs).toHaveBeenCalledWith(expect.arrayContaining([
      expect.any(Buffer),
      expect.any(Buffer)
    ]));
  });
});
