import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function generateSimplePdf() {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // Page 1
  const page1 = pdfDoc.addPage();
  const { width, height } = page1.getSize();
  page1.drawText('This is a simple PDF - Page 1', {
    x: 50,
    y: height - 50,
    size: 24,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  // Page 2
  const page2 = pdfDoc.addPage();
  page2.drawText('This is a simple PDF - Page 2', {
    x: 50,
    y: height - 50,
    size: 24,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  // Page 3
  const page3 = pdfDoc.addPage();
  page3.drawText('This is a simple PDF - Page 3', {
    x: 50,
    y: height - 50,
    size: 24,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(path.join(__dirname, '../fixtures/simple.pdf'), pdfBytes);
  console.log('Generated simple.pdf');
}

async function generateComplexPdf() {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // Page 1 - Text with different sizes
  const page1 = pdfDoc.addPage();
  const { width, height } = page1.getSize();
  page1.drawText('Complex PDF - Page 1', {
    x: 50,
    y: height - 50,
    size: 24,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });
  page1.drawText('This page contains text of different sizes and positions.', {
    x: 50,
    y: height - 100,
    size: 12,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });
  page1.drawText('Small text example', {
    x: 50,
    y: height - 150,
    size: 8,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });
  page1.drawText('Large text example', {
    x: 50,
    y: height - 200,
    size: 18,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  // Page 2 - Text with different colors
  const page2 = pdfDoc.addPage();
  page2.drawText('Complex PDF - Page 2', {
    x: 50,
    y: height - 50,
    size: 24,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });
  page2.drawText('This page contains text of different colors.', {
    x: 50,
    y: height - 100,
    size: 12,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });
  page2.drawText('Red text', {
    x: 50,
    y: height - 150,
    size: 12,
    font: timesRomanFont,
    color: rgb(1, 0, 0),
  });
  page2.drawText('Blue text', {
    x: 50,
    y: height - 200,
    size: 12,
    font: timesRomanFont,
    color: rgb(0, 0, 1),
  });
  page2.drawText('Green text', {
    x: 50,
    y: height - 250,
    size: 12,
    font: timesRomanFont,
    color: rgb(0, 1, 0),
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(path.join(__dirname, '../fixtures/complex.pdf'), pdfBytes);
  console.log('Generated complex.pdf');
}

async function generateSinglePagePdf() {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  page.drawText('This is a single page PDF', {
    x: 50,
    y: height - 50,
    size: 24,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });
  page.drawText('It contains only one page with some text.', {
    x: 50,
    y: height - 100,
    size: 12,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(path.join(__dirname, '../fixtures/single-page.pdf'), pdfBytes);
  console.log('Generated single-page.pdf');
}

async function generateInvalidPdf() {
  // Create an invalid PDF by writing random bytes
  const invalidBytes = Buffer.from('This is not a valid PDF file', 'utf-8');
  fs.writeFileSync(path.join(__dirname, '../fixtures/invalid.pdf'), invalidBytes);
  console.log('Generated invalid.pdf');
}

async function main() {
  // Create fixtures directory if it doesn't exist
  const fixturesDir = path.join(__dirname, '../fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  // Create scripts directory if it doesn't exist
  const scriptsDir = path.join(__dirname, '../scripts');
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
  }

  await generateSimplePdf();
  await generateComplexPdf();
  await generateSinglePagePdf();
  await generateInvalidPdf();

  console.log('All test fixtures generated successfully!');
}

main().catch(console.error);
