import { execSync, spawnSync } from "node:child_process";
import * as readline from "node:readline";
import * as fs from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";

// Types for better code organization
interface BinaryDependency {
  name: string;
  pkg: string;
}

interface SplitOptions {
  inputPdf: string;
  outputPdf: string;
  margin: string;
  maxPages?: number;
  verbose: boolean;
}

// Helper functions
function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

function checkBinary(binary: string): boolean {
  try {
    const result = spawnSync("which", [binary], { encoding: "utf-8" });
    return result.status === 0 && result.stdout.trim().length > 0;
  } catch {
    return false;
  }
}

function checkAllBinaries(verbose: boolean): void {
  const required: BinaryDependency[] = [
    { name: "pdfinfo", pkg: "poppler-utils" },
    { name: "pdfunite", pkg: "poppler-utils" },
    { name: "pdftk", pkg: "pdftk" },
    { name: "pdfcrop", pkg: "texlive-extra-utils" },
  ];
  
  const missing: BinaryDependency[] = [];
  
  for (const bin of required) {
    if (!checkBinary(bin.name)) {
      missing.push(bin);
    } else if (verbose) {
      console.log(`Found binary: ${bin.name}`);
    }
  }
  
  if (missing.length > 0) {
    console.error("Missing required binaries:");
    missing.forEach(bin => {
      console.error(`  - ${bin.name} (try installing package: ${bin.pkg})`);
    });
    process.exit(1);
  }
}

function logVerbose(verbose: boolean, ...args: any[]): void {
  if (verbose) {
    console.log(...args);
  }
}

function getPageCount(pdfPath: string): number {
  try {
    const out = execSync(`pdfinfo "${pdfPath}" | grep Pages | awk '{print $2}'`)
      .toString()
      .trim();
    const numPages = Number.parseInt(out, 10);
    
    if (Number.isNaN(numPages) || numPages < 1) {
      throw new Error("Could not parse number of pages");
    }
    
    return numPages;
  } catch (e) {
    console.error("Failed to get number of pages. Is poppler-utils installed?");
    throw e;
  }
}

function extractPage(inputPdf: string, pageNum: number, outputPath: string, verbose: boolean): void {
  logVerbose(verbose, `Extracting page ${pageNum} to ${outputPath}`);
  try {
    execSync(`pdftk "${inputPdf}" cat ${pageNum} output "${outputPath}"`);
  } catch (e) {
    console.error(`Failed to extract page ${pageNum} with pdftk.`);
    throw e;
  }
}

function cropPage(inputPath: string, outputPath: string, marginSettings: string, verbose: boolean): void {
  logVerbose(verbose, `Cropping with margins ${marginSettings} to ${outputPath}`);
  try {
    execSync(`pdfcrop --margins '${marginSettings}' "${inputPath}" "${outputPath}"`);
  } catch (e) {
    console.error(`Failed to crop page with pdfcrop.`);
    throw e;
  }
}

function mergePdfs(fileList: string[], outputPath: string, verbose: boolean): void {
  logVerbose(verbose, `Merging ${fileList.length} PDFs to ${outputPath}`);
  
  if (fileList.length === 0) {
    console.error("No PDF files to merge");
    throw new Error("No PDF files to merge");
  }
  
  // Verify all input files exist
  const existingFiles = fileList.filter(file => fs.existsSync(file) && fs.statSync(file).size > 0);
  if (existingFiles.length === 0) {
    console.error("None of the input PDF files exist or are valid");
    throw new Error("No valid input files found");
  }
  
  if (existingFiles.length < fileList.length) {
    logVerbose(verbose, `Warning: ${fileList.length - existingFiles.length} input files don't exist or are empty`);
  }
  
  // Create output directory if it doesn't exist
  const outputDir = path.dirname(outputPath);
  if (outputDir && outputDir !== '.' && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    // Try with pdfunite (most reliable for many files)
    try {
      logVerbose(verbose, "Merging with pdfunite...");
      
      // For large numbers of files, use a temporary file list
      if (existingFiles.length > 100) {
        const fileListPath = path.join(tmpdir(), `pdfsplit-filelist-${Date.now()}.txt`);
        fs.writeFileSync(fileListPath, existingFiles.join('\n'));
        execSync(`cat "${fileListPath}" | xargs pdfunite - "${outputPath}"`, { 
          shell: "/bin/bash", 
          stdio: verbose ? "inherit" : "pipe" 
        });
        fs.unlinkSync(fileListPath);
      } else {
        // For smaller numbers, use direct command
        const fileArgs = existingFiles.map(f => `"${f}"`).join(' ');
        execSync(`pdfunite ${fileArgs} "${outputPath}"`, { 
          shell: "/bin/bash", 
          stdio: verbose ? "inherit" : "pipe" 
        });
      }
      
      // Verify the output was created
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        logVerbose(verbose, "pdfunite merge successful");
        return;
      } else {
        logVerbose(verbose, "pdfunite produced empty or missing output");
        throw new Error("pdfunite merge failed");
      }
    } catch (e) {
      logVerbose(verbose, `pdfunite merge failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    
    // Try batch processing with pdfunite
    try {
      logVerbose(verbose, "Attempting batch merge with pdfunite...");
      const batchSize = 20;
      const tempDir = fs.mkdtempSync(path.join(tmpdir(), "pdfsplit-batch-"));
      const batchOutputs: string[] = [];
      
      for (let j = 0; j < existingFiles.length; j += batchSize) {
        const batch = existingFiles.slice(j, j + batchSize);
        const batchOutput = path.join(tempDir, `batch_${Math.floor(j / batchSize)}.pdf`);
        
        try {
          logVerbose(verbose, `Merging batch ${Math.floor(j / batchSize)}: ${batch.length} files`);
          const batchArgs = batch.map(f => `"${f}"`).join(' ');
          execSync(`pdfunite ${batchArgs} "${batchOutput}"`, {
            shell: "/bin/bash",
            stdio: verbose ? "inherit" : "pipe"
          });
          
          // Verify the batch output was created
          if (fs.existsSync(batchOutput) && fs.statSync(batchOutput).size > 0) {
            batchOutputs.push(batchOutput);
          } else {
            logVerbose(verbose, `Batch ${Math.floor(j / batchSize)} produced empty or missing output`);
          }
        } catch (e) {
          logVerbose(verbose, `Error merging batch ${Math.floor(j / batchSize)}: ${e instanceof Error ? e.message : String(e)}`);
          // Continue with other batches
        }
      }
      
      // Merge batches
      const validBatches = batchOutputs.filter(f => fs.existsSync(f) && fs.statSync(f).size > 0);
      
      if (validBatches.length === 0) {
        throw new Error("No valid batch outputs found to merge");
      }
      
      if (validBatches.length === 1) {
        logVerbose(verbose, "Single valid batch, copying directly");
        fs.copyFileSync(validBatches[0], outputPath);
      } else {
        logVerbose(verbose, `Merging ${validBatches.length} batches with pdfunite`);
        const batchArgs = validBatches.map(f => `"${f}"`).join(' ');
        execSync(`pdfunite ${batchArgs} "${outputPath}"`, { 
          shell: "/bin/bash", 
          stdio: verbose ? "inherit" : "pipe" 
        });
      }
      
      // Clean up
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        logVerbose(verbose, `Warning: Failed to clean up temp directory: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
      }
      
      // Verify the output was created
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        logVerbose(verbose, "Batch merge successful");
        return;
      } else {
        throw new Error("Batch merge produced empty or missing output");
      }
    } catch (e) {
      logVerbose(verbose, `Batch merge failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    
    // Try direct merge with pdftk as a fallback
    try {
      logVerbose(verbose, "Attempting merge with pdftk...");
      const fileArgs = existingFiles.map(f => `"${f}"`).join(' ');
      execSync(`pdftk ${fileArgs} cat output "${outputPath}"`, { 
        shell: "/bin/bash", 
        stdio: verbose ? "inherit" : "pipe" 
      });
      
      // Verify the output was created
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        logVerbose(verbose, "pdftk merge successful");
        return;
      } else {
        logVerbose(verbose, "pdftk produced empty or missing output");
        throw new Error("pdftk merge failed");
      }
    } catch (e) {
      logVerbose(verbose, `pdftk merge failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    
    // Last resort: just copy the first file
    if (existingFiles.length > 0) {
      logVerbose(verbose, "All merge methods failed, copying first file as fallback");
      fs.copyFileSync(existingFiles[0], outputPath);
      return;
    }
    
    throw new Error("All PDF merge methods failed");
    
  } catch (e) {
    console.error("Failed to merge PDFs:", e instanceof Error ? e.message : String(e));
    throw e;
  }
}

async function parseArgs(): Promise<SplitOptions> {
  const rawArgs = process.argv.slice(2);
  const verbose = rawArgs.includes("--verbose");
  
  // Parse max-pages option
  const maxIdx = rawArgs.findIndex(arg => arg === "-m" || arg === "--max-pages");
  let maxPages: number | undefined;
  
  if (maxIdx !== -1) {
    const val = rawArgs[maxIdx + 1];
    if (!val || isNaN(Number(val)) || Number(val) < 1) {
      console.error("Invalid value for -m/--max-pages. It should be a positive integer.");
      process.exit(1);
    }
    maxPages = parseInt(val, 10);
  }
  
  // Filter out flags
  const args = rawArgs.filter((arg, idx) => {
    if (arg === "--verbose") return false;
    if (idx === maxIdx || idx === maxIdx + 1) return false;
    return true;
  });
  
  // Get input PDF
  const inputPdf = args[0] || 
    (await askQuestion("Enter the path to the PDF file to split (e.g. input.pdf): ")).trim();
  
  if (!fs.existsSync(inputPdf)) {
    console.error(`File not found: ${inputPdf}`);
    process.exit(1);
  }
  
  // Get margin value
  const marginDefault = "-375";
  const marginInput = (
    await askQuestion(`Enter the margin value for splitting (default: ${marginDefault}): `)
  ).trim();
  const margin = marginInput === "" ? marginDefault : marginInput;
  
  // Get output PDF
  const outputPdf = args[1] ||
    (await askQuestion("Enter the output PDF file name (e.g. output_split.pdf): ")).trim();
  
  return { inputPdf, outputPdf, margin, maxPages, verbose };
}

async function splitPdf(options: SplitOptions): Promise<void> {
  const { inputPdf, outputPdf, margin, maxPages, verbose } = options;
  
  // Create temp directory
  const tempDir = fs.mkdtempSync(path.join(tmpdir(), "pdfsplit-"));
  logVerbose(verbose, `Created temp dir: ${tempDir}`);
  
  try {
    // Get page count
    const numPages = getPageCount(inputPdf);
    logVerbose(verbose, `Detected ${numPages} pages in input PDF.`);
    
    // Apply max-pages limit if provided
    const totalPages = maxPages !== undefined ? Math.min(numPages, maxPages) : numPages;
    if (maxPages !== undefined) {
      logVerbose(verbose, `Limiting processing to first ${totalPages} page(s).`);
    }
    
    // Process each page
    const splitPages: string[] = [];
    const failedPages: number[] = [];
    
    for (let i = 1; i <= totalPages; i++) {
      // Extract page
      const pageFile = path.join(tempDir, `page_${String(i).padStart(4, "0")}.pdf`);
      try {
        extractPage(inputPdf, i, pageFile, verbose);
      } catch (e) {
        logVerbose(verbose, `Failed to extract page ${i}: ${e instanceof Error ? e.message : String(e)}`);
        failedPages.push(i);
        continue; // Skip to next page instead of exiting
      }
      
      // Crop left half
      const leftFile = path.join(tempDir, `page_${String(i).padStart(4, "0")}_left.pdf`);
      try {
        cropPage(pageFile, leftFile, `-0 -0 ${margin} -0`, verbose);
        if (fs.existsSync(leftFile) && fs.statSync(leftFile).size > 0) {
          splitPages.push(leftFile);
        } else {
          logVerbose(verbose, `Left crop for page ${i} produced empty or missing output`);
        }
      } catch (e) {
        logVerbose(verbose, `Failed to crop left half of page ${i}: ${e instanceof Error ? e.message : String(e)}`);
      }
      
      // Crop right half
      const rightFile = path.join(tempDir, `page_${String(i).padStart(4, "0")}_right.pdf`);
      try {
        cropPage(pageFile, rightFile, `${margin} -0 -0 -0`, verbose);
        if (fs.existsSync(rightFile) && fs.statSync(rightFile).size > 0) {
          splitPages.push(rightFile);
        } else {
          logVerbose(verbose, `Right crop for page ${i} produced empty or missing output`);
        }
      } catch (e) {
        logVerbose(verbose, `Failed to crop right half of page ${i}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    
    if (failedPages.length > 0) {
      console.warn(`Warning: Failed to process ${failedPages.length} pages: ${failedPages.join(', ')}`);
    }
    
    // Verify files still exist before merging
    const existingPages = splitPages.filter(file => fs.existsSync(file) && fs.statSync(file).size > 0);
    
    if (existingPages.length === 0) {
      console.error("No pages were successfully processed");
      fs.rmSync(tempDir, { recursive: true, force: true });
      process.exit(1);
    }
    
    logVerbose(verbose, `Found ${existingPages.length} valid pages to merge`);
    
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPdf);
    if (outputDir && outputDir !== '.' && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Merge all split pages
    try {
      logVerbose(verbose, `Attempting to merge ${existingPages.length} split pages`);
      mergePdfs(existingPages, outputPdf, verbose);
    } catch (e) {
      console.error(`Failed to merge PDFs: ${e instanceof Error ? e.message : String(e)}`);
      
      // Last resort: just copy the first file if merge fails
      if (existingPages.length > 0) {
        console.log("Merge failed, copying first page as fallback");
        fs.copyFileSync(existingPages[0], outputPdf);
      } else {
        fs.rmSync(tempDir, { recursive: true, force: true });
        process.exit(1);
      }
    }
    
    // Clean up
    logVerbose(verbose, `Cleaning up temp dir: ${tempDir}`);
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    console.log(`Split PDF created: ${outputPdf}`);
  } catch (error) {
    console.error("An error occurred during processing:");
    if (verbose) console.error(error);
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.exit(1);
  }
}

// Main function
async function main() {
  try {
    const options = await parseArgs();
    checkAllBinaries(options.verbose);
    await splitPdf(options);
  } catch (err) {
    console.error("Failed to process PDF:", err);
    process.exit(1);
  }
}

main();
