import path from 'path';
import { describe, it, expect } from 'vitest';
import { generateOutputPath } from '../naming';

describe('generateOutputPath', () => {
    it('should generate correct output path format', () => {
        const outputDir = '/path/to/output';
        const month = '04-25';
        const invoiceName = 'ClientInvoice';

        const result = generateOutputPath(outputDir, month, invoiceName);

        const expected = path.join(outputDir, '04-25 - ClientInvoice + Backup.pdf');
        expect(result).toBe(expected);
    });

    it('should handle invoice names with spaces', () => {
        const outputDir = '/path/to/output';
        const month = '12-24';
        const invoiceName = 'Client Invoice 2024';

        const result = generateOutputPath(outputDir, month, invoiceName);

        const expected = path.join(outputDir, '12-24 - Client Invoice 2024 + Backup.pdf');
        expect(result).toBe(expected);
    });

    it('should handle different month formats', () => {
        const outputDir = '/output';
        const month = '01-26';
        const invoiceName = 'Test';

        const result = generateOutputPath(outputDir, month, invoiceName);

        const expected = path.join(outputDir, '01-26 - Test + Backup.pdf');
        expect(result).toBe(expected);
    });
});

