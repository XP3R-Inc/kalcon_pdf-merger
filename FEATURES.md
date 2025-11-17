# Invoice Merger - Complete Feature List

## 🎨 Kalcon Branding

### Brand Integration
- **Custom Header**: Kalcon logo (KAL + CON) in brand colors
- **Color Scheme**: 
  - Primary: #2596be (Kalcon Blue)
  - Secondary: #38435f (Dark Blue-Gray)  
  - Accent: #00b2c8 (Cyan)
- **Gradient Backgrounds**: All UI elements use Kalcon colors
- **Powered by XP3R Inc.**: Brand attribution in header

## 📋 Core Features

### 1. Folder-First Discovery
- Automatic scanning based on directory structure
- Pattern: `BASE/CLIENT/Invoices/FYXX/MM-YY/Invoice` and `.../Expense Backup`
- Recursive subfolder support
- Newest invoice auto-selection
- Support for PDF, PNG, JPG, JPEG files

### 2. Multi-Step Workflow

#### Step 1: Base Folder Selection
- Native folder picker integration
- Manual path entry option
- Collapsible folder structure guide
- Feature showcase grid
- Real-time validation

#### Step 2: Period Selection
- Fiscal year dropdown (FY25, FY24, etc.)
- Month dropdown (04-25, 05-25, etc.)
- Live client preview as you select
- Summary table with invoice/backup counts
- Visual badges for found/missing invoices

#### Step 3: Client Selection
- **Advanced Filters:**
  - Client name filter
  - Invoice filename filter
  - Expense filename filter
  - Show/hide clients without invoices
- **Batch Operations:**
  - Select All / Deselect All
  - Checkbox column for quick selection
  - Visual selection counter
- **Per-Client Configuration:**
  - Multiple invoice dropdown (when multiple PDFs exist)
  - Configure button opens detailed sidebar
  - Shows selected backup count (X / Y)

#### Step 4: Merge Configuration
- **Output Mode Selection:**
  - Save to each client's Invoice folder (recommended)
  - Save all to custom folder
- **Filename Customization:**
  - Custom template editor
  - Available placeholders: {month}, {invoiceName}, {client}, {fy}, {monthNum}, {year}
  - Quick template presets (5 options)
  - Live preview with example data
  - Real-time validation
  - Per-client filename preview in table
- **Merge Execution:**
  - Animated progress bar
  - Percentage indicator
  - Success/failure summary cards
  - Detailed results table

### 3. Advanced Backup Selection (Sidebar)

#### Directory Tree View
- **True Hierarchical Display:**
  - Shows actual subfolder structure
  - Nested indentation for subfolders
  - Expandable/collapsible nodes
  - Visual border lines connecting nodes

#### Folder-Level Selection
- **Click folder** → Selects/deselects ALL files in that folder and subfolders
- **Indeterminate checkboxes** → Shows partial selection
- **Color-coded borders:**
  - Cyan (#00b2c8) = All files selected
  - Blue (#2596be) = Some files selected
  - Gray = No files selected

#### File-Level Selection
- Expand folders to see individual files
- File type icons (PDF red, PNG blue, JPG green)
- File size and extension displayed
- Individual checkboxes for granular control

#### Visual Feedback
- Selection count per folder (X / Y selected)
- PDF vs Image breakdown
- Status hints under each folder
- Smart default: Root folder expanded by default

### 4. Filename Customization

#### Template System
- **Placeholders:**
  - `{month}` → 04-25
  - `{invoiceName}` → ClientInvoice
  - `{client}` → Acme Corp
  - `{fy}` → 25
  - `{monthNum}` → 04
  - `{year}` → 25

#### Quick Templates
1. **Default**: `{month} - {invoiceName} + Backup`
2. **Client First**: `{client} - {month} - {invoiceName}`
3. **Date First**: `{year}-{monthNum} - {client} - Invoice+Backup`
4. **Simple**: `{invoiceName} - Backup`
5. **Detailed**: `{client} - FY{fy} - {month} - {invoiceName} + Expenses`

#### Features
- Live preview with example data
- Real-time validation
- Per-client preview in merge table
- Automatic conflict resolution (numeric suffixes)

### 5. PDF Merging Engine

#### Capabilities
- Pure Node.js (pdf-lib)
- No external dependencies
- PDF page copying with order preservation
- Image embedding (PNG, JPG, JPEG)
- Aspect ratio maintenance
- Centered on A4/Letter pages

#### Process
1. Load invoice PDF
2. Copy invoice pages
3. Process each backup:
   - PDF: Copy all pages
   - Image: Embed as new page
4. Save with custom filename

### 6. Error Handling

#### Graceful Failures
- Descriptive error messages
- Per-client error isolation
- Missing folder handling
- Unreadable file warnings
- Invalid input validation

#### User Feedback
- Toast notifications (success/error/info)
- Auto-dismiss with timer
- Inline error messages
- Status badges throughout

### 7. CLI Tool

#### Commands
```bash
# Scan for clients
invoice-merger scan --base <path> [--fy <YY>] [--month <MM-YY>] [--json]

# Merge with options
invoice-merger merge \
  --base <path> \
  --client <name> \
  --fy <YY> \
  --month <MM-YY> \
  [--out <dir>] \
  [--client-filter <filter>] \
  [--invoice-filter <filter>] \
  [--expense-filter <filter>] \
  [--json]
```

#### Features
- JSON output mode
- Exit codes (0=success, 2=invalid, 3=not found, 4=failure)
- Filter support (text or regex)
- Automation-friendly

### 8. Docker Support

#### Container Usage
```bash
# Build
docker build -t invoice-merger .

# Run
docker run --rm \
  -v /data:/data \
  -v /out:/out \
  invoice-merger \
  merge --base /data --client "Acme" --fy 25 --month 04-25 --out /out
```

#### Features
- Multi-stage build
- Optimized Alpine image
- Volume mounts for data
- Headless CLI operation

### 9. Packaging & Distribution

#### Windows Executable
- electron-forge with Squirrel.Windows
- Creates `.exe` installer
- Auto-update support
- ASAR packaging

#### Build Commands
```bash
npm run build:renderer   # Build Next.js
npm run make             # Package Windows .exe
```

## 🎯 User Experience Features

### Visual Design
- **Modern Gradient Theme**: Purple-to-blue Kalcon colors
- **Professional Typography**: Clear hierarchy
- **Smooth Animations**: All transitions animated
- **Responsive Layout**: Adapts to window size
- **Custom Scrollbars**: Matching brand colors

### Navigation
- **Step Indicator**: Visual progress through workflow
- **Breadcrumb Navigation**: Back buttons on every page
- **Session Persistence**: Remembers selections
- **Keyboard Accessible**: Tab navigation support

### Feedback & Guidance
- **Loading States**: Spinners with descriptive messages
- **Empty States**: Helpful messages when no data
- **Tooltips**: Contextual help throughout
- **Validation**: Real-time input validation
- **Notifications**: Toast-style success/error messages

### Smart Defaults
- Auto-select clients with invoices
- Auto-select all backup files initially
- Root folder expanded by default
- Client folder output mode selected
- Default filename template pre-filled

## 🔧 Advanced Capabilities

### Filtering System
- **Client Filter**: Text or regex matching
- **Invoice Filter**: Filename pattern matching
- **Expense Filter**: Backup file filtering
- **Show All Toggle**: Include clients without invoices

### Batch Processing
- Select multiple clients
- Bulk select/deselect operations
- Progress tracking for each client
- Summary reporting

### File Management
- **Multiple Invoice Selection**: Dropdown when multiple PDFs exist
- **Subfolder Organization**: True directory tree
- **Granular Control**: Select folders or individual files
- **Visual Hierarchy**: Clear parent-child relationships

### Output Options
- **Two Modes**: Client folder or custom folder
- **Custom Templates**: Full filename control
- **Conflict Resolution**: Automatic numeric suffixes
- **Preview**: See output names before merging

## 🔒 Security & Privacy

### Local Processing
- All operations happen locally
- No network communication
- No data uploads
- No persistent storage

### Secure Architecture
- Context isolation in Electron
- Validated IPC payloads (Zod)
- Sandboxed renderer process
- Read-only file access where possible

## 📱 Cross-Platform

### Supported Platforms
- Windows 10/11 (primary)
- macOS (compatible)
- Linux (compatible)
- Docker (any platform)

### Platform Features
- Native file picker dialogs
- OS-specific keyboard shortcuts
- Platform-appropriate styling

## 🧪 Testing & Quality

### Test Coverage
- Unit tests (Vitest)
- Filename formatting tests
- Path generation tests
- Validation tests

### Code Quality
- TypeScript throughout
- ESLint configuration
- Strict type checking
- Comprehensive error handling

## 📚 Documentation

### User Guides
- README.md - Complete user guide
- QUICKSTART.md - Step-by-step workflows
- INSTALL.md - Installation instructions
- FEATURES.md - This file

### Developer Docs
- Inline code comments
- TypeScript type definitions
- API documentation
- Architecture overview

## 🚀 Build & Development

### Makefile Targets
- `make dev` - Development mode
- `make build-renderer` - Build Next.js
- `make package-win` - Build Windows .exe
- `make docker-build` - Build Docker image
- `make cli` - Run CLI
- `make test` - Run tests
- `make clean` - Clean artifacts

### Development Features
- Hot module reload
- TypeScript compilation
- ESLint integration
- Tailwind CSS with JIT

## 💡 Unique Selling Points

1. **No Spreadsheets**: Folder-first approach
2. **No Database**: File system is the source of truth
3. **Batch Processing**: Handle dozens of clients at once
4. **Flexible**: CLI, GUI, and Docker support
5. **Customizable**: Template-based filename generation
6. **Professional**: Enterprise-ready with Kalcon branding
7. **Fast**: Optimized scanning and merging
8. **Reliable**: Comprehensive error handling

## 📊 Performance

### Scalability
- Handles 100+ clients efficiently
- Recursive scanning optimized
- Memory-efficient PDF processing
- Fast file system operations

### Resource Usage
- Low memory footprint
- Minimal CPU usage
- Efficient disk I/O
- No background processes

---

**Version**: 1.0.0  
**Platform**: Electron 31 + Next.js 14  
**License**: MIT  
**Brand**: Kalcon (Powered by XP3R Inc.)

