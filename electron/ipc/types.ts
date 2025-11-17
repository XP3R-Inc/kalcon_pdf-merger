import { z } from 'zod';

/**
 * File information for invoice/backup files
 */
export const FileInfoSchema = z.object({
    path: z.string(),
    name: z.string(),
    size: z.number(),
    modifiedTime: z.number(),
});

export type FileInfo = z.infer<typeof FileInfoSchema>;

/**
 * Client period data structure
 */
export const ClientPeriodSchema = z.object({
    clientName: z.string(),
    clientPath: z.string(),
    fiscalYear: z.string(),
    month: z.string(),
    invoicePath: z.string(),
    backupPath: z.string(),
    invoiceFile: FileInfoSchema.nullable(),
    backupFiles: z.array(FileInfoSchema),
});

export type ClientPeriod = z.infer<typeof ClientPeriodSchema>;

/**
 * Filters for scan operation
 */
export const FiltersSchema = z.object({
    clientFilter: z.string().optional(),
    invoiceFilter: z.string().optional(),
    expenseFilter: z.string().optional(),
}).optional();

export type Filters = z.infer<typeof FiltersSchema>;

/**
 * Scan request
 */
export const ScanRequestSchema = z.object({
    basePath: z.string(),
    fy: z.string().optional(),
    month: z.string().optional(),
    filters: FiltersSchema,
});

export type ScanRequest = z.infer<typeof ScanRequestSchema>;

/**
 * Scan response
 */
export const ScanResponseSchema = z.object({
    clients: z.array(ClientPeriodSchema),
});

export type ScanResponse = z.infer<typeof ScanResponseSchema>;

/**
 * Get invoice candidates request
 */
export const GetInvoiceCandidatesRequestSchema = z.object({
    clientPath: z.string(),
    fiscalYear: z.string(),
    month: z.string(),
});

export type GetInvoiceCandidatesRequest = z.infer<typeof GetInvoiceCandidatesRequestSchema>;

/**
 * Get invoice candidates response
 */
export const GetInvoiceCandidatesResponseSchema = z.object({
    candidates: z.array(FileInfoSchema),
});

export type GetInvoiceCandidatesResponse = z.infer<typeof GetInvoiceCandidatesResponseSchema>;

/**
 * Merge job specification
 */
export const MergeJobSchema = z.object({
    clientName: z.string(),
    clientPath: z.string(),
    fiscalYear: z.string(),
    month: z.string(),
    invoicePath: z.string(),
    backupPaths: z.array(z.string()),
    outputPath: z.string().optional(),
});

export type MergeJob = z.infer<typeof MergeJobSchema>;

/**
 * Merge result
 */
export const MergeResultSchema = z.object({
    clientName: z.string(),
    success: z.boolean(),
    outputPath: z.string().optional(),
    error: z.string().optional(),
});

export type MergeResult = z.infer<typeof MergeResultSchema>;

/**
 * Merge request
 */
export const MergeRequestSchema = z.object({
    jobs: z.array(MergeJobSchema),
    outputMode: z.enum(['client-folder', 'custom-folder']),
    customOutputPath: z.string().optional(),
    filenameTemplate: z.string().optional(),
});

export type MergeRequest = z.infer<typeof MergeRequestSchema>;

/**
 * Merge response
 */
export const MergeResponseSchema = z.object({
    results: z.array(MergeResultSchema),
});

export type MergeResponse = z.infer<typeof MergeResponseSchema>;

/**
 * IPC Channel definitions
 */
export const IPC_CHANNELS = {
    SCAN: 'scan',
    GET_INVOICE_CANDIDATES: 'get-invoice-candidates',
    MERGE: 'merge',
    PICK_OUTPUT_DIR: 'pick-output-dir',
} as const;

