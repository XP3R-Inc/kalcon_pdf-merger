# Creating a Windows Icon for Invoice Merger

The application needs a Windows .ico file for the installer and executable.

## Option 1: Use an Online Tool (Recommended)

1. Go to https://www.icoconverter.com/ or https://converticon.com/
2. Upload a PNG image with Kalcon branding (ideally 256x256 or 512x512)
3. Download the .ico file
4. Save it as `assets/icon.ico`

## Option 2: Use ImageMagick (if installed)

```bash
# Create a simple icon from a PNG
magick convert kalcon-logo.png -resize 256x256 assets/icon.ico
```

## Option 3: Create with GIMP

1. Create a 256x256 image with your Kalcon logo
2. Export as .ico format
3. Save to `assets/icon.ico`

## Temporary Workaround

For now, I'll create a minimal valid .ico file programmatically.

## After Creating Icon

The icon paths are already configured in `forge.config.ts`:
- `icon: './assets/icon'` - For app icon (without extension)
- `setupIcon: './assets/icon.ico'` - For installer

The build will automatically use these icons once created.

