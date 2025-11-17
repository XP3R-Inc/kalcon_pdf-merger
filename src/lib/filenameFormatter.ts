/**
 * Format filename template with actual values
 * 
 * Available placeholders:
 * - {month} - Month period (e.g., 04-25)
 * - {invoiceName} - Invoice filename without extension
 * - {client} - Client name
 * - {fy} - Fiscal year (e.g., 25)
 * - {year} - Year from month (e.g., 25)
 * - {monthNum} - Month number (e.g., 04)
 */
export function formatFilename(
    template: string,
    params: {
        month: string;
        invoiceName: string;
        clientName: string;
        fiscalYear: string;
    }
): string {
    const [monthNum, year] = params.month.split('-');

    let result = template
        .replace(/{month}/g, params.month)
        .replace(/{invoiceName}/g, params.invoiceName)
        .replace(/{client}/g, params.clientName)
        .replace(/{fy}/g, params.fiscalYear)
        .replace(/{year}/g, year || '')
        .replace(/{monthNum}/g, monthNum || '');

    // Clean up any invalid filename characters
    result = result.replace(/[<>:"|?*]/g, '_');

    return result;
}

/**
 * Get preview of formatted filename
 */
export function getFilenamePreview(template: string): string {
    return formatFilename(template, {
        month: '04-25',
        invoiceName: 'ClientInvoice',
        clientName: 'Acme Corp',
        fiscalYear: '25',
    });
}

/**
 * Validate filename template
 */
export function validateFilenameTemplate(template: string): { valid: boolean; error?: string } {
    if (!template || template.trim() === '') {
        return { valid: false, error: 'Filename template cannot be empty' };
    }

    // Check for invalid characters
    const invalidChars = /[<>:"|?*]/g;
    if (invalidChars.test(template.replace(/{[^}]+}/g, ''))) {
        return { valid: false, error: 'Template contains invalid filename characters' };
    }

    return { valid: true };
}

/**
 * Default template
 */
export const DEFAULT_FILENAME_TEMPLATE = '{month} - {invoiceName} + Backup';

/**
 * Common templates
 */
export const FILENAME_TEMPLATES = {
    default: '{month} - {invoiceName} + Backup',
    clientFirst: '{client} - {month} - {invoiceName}',
    dateFirst: '{year}-{monthNum} - {client} - Invoice+Backup',
    simple: '{invoiceName} - Backup',
    detailed: '{client} - FY{fy} - {month} - {invoiceName} + Expenses',
};

