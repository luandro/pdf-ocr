import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_MARGIN } from './constants';

/**
 * Options for splitting a PDF page
 */
export interface SplitPdfPageOptions {
  /** Margin value for splitting (default: "-375") */
  margin?: string;
  /** Whether to enable verbose logging (default: false) */
  verbose?: boolean;
}

/**
 * Helper function for verbose logging
 */
function logVerbose(verbose: boolean, ...args: any[]): void {
  if (verbose) {
    console.log(...args);
  }
}

/**
 * Check if required binaries are available
 * @throws Error if any required binary is missing
 */
function checkRequiredBinaries(verbose: boolean): void {
  const requiredBinaries = [
    { name: 'pdftk', pkg: 'pdftk' },
    { name: 'pdfcrop', pkg: 'texlive-extra-utils' }
  ];

  const missing = [];

  for (const bin of requiredBinaries) {
    try {
      execSync(`which ${bin.name}`, { stdio: 'ignore' });
      if (verbose) {
        console.log(`Found binary: ${bin.name}`);
      }
    } catch {
      missing.push(bin);
    }
  }

  if (missing.length > 0) {
    const missingList = missing.map(bin => `${bin.name} (${bin.pkg})`).join(', ');
    throw new Error(`Missing required binaries: ${missingList}`);
  }
}

/**
 * Splits a PDF page into left and right halves
 * @param pdfBuffer - Buffer containing a single PDF page
 * @param options - Options for splitting
 * @returns Array of Buffers, each containing a split page
 * @throws Error if splitting fails
 */
export async function splitPdfPage(
  pdfBuffer: Buffer,
  options: SplitPdfPageOptions = {}
): Promise<Buffer[]> {
  // Set default options
  const opts = {
    margin: options.margin ?? DEFAULT_MARGIN,
    verbose: options.verbose ?? false
  };

  // Check required binaries
  try {
    checkRequiredBinaries(opts.verbose);
  } catch (error) {
    throw new Error(`Cannot split PDF page: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Create temp directory with unique ID
  const tempDir = fs.mkdtempSync(path.join(tmpdir(), `pdf-split-${uuidv4()}`));
  logVerbose(opts.verbose, `Created temp directory: ${tempDir}`);

  try {
    // Save the PDF buffer to a temporary file
    const inputPath = path.join(tempDir, 'input.pdf');
    fs.writeFileSync(inputPath, pdfBuffer);

    // Define output paths for left and right pages
    const leftPath = path.join(tempDir, 'left.pdf');
    const rightPath = path.join(tempDir, 'right.pdf');

    // Crop left half
    logVerbose(opts.verbose, `Cropping left half with margin ${opts.margin}`);
    execSync(`pdfcrop --margins "-0 -0 ${opts.margin} -0" "${inputPath}" "${leftPath}"`, {
      stdio: opts.verbose ? 'inherit' : 'ignore'
    });

    // Crop right half
    logVerbose(opts.verbose, `Cropping right half with margin ${opts.margin}`);
    execSync(`pdfcrop --margins "${opts.margin} -0 -0 -0" "${inputPath}" "${rightPath}"`, {
      stdio: opts.verbose ? 'inherit' : 'ignore'
    });

    // Check if the output files exist and have content
    const results: Buffer[] = [];

    if (fs.existsSync(leftPath) && fs.statSync(leftPath).size > 0) {
      results.push(fs.readFileSync(leftPath));
    } else {
      logVerbose(opts.verbose, 'Left page crop failed or produced empty output');
    }

    if (fs.existsSync(rightPath) && fs.statSync(rightPath).size > 0) {
      results.push(fs.readFileSync(rightPath));
    } else {
      logVerbose(opts.verbose, 'Right page crop failed or produced empty output');
    }

    // Check if we have any results
    if (results.length === 0) {
      throw new Error('PDF page splitting failed: no valid output pages produced');
    }

    return results;
  } catch (error) {
    throw new Error(`PDF page splitting failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    // Clean up temporary directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      logVerbose(opts.verbose, `Cleaned up temp directory: ${tempDir}`);
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary directory:', cleanupError);
    }
  }
}
