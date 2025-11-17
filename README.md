# Invoice Merger

A local desktop tool that merges client invoice PDFs with supporting expense backup files into a single PDF document. Features both a GUI (Electron + Next.js) and CLI for automation.

## Features

- **Folder-First Discovery**: Automatically finds clients and periods based on your directory structure
- **Batch Processing**: Merge multiple clients at once
- **Flexible Selection**: Choose which backups to include, select specific invoices when multiple exist
- **Format Support**: Handles PDF, PNG, JPG, and JPEG files
- **Multiple Output Modes**: Save to client folders or a custom directory
- **CLI Support**: Automate merges via command line or Docker
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Expected Folder Structure

```
BASE_FOLDER/
  CLIENT_NAME/
    Invoices/
      FYXX/
        MM-YY/
          Invoice/
            invoice.pdf
          Expense Backup/
            backup1.pdf
            backup2.jpg
            subfolder/
              backup3.pdf
```

## Installation

### Desktop App

#### From Source

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build Windows executable
npm run make
```

The Windows installer will be in `out/make/squirrel.windows/x64/`.

### CLI

#### From Source

```bash
npm install
npm run cli -- scan --base /path/to/base/folder
```

#### Docker

```bash
# Build image
docker build -t invoice-merger .

# Scan for clients
docker run --rm -v "/path/to/data:/data" invoice-merger scan --base /data

# Merge for a specific client
docker run --rm \
  -v "/path/to/data:/data" \
  -v "/path/to/output:/out" \
  invoice-merger merge \
    --base /data \
    --client "Acme Corp" \
    --fy 25 \
    --month 04-25 \
    --out /out
```

## Usage

### Desktop GUI

1. **Select Base Folder**: Choose the root directory containing client folders
2. **Select Period**: Pick fiscal year and month to filter clients
3. **Select Clients**: Choose which clients to process (batch selection supported)
4. **Review & Merge**: Confirm settings and run the merge

### CLI

#### Scan for Clients

```bash
# Scan all clients
npm run cli -- scan --base /path/to/base

# Filter by period
npm run cli -- scan --base /path/to/base --fy 25 --month 04-25

# JSON output
npm run cli -- scan --base /path/to/base --json
```

#### Merge Invoice + Backups

```bash
# Merge to client's Invoice folder
npm run cli -- merge \
  --base /path/to/base \
  --client "Acme Corp" \
  --fy 25 \
  --month 04-25

# Merge to custom output directory
npm run cli -- merge \
  --base /path/to/base \
  --client "Acme Corp" \
  --fy 25 \
  --month 04-25 \
  --out /path/to/output

# With filters
npm run cli -- merge \
  --base /path/to/base \
  --client "Acme" \
  --fy 25 \
  --month 04-25 \
  --expense-filter "receipt"

# JSON output
npm run cli -- merge \
  --base /path/to/base \
  --client "Acme Corp" \
  --fy 25 \
  --month 04-25 \
  --json
```

#### Exit Codes

- `0`: Success
- `2`: Invalid input
- `3`: Client or invoice not found
- `4`: Merge failure

## Makefile Commands

```bash
make dev              # Run development server
make build-renderer   # Build Next.js static export
make package-win      # Build Windows .exe
make docker-build     # Build Docker image
make docker-run       # Run Docker example
make cli              # Run CLI with ARGS="scan --base /path"
make test             # Run tests
make clean            # Clean build artifacts
```

## Output Format

Merged PDFs are named: `MM-YY - InvoiceName + Backup.pdf`

If a file with this name exists, a numeric suffix is added: `MM-YY - InvoiceName + Backup (1).pdf`

## How It Works

1. **Discovery**: Scans base folder for client directories following the expected structure
2. **Invoice Selection**: Automatically selects the newest PDF in the Invoice folder, or lets you choose from multiple candidates
3. **Backup Collection**: Recursively finds all PDFs and images in the Expense Backup folder and subfolders
4. **Merging**: Uses `pdf-lib` to:
   - Copy invoice pages first
   - Append PDF backup pages
   - Convert images to PDF pages (maintaining aspect ratio on A4/Letter size)
5. **Output**: Saves merged PDF with automatic naming and conflict resolution

## Technology Stack

- **Electron 31+**: Desktop app framework
- **Next.js 14+**: React-based UI with App Router
- **TypeScript**: Type-safe development
- **pdf-lib**: PDF manipulation without external dependencies
- **electron-forge**: Packaging and distribution
- **Tailwind CSS**: Modern styling
- **Commander**: CLI argument parsing
- **Zod**: Runtime validation

## Development

```bash
# Install dependencies
npm install

# Run development mode (hot reload)
npm run dev

# Run tests
npm test

# Build production app
npm run build

# Package for distribution
npm run make
```

## Security & Privacy

- **Local-only**: All processing happens on your machine
- **No uploads**: Files never leave your computer
- **No database**: Uses folder structure only
- **Session-only state**: Selections are not persisted

## License

MIT

## Support

For issues, feature requests, or questions, please open an issue on GitHub.

