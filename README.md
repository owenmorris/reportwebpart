# Report Viewer (Modern) Web Part

## Summary

SSRS Report Viewer web part for modern SharePoint pages.

## Used SharePoint Framework Version

![version](https://img.shields.io/badge/version-1.4.1-green.svg)

## Applies to

- SharePoint Subscription Edition (on-premises)
- SharePoint Server 2019 (on-premises)

## Prerequisites

- Node.js version 8.x (use `nvm use 8` if using nvm)
- SharePoint Subscription Edition or SharePoint Server 2019
- App Catalog configured

## Building the Solution

This project uses SPFx 1.4.1 and includes a custom gulp task to fix manifest paths for `includeClientSideAssets` deployment.

### Build Steps

```bash
# Switch to Node 8
nvm use 8

# Install dependencies (first time only)
npm install

# Clean previous builds
gulp clean

# Build production bundle
gulp bundle --ship

# Fix manifest paths for on-premises deployment
gulp fix-manifests

# Package solution
gulp package-solution --ship
```

The `.sppkg` file will be created in `sharepoint/solution/reportwebpart.sppkg`

### Why the fix-manifests step?

SPFx 1.4.1 generates manifests with `dist/` path prefixes, but when `includeClientSideAssets: true`, the packaging process flattens files to the ClientSideAssets root. The `fix-manifests` task removes the `dist/` prefix to match the actual deployment structure.

## Deployment

1. Upload `sharepoint/solution/reportwebpart.sppkg` to your App Catalog
2. Deploy the solution
3. Add the web part to a modern page

## Version History

| Version | Date           | Comments                           |
| ------- | -------------- | ---------------------------------- |
| 1.0.7.0 | January 2026   | Auto-translate ReportViewer URLs   |
| 1.0.6.0 | January 2026   | Fixed manifest paths for on-prem   |
| 1.0.5.0 | January 2026   | Updated build configuration        |
| 1.0.4.0 | January 2026   | Version bump                       |

## Disclaimer

**THIS CODE IS PROVIDED _AS IS_ WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING ANY IMPLIED WARRANTIES OF FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABILITY, OR NON-INFRINGEMENT.**
