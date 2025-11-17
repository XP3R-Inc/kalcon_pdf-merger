# Installation Guide

## Prerequisites

Before installing Invoice Merger, ensure you have:

- **Node.js** version 20.0.0 or higher
- **npm** (comes with Node.js)
- **Windows 10/11** (for .exe packaging)
- **Git** (optional, for cloning repository)

### Checking Prerequisites

```bash
# Check Node.js version
node --version
# Should output: v20.x.x or higher

# Check npm version
npm --version
# Should output: 10.x.x or higher
```

## Installation Steps

### Option 1: From Source (Recommended for Development)

1. **Clone or download the repository:**
   ```bash
   cd /path/to/your/projects
   # If using git:
   git clone <repository-url> invoice-merger
   cd invoice-merger
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   
   This will install all required packages (may take 2-5 minutes).

3. **Verify installation:**
   ```bash
   # Run tests
   npm test
   
   # Start development mode
   npm run dev
   ```

### Option 2: Build Windows Executable

1. **Follow steps 1-2 from Option 1**

2. **Build the Next.js renderer:**
   ```bash
   npm run build:renderer
   ```

3. **Package the Windows executable:**
   ```bash
   npm run make
   ```
   
   The installer will be created at:
   ```
   out/make/squirrel.windows/x64/InvoiceMergerSetup.exe
   ```

4. **Run the installer:**
   - Navigate to the output directory
   - Double-click `InvoiceMergerSetup.exe`
   - Follow the installation wizard

### Option 3: Docker (CLI Only)

1. **Ensure Docker is installed:**
   ```bash
   docker --version
   ```

2. **Build the Docker image:**
   ```bash
   cd /path/to/invoice-merger
   docker build -t invoice-merger:latest .
   ```

3. **Run the CLI:**
   ```bash
   docker run --rm invoice-merger:latest --help
   ```

## Post-Installation Setup

### Development Environment

After installation, you can run the application in development mode:

```bash
npm run dev
```

This starts:
- Next.js dev server on http://localhost:3000
- Electron desktop application
- Hot module reload for fast development

### CLI Setup

To use the CLI globally (optional):

```bash
# Link the CLI locally
npm link

# Now you can run:
invoice-merger --help
```

Or use via npm:

```bash
npm run cli -- <command> <options>
```

## Verification

### Test the GUI

1. Start the application:
   ```bash
   npm run dev
   ```

2. You should see:
   - Terminal shows both Next.js and Electron starting
   - Electron window opens with the Invoice Merger interface
   - No errors in console

### Test the CLI

```bash
# Show help
npm run cli -- --help

# Should display available commands
```

### Test Docker (if installed)

```bash
# Run help command
docker run --rm invoice-merger:latest --help

# Should display CLI usage
```

## Troubleshooting

### Issue: `npm install` fails

**Solution:**
- Ensure Node.js 20+ is installed
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then retry
- Check internet connection
- Try with `--legacy-peer-deps` flag: `npm install --legacy-peer-deps`

### Issue: Electron won't start

**Solution:**
- Rebuild Electron: `npm run postinstall` or `npx electron-rebuild`
- Check for port conflicts (3000 for Next.js)
- Check antivirus settings (may block Electron)

### Issue: TypeScript errors

**Solution:**
- Ensure TypeScript is installed: `npm install -D typescript`
- Regenerate types: `npx tsc --noEmit`

### Issue: Build fails

**Solution:**
- Run builds separately to identify issue:
  ```bash
  npm run build:renderer  # Test Next.js build
  npm run build:electron  # Test Electron build
  ```
- Check for disk space
- Close other applications to free memory

### Issue: Docker build fails

**Solution:**
- Ensure Docker daemon is running
- Check Docker resources (needs ~2GB RAM)
- Try building with `--no-cache`: `docker build --no-cache -t invoice-merger .`

### Issue: Windows .exe won't run after packaging

**Solution:**
- Run as administrator
- Check Windows Defender/antivirus
- Ensure .NET Framework 4.5+ is installed (required by Squirrel)
- Check Windows Event Viewer for errors

### Issue: Native modules fail to load

**Solution:**
- Rebuild native modules:
  ```bash
  npm rebuild
  npx electron-rebuild
  ```

## Updating

To update to a newer version:

```bash
# Pull latest changes (if using git)
git pull

# Update dependencies
npm install

# Rebuild if needed
npm run build:renderer
```

## Uninstalling

### From Source

Simply delete the project directory:

```bash
rm -rf /path/to/invoice-merger
```

### Windows Executable

1. Open "Add or Remove Programs" (Windows Settings)
2. Search for "Invoice Merger"
3. Click "Uninstall"

### Docker

Remove the Docker image:

```bash
docker rmi invoice-merger:latest
```

## System Requirements

### Minimum:
- **OS**: Windows 10, macOS 10.13+, or Linux (Ubuntu 18.04+)
- **RAM**: 4GB
- **Disk**: 500MB for application + space for data
- **CPU**: 2 cores

### Recommended:
- **OS**: Windows 11, macOS 13+, or Linux (Ubuntu 22.04+)
- **RAM**: 8GB+
- **Disk**: 2GB+ (for larger PDF operations)
- **CPU**: 4+ cores
- **SSD**: For faster file operations

## Additional Tools (Optional)

### VSCode Setup

If developing, install recommended extensions:

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
```

### Make (Windows)

To use `Makefile` on Windows:

1. Install via Chocolatey:
   ```bash
   choco install make
   ```

2. Or use via WSL (Windows Subsystem for Linux)

3. Or run npm scripts directly instead of make commands

## Support

For installation issues:

1. Check this guide
2. Review error messages carefully
3. Search GitHub issues (if available)
4. Check system requirements
5. Try clean installation (delete and reinstall)

## Next Steps

After successful installation:

1. Read [QUICKSTART.md](QUICKSTART.md) for usage instructions
2. Read [README.md](README.md) for detailed feature documentation
3. Review [test-data/README.md](test-data/README.md) for example folder structure
4. Try the development mode: `npm run dev`

---

**Installation complete!** 🎉

You're ready to use Invoice Merger.

