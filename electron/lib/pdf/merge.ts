import fs from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

/**
 * Merge invoice PDF with backup files (PDFs and images)
 * @param invoicePath Path to the invoice PDF
 * @param backupPaths Array of paths to backup files (PDFs or images)
 * @param outputPath Path where the merged PDF should be saved
 */
export async function mergeInvoiceWithBackups(
    invoicePath: string,
    backupPaths: string[],
    outputPath: string
): Promise<void> {
    // Load the invoice PDF
    const invoiceBytes = await fs.readFile(invoicePath);
    const pdfDoc = await PDFDocument.load(invoiceBytes);

    // Process each backup file
    for (const backupPath of backupPaths) {
        const ext = path.extname(backupPath).toLowerCase();

        if (ext === '.pdf') {
            // Merge PDF pages
            try {
                const backupBytes = await fs.readFile(backupPath);
                const backupDoc = await PDFDocument.load(backupBytes);
                const pages = await pdfDoc.copyPages(backupDoc, backupDoc.getPageIndices());
                pages.forEach((page) => pdfDoc.addPage(page));
            } catch (error) {
                console.warn(`Failed to merge PDF ${backupPath}:`, error);
                // Continue with other files
            }
        } else if (['.png', '.jpg', '.jpeg'].includes(ext)) {
            // Embed image as a new page
            try {
                const imageBytes = await fs.readFile(backupPath);
                let image;

                if (ext === '.png') {
                    image = await pdfDoc.embedPng(imageBytes);
                } else {
                    image = await pdfDoc.embedJpg(imageBytes);
                }

                // Create a new page with A4 dimensions (595 x 842 points)
                const page = pdfDoc.addPage([595, 842]);
                const { width: pageWidth, height: pageHeight } = page.getSize();

                // Calculate scaling to fit image on page while maintaining aspect ratio
                const imageAspect = image.width / image.height;
                const pageAspect = pageWidth / pageHeight;

                let drawWidth: number;
                let drawHeight: number;

                if (imageAspect > pageAspect) {
                    // Image is wider relative to page
                    drawWidth = pageWidth * 0.9; // 90% of page width with margin
                    drawHeight = drawWidth / imageAspect;
                } else {
                    // Image is taller relative to page
                    drawHeight = pageHeight * 0.9; // 90% of page height with margin
                    drawWidth = drawHeight * imageAspect;
                }

                // Center the image on the page
                const x = (pageWidth - drawWidth) / 2;
                const y = (pageHeight - drawHeight) / 2;

                page.drawImage(image, {
                    x,
                    y,
                    width: drawWidth,
                    height: drawHeight,
                });
            } catch (error) {
                console.warn(`Failed to embed image ${backupPath}:`, error);
                // Continue with other files
            }
        }
    }

    // Save the merged PDF
    const mergedBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, mergedBytes);
}

