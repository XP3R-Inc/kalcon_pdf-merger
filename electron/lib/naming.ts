import fs from 'fs/promises';
import path from 'path';
import { formatFilename } from './filenameFormatter';

/**
 * Generate output path with automatic numeric suffix to avoid overwriting
 * Format: MM-YY - {InvoiceName} + Backup.pdf
 * If exists, append (1), (2), etc.
 */
export function generateOutputPath(
    outputDir: string,
    month: string,
    invoiceName: string
): string {
    const baseName = `${month} - ${invoiceName} + Backup.pdf`;
    const basePath = path.join(outputDir, baseName);

    return basePath;
}

/**
 * Get a unique output path by checking existence and adding numeric suffix
 * Supports custom filename templates
 */
export async function getUniqueOutputPath(
    outputDir: string,
    month: string,
    invoiceName: string,
    clientName?: string,
    fiscalYear?: string,
    template?: string
): Promise<string> {
    let baseName: string;

    if (template && clientName && fiscalYear) {
        // Use custom template
        baseName = formatFilename(template, {
            month,
            invoiceName,
            clientName,
            fiscalYear,
        });
    } else {
        // Use default template
        baseName = `${month} - ${invoiceName} + Backup`;
    }

    const ext = '.pdf';

    let outputPath = path.join(outputDir, `${baseName}${ext}`);
    let counter = 1;
    let pathAvailable = false;

    while (!pathAvailable) {
        try {
            await fs.access(outputPath);
            outputPath = path.join(outputDir, `${baseName} (${counter})${ext}`);
            counter++;
        } catch {
            pathAvailable = true;
        }
    }

    return outputPath;
}

