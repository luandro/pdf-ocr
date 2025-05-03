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
    Buffer.from('text-page-data'),
    Buffer.from('image-page-data'),
    Buffer.from('empty-page-data')
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

// Mock the detectPageContent function
jest.mock('../../src/pageContentDetection', () => ({
  detectPageContent: jest.fn().mockImplementation(async (buffer) => {
    // Return different results based on the page content
    if (buffer.toString() === 'text-page-data') {
      return {
        contentType: 'text',
        explanation: 'This page contains text.'
      };
    } else if (buffer.toString() === 'image-page-data') {
      return {
        contentType: 'image',
        explanation: 'This page contains only images without text.'
      };
    } else if (buffer.toString() === 'empty-page-data') {
      return {
        contentType: 'empty',
        explanation: 'This page is empty.'
      };
    } else {
      return {
        contentType: 'text',
        explanation: 'Default to text.'
      };
    }
  })
}));

// Mock the preserveOriginalPage function
jest.mock('../../src/preserveOriginalPage', () => ({
  preserveOriginalPage: jest.fn().mockResolvedValue(Buffer.from('preserved-image-page'))
}));

describe('Page Content Detection Integration', () => {
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
            content: 'Response text'
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

  test('should process PDF with page content detection', async () => {
    // Import the mocked functions
    const { splitPdf } = require('../../src/splitPdf');
    const { detectPageContent } = require('../../src/pageContentDetection');
    const { preserveOriginalPage } = require('../../src/preserveOriginalPage');
    const { textToPdf } = require('../../src/textToPdf');
    const { mergePdfs } = require('../../src/mergePdfs');

    // Create OCR options with page content detection enabled
    const ocrOptions: ExtendedOcrOptions = {
      verbose: true,
      detectPageContent: true,
      preserveImagePages: true,
      skipEmptyPages: true,
      pageContentDetectionOptions: {
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

    // Verify that detectPageContent was called for each page
    expect(detectPageContent).toHaveBeenCalledTimes(3);

    // Verify that preserveOriginalPage was called for the image page
    expect(preserveOriginalPage).toHaveBeenCalledWith(
      Buffer.from('image-page-data'),
      expect.objectContaining({
        verbose: true
      })
    );

    // Verify that textToPdf was called only for the text page
    expect(textToPdf).toHaveBeenCalledTimes(1);

    // Verify that mergePdfs was called with the processed pages (text page and preserved image page, but not empty page)
    expect(mergePdfs).toHaveBeenCalledWith([
      Buffer.from('text-to-pdf-data'),
      Buffer.from('preserved-image-page')
    ]);

    // Verify that writeFileSync was called to save the output
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      'output.pdf',
      expect.any(Buffer)
    );
  });

  test('should process all pages when content detection is disabled', async () => {
    // Import the mocked functions
    const { splitPdf } = require('../../src/splitPdf');
    const { detectPageContent } = require('../../src/pageContentDetection');
    const { preserveOriginalPage } = require('../../src/preserveOriginalPage');
    const { textToPdf } = require('../../src/textToPdf');
    const { mergePdfs } = require('../../src/mergePdfs');

    // Create OCR options with page content detection disabled
    const ocrOptions: ExtendedOcrOptions = {
      verbose: true,
      detectPageContent: false
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

    // Verify that detectPageContent was not called
    expect(detectPageContent).not.toHaveBeenCalled();

    // Verify that preserveOriginalPage was not called
    expect(preserveOriginalPage).not.toHaveBeenCalled();

    // Verify that textToPdf was called at least once
    expect(textToPdf).toHaveBeenCalled();

    // Verify that mergePdfs was called with processed pages
    expect(mergePdfs).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.any(Buffer)
      ])
    );
  });

  test('should preserve image pages but process empty pages when skipEmptyPages is disabled', async () => {
    // Import the mocked functions
    const { splitPdf } = require('../../src/splitPdf');
    const { detectPageContent } = require('../../src/pageContentDetection');
    const { preserveOriginalPage } = require('../../src/preserveOriginalPage');
    const { textToPdf } = require('../../src/textToPdf');
    const { mergePdfs } = require('../../src/mergePdfs');

    // Create OCR options with page content detection enabled but skipEmptyPages disabled
    const ocrOptions: ExtendedOcrOptions = {
      verbose: true,
      detectPageContent: true,
      preserveImagePages: true,
      skipEmptyPages: false
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

    // Verify that detectPageContent was called for each page
    expect(detectPageContent).toHaveBeenCalledTimes(3);

    // Verify that preserveOriginalPage was called for the image page
    expect(preserveOriginalPage).toHaveBeenCalledWith(
      Buffer.from('image-page-data'),
      expect.anything()
    );

    // Verify that textToPdf was called at least once
    expect(textToPdf).toHaveBeenCalled();

    // Verify that mergePdfs was called with processed pages including the preserved image page
    expect(mergePdfs).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.any(Buffer)
      ])
    );

    // Verify that preserveOriginalPage was called
    expect(preserveOriginalPage).toHaveBeenCalled();
  });

  test('should process image pages but skip empty pages when preserveImagePages is disabled', async () => {
    // Import the mocked functions
    const { splitPdf } = require('../../src/splitPdf');
    const { detectPageContent } = require('../../src/pageContentDetection');
    const { preserveOriginalPage } = require('../../src/preserveOriginalPage');
    const { textToPdf } = require('../../src/textToPdf');
    const { mergePdfs } = require('../../src/mergePdfs');

    // Create OCR options with page content detection enabled but preserveImagePages disabled
    const ocrOptions: ExtendedOcrOptions = {
      verbose: true,
      detectPageContent: true,
      preserveImagePages: false,
      skipEmptyPages: true
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

    // Verify that detectPageContent was called for each page
    expect(detectPageContent).toHaveBeenCalledTimes(3);

    // Verify that preserveOriginalPage was not called
    expect(preserveOriginalPage).not.toHaveBeenCalled();

    // Verify that textToPdf was called at least once
    expect(textToPdf).toHaveBeenCalled();

    // Verify that mergePdfs was called with processed pages
    expect(mergePdfs).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.any(Buffer)
      ])
    );
  });
});
