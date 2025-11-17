# Invoice Merger - Quick Start Guide

## Installation

### Prerequisites

- Node.js 20+ installed
- npm or yarn package manager

### Setup Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run in development mode:**
   ```bash
   npm run dev
   ```
   
   This will start:
   - Next.js dev server on http://localhost:3000
   - Electron desktop app

3. **Build for production:**
   ```bash
   # Build Next.js renderer
   npm run build:renderer
   
   # Package Windows executable
   npm run make
   ```

## Usage Workflows

### Desktop GUI Workflow

1. **Launch Application**
   - In dev: `npm run dev`
   - In prod: Run the installed application

2. **Select Base Folder**
   - Click "Browse..." or enter path manually
   - Point to the root folder containing client directories

3. **Select Period**
   - Choose Fiscal Year (e.g., FY25)
   - Choose Month (e.g., 04-25)
   - Review found clients

4. **Select Clients**
   - Check/uncheck clients to process
   - Use "Select All" / "Deselect All" for batch operations
   - Toggle "Show all clients" to see clients without invoices

5. **Merge**
   - Choose output mode (client folder or custom folder)
   - Click "Merge" button
   - View results

### CLI Workflow

1. **Scan for available clients:**
   ```bash
   npm run cli -- scan --base /path/to/base/folder
   ```

2. **Merge a specific client:**
   ```bash
   npm run cli -- merge \
     --base /path/to/base/folder \
     --client "Client Name" \
     --fy 25 \
     --month 04-25
   ```

3. **Merge with custom output:**
   ```bash
   npm run cli -- merge \
     --base /path/to/base/folder \
     --client "Client Name" \
     --fy 25 \
     --month 04-25 \
     --out /path/to/output
   ```

### Docker Workflow

1. **Build image:**
   ```bash
   make docker-build
   ```

2. **Scan with Docker:**
   ```bash
   docker run --rm \
     -v "/path/to/data:/data" \
     invoice-merger:latest \
     scan --base /data --json
   ```

3. **Merge with Docker:**
   ```bash
   docker run --rm \
     -v "/path/to/data:/data" \
     -v "/path/to/output:/out" \
     invoice-merger:latest \
     merge \
       --base /data \
       --client "Client Name" \
       --fy 25 \
       --month 04-25 \
       --out /out
   ```

## Folder Structure Requirements

Your base folder must follow this structure:

```
BASE_FOLDER/
  CLIENT_NAME/
    Invoices/
      FYXX/           # Fiscal year (e.g., FY25)
        MM-YY/        # Month-Year (e.g., 04-25)
          Invoice/
            invoice.pdf
          Expense Backup/
            backup1.pdf
            backup2.jpg
            subfolder/
              backup3.pdf
```

## Output Format

Merged PDFs are named:
```
MM-YY - InvoiceName + Backup.pdf
```

If file exists, numeric suffix is added:
```
MM-YY - InvoiceName + Backup (1).pdf
MM-YY - InvoiceName + Backup (2).pdf
```

## Troubleshooting

### Desktop App Won't Start

- Ensure Node.js 20+ is installed
- Run `npm install` to install dependencies
- Check console for errors: `npm run dev`

### CLI Not Finding Clients

- Verify folder structure matches expected format
- Check fiscal year format: `FYXX` (e.g., `FY25`)
- Check month format: `MM-YY` (e.g., `04-25`)
- Use exact client name (case-sensitive)

### Merge Fails

- Ensure invoice PDF exists and is readable
- Check backup file permissions
- Verify output directory is writable
- Review error messages in console/results

### Docker Issues

- Ensure volumes are mounted correctly
- Use absolute paths for volumes
- Check file permissions in mounted volumes
- Windows: Use WSL2 paths or Windows paths with proper escaping

## Tips

1. **Batch Processing**: Select multiple clients in GUI for efficient processing
2. **Filters**: Use filters to narrow down clients/invoices/expenses
3. **Backup Selection**: Review backups before merging to exclude unwanted files
4. **Output Location**: Use custom folder when merging many clients for centralized output
5. **CLI Automation**: Create shell scripts for recurring merge operations
6. **Docker**: Useful for server environments or CI/CD pipelines

## Support

For issues or questions:
1. Check this guide and README.md
2. Review console logs for error messages
3. Verify folder structure matches requirements
4. Check file permissions and paths

