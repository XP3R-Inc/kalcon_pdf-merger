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
 * Default template
 */
export const DEFAULT_FILENAME_TEMPLATE = '{month} - {invoiceName} + Backup';

