#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import { scanForClients } from '../electron/lib/fs/discovery.js';
import { mergeInvoiceWithBackups } from '../electron/lib/pdf/merge.js';
import { getUniqueOutputPath } from '../electron/lib/naming.js';

const program = new Command();

program
    .name('invoice-merger')
    .description('CLI tool for merging client invoices with expense backup PDFs')
    .version('1.0.0');

program
    .command('merge')
    .description('Merge invoice with backups for a specific client and period')
    .requiredOption('--base <path>', 'Base directory path')
    .requiredOption('--client <name>', 'Client name')
    .requiredOption('--fy <year>', 'Fiscal year (e.g., 25 for FY25)')
    .requiredOption('--month <month>', 'Month in MM-YY format (e.g., 04-25)')
    .option('--out <path>', 'Custom output directory (default: client Invoice folder)')
    .option('--client-filter <filter>', 'Filter clients by name/regex')
    .option('--invoice-filter <filter>', 'Filter invoices by name/regex')
    .option('--expense-filter <filter>', 'Filter expenses by name/regex')
    .option('--json', 'Output results as JSON')
    .action(async (options) => {
        try {
            const { base, client, fy, month, out, json } = options;

            if (!json) {
                console.log(`Scanning for client: ${client} (FY${fy} ${month})`);
            }

            // Scan for the specific client
            const clients = await scanForClients({
                basePath: base,
                fy,
                month,
                filters: {
                    clientFilter: `^${client}$`, // Exact match
                    invoiceFilter: options['invoice-filter'],
                    expenseFilter: options['expense-filter'],
                },
            });

            if (clients.length === 0) {
                const error = `Client not found: ${client} (FY${fy} ${month})`;
                if (json) {
                    console.log(JSON.stringify({ success: false, error }));
                } else {
                    console.error(`Error: ${error}`);
                }
                process.exit(3);
            }

            const targetClient = clients[0];

            if (!targetClient.invoiceFile) {
                const error = `No invoice found for ${client}`;
                if (json) {
                    console.log(JSON.stringify({ success: false, error }));
                } else {
                    console.error(`Error: ${error}`);
                }
                process.exit(3);
            }

            // Determine output path
            const outputDir = out || path.dirname(targetClient.invoiceFile.path);
            const outputPath = await getUniqueOutputPath(
                outputDir,
                month,
                path.basename(targetClient.invoiceFile.path, '.pdf')
            );

            if (!json) {
                console.log(`Invoice: ${targetClient.invoiceFile.name}`);
                console.log(`Backups: ${targetClient.backupFiles.length} file(s)`);
                console.log(`Output: ${outputPath}`);
                console.log('Merging...');
            }

            // Perform merge
            await mergeInvoiceWithBackups(
                targetClient.invoiceFile.path,
                targetClient.backupFiles.map((f) => f.path),
                outputPath
            );

            if (json) {
                console.log(
                    JSON.stringify({
                        success: true,
                        client: client,
                        period: `FY${fy} ${month}`,
                        outputPath,
                        invoiceFile: targetClient.invoiceFile.name,
                        backupCount: targetClient.backupFiles.length,
                    })
                );
            } else {
                console.log('✓ Merge completed successfully!');
                console.log(`Output saved to: ${outputPath}`);
            }

            process.exit(0);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            if (options.json) {
                console.log(JSON.stringify({ success: false, error: errorMsg }));
            } else {
                console.error(`Error: ${errorMsg}`);
            }
            process.exit(4);
        }
    });

program
    .command('scan')
    .description('Scan and list available clients and periods')
    .requiredOption('--base <path>', 'Base directory path')
    .option('--fy <year>', 'Filter by fiscal year')
    .option('--month <month>', 'Filter by month (MM-YY)')
    .option('--json', 'Output results as JSON')
    .action(async (options) => {
        try {
            const { base, fy, month, json } = options;

            const clients = await scanForClients({
                basePath: base,
                fy,
                month,
            });

            if (json) {
                console.log(
                    JSON.stringify({
                        count: clients.length,
                        clients: clients.map((c) => ({
                            name: c.clientName,
                            fiscalYear: c.fiscalYear,
                            month: c.month,
                            hasInvoice: c.invoiceFile !== null,
                            backupCount: c.backupFiles.length,
                        })),
                    })
                );
            } else {
                console.log(`Found ${clients.length} client(s):\n`);
                clients.forEach((c) => {
                    console.log(`  ${c.clientName} - FY${c.fiscalYear} ${c.month}`);
                    console.log(`    Invoice: ${c.invoiceFile ? c.invoiceFile.name : 'N/A'}`);
                    console.log(`    Backups: ${c.backupFiles.length} file(s)`);
                });
            }

            process.exit(0);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            if (options.json) {
                console.log(JSON.stringify({ success: false, error: errorMsg }));
            } else {
                console.error(`Error: ${errorMsg}`);
            }
            process.exit(2);
        }
    });

program.parse();

