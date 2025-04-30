import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Options for PDF creation
 */
export interface TextToPdfOptions {
  /** Width of the page in points (default: 612 - letter width) */
  width?: number;
  /** Height of the page in points (default: 792 - letter height) */
  height?: number;
  /** Font size in points (default: 12) */
  fontSize?: number;
  /** Line height multiplier (default: 1.2) */
  lineHeight?: number;
  /** Margin in points (default: 72 - 1 inch) */
  margin?: number;
}

/**
 * Converts text to a PDF document
 * @param text - Text to convert to PDF
 * @param options - PDF creation options
 * @returns Buffer containing the PDF document
 */
export async function textToPdf(text: string, options?: TextToPdfOptions): Promise<Buffer> {
  // Set default options
  const {
    width = 612, // Letter width (8.5 inches)
    height = 792, // Letter height (11 inches)
    fontSize = 12,
    lineHeight = 1.2,
    margin = 72, // 1 inch margin
  } = options || {};

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // Embed the font (use Times-Roman which has better Unicode support than Helvetica)
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // Calculate text layout parameters
  const effectiveWidth = width - 2 * margin;
  const lineHeightInPoints = fontSize * lineHeight;
  const linesPerPage = Math.floor((height - 2 * margin) / lineHeightInPoints);

  // Handle newlines and split text into lines that fit within the page width
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    // If paragraph is empty, add an empty line
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }

    const words = paragraph.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      // Skip empty words
      if (word === '') continue;

      try {
        // Try to measure the line width
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testLineWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testLineWidth <= effectiveWidth) {
          currentLine = testLine;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      } catch (error) {
        // If we can't measure the width (e.g., due to unsupported characters),
        // just add the word to the current line and hope for the best
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    // Add the last line if it's not empty
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  // If no text, create an empty page
  if (lines.length === 0) {
    const page = pdfDoc.addPage([width, height]);
    // No text to add
  } else {
    // Split lines into pages
    for (let i = 0; i < lines.length; i += linesPerPage) {
      const pageLines = lines.slice(i, i + linesPerPage);
      const page = pdfDoc.addPage([width, height]);

      // Add text to the page
      for (let j = 0; j < pageLines.length; j++) {
        const line = pageLines[j];
        const y = height - margin - j * lineHeightInPoints;

        try {
          page.drawText(line, {
            x: margin,
            y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
        } catch (error) {
          // If we can't draw the text (e.g., due to unsupported characters),
          // try to draw each character individually
          let xPos = margin;
          for (const char of line) {
            try {
              const charWidth = font.widthOfTextAtSize(char, fontSize);
              page.drawText(char, {
                x: xPos,
                y,
                size: fontSize,
                font,
                color: rgb(0, 0, 0),
              });
              xPos += charWidth;
            } catch (charError) {
              // Skip characters that can't be drawn
              xPos += fontSize / 2; // Approximate width for skipped character
            }
          }
        }
      }
    }
  }

  // Save the PDF to a buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
