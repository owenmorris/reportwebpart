# SSRS Report Height Measurement Tool

Node.js script to automatically measure the rendered height of SSRS reports for configuring web part heights.

## Prerequisites

Install Puppeteer (headless Chrome):

```bash
npm install puppeteer
```

Or install globally:

```bash
npm install -g puppeteer
```

## Usage

### Option 1: Using a Text File (Recommended for Multiple Reports)

1. Create a text file with your report URLs (one per line):

```text
https://reportserver/ReportServer?/Sales/MonthlySummary
https://reportserver/ReportServer?/HR/EmployeeReport
https://reportserver/ReportServer?/Finance/QuarterlySummary
```

2. Run the script:

```bash
node measure-reports.js reports.txt
```

### Option 2: Command Line Arguments (Quick Testing)

Pass URLs directly as arguments:

```bash
node measure-reports.js "https://reportserver/ReportServer?/Sales/Monthly" "https://reportserver/ReportServer?/HR/Employees"
```

## Configuration

Edit the `CONFIG` object at the top of `measure-reports.js`:

```javascript
const CONFIG = {
  waitTime: 3000,        // Wait time after page load (ms)
  timeout: 30000,        // Page load timeout (ms)
  embedMode: true,       // Add rs:Embed=true
  hideToolbar: true,     // Add rc:Toolbar=false
  hideParameters: false, // Add rc:Parameters=false
  headless: true,        // Run in headless mode
  viewport: {
    width: 1024,         // Browser width
    height: 768          // Browser height
  }
};
```

### Adjusting Wait Time

If reports take longer to render:

```javascript
waitTime: 5000, // Wait 5 seconds
```

### Running with Visible Browser

To see what the script is doing:

```javascript
headless: false, // Show browser window
```

## Authentication

### Windows Authentication (SSRS Default)

If your SSRS server uses Windows authentication and you're running the script on a domain-joined machine, it should work automatically.

### Basic Authentication

Uncomment and modify the authentication section in the script:

```javascript
await page.authenticate({
  username: 'domain\\username',
  password: 'password'
});
```

### Alternative: Pre-authenticate in Browser

1. Set `headless: false`
2. Script will open browser
3. Manually login when prompted
4. Script continues after authentication

## Output

The script provides multiple output formats:

### Console Output

```
[1/3]
Measuring: https://reportserver/ReportServer?/Sales/Monthly
✓ Height: 850px

[2/3]
Measuring: https://reportserver/ReportServer?/HR/Employees
✓ Height: 1200px
```

### CSV Format

```csv
URL,Height
"https://reportserver/ReportServer?/Sales/Monthly",850
"https://reportserver/ReportServer?/HR/Employees",1200
```

### JSON Format

```json
[
  {
    "url": "https://reportserver/ReportServer?/Sales/Monthly",
    "height": 850
  },
  {
    "url": "https://reportserver/ReportServer?/HR/Employees",
    "height": 1200
  }
]
```

### Quick Reference

```
Monthly: 850px
Employees: 1200px
```

### Output File

Results are automatically saved to `report-heights.json`.

## Using the Results

1. Take the measured height for each report
2. Add the SSRS Report Viewer web part to your SharePoint page
3. Configure the web part:
   - **Report URL**: Your report URL
   - **Height Mode**: Custom Height
   - **Custom Height**: Use the measured value (e.g., 850)

## Example Workflow

```bash
# 1. Create your reports list
cat > my-reports.txt << EOF
https://reports.company.com/ReportServer?/Sales/Monthly
https://reports.company.com/ReportServer?/HR/Employees
https://reports.company.com/ReportServer?/Finance/Quarterly
EOF

# 2. Run measurement
node measure-reports.js my-reports.txt

# 3. View results
cat report-heights.json
```

Output:
```json
[
  {
    "success": true,
    "url": "https://reports.company.com/ReportServer?/Sales/Monthly",
    "height": 850
  },
  {
    "success": true,
    "url": "https://reports.company.com/ReportServer?/HR/Employees",
    "height": 1200
  },
  {
    "success": true,
    "url": "https://reports.company.com/ReportServer?/Finance/Quarterly",
    "height": 950
  }
]
```

## Troubleshooting

### Timeout Errors

Increase timeout and wait time:

```javascript
waitTime: 5000,
timeout: 60000,
```

### Authentication Issues

**Error**: "401 Unauthorized"

**Solution**:
- Verify credentials in `page.authenticate()`
- Ensure Windows authentication is configured
- Run script from domain-joined machine

### CORS Errors

The script runs a headless browser with `--disable-web-security`, so CORS shouldn't be an issue.

### Reports Showing Wrong Height

**Possible causes**:
- Report not fully loaded (increase `waitTime`)
- Dynamic content loading after initial render
- JavaScript errors preventing full render

**Solutions**:
1. Increase wait time: `waitTime: 5000`
2. Set `headless: false` to visually inspect
3. Check browser console for errors

### SSL Certificate Errors

Add to browser args:

```javascript
args: [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-web-security',
  '--ignore-certificate-errors', // Add this
]
```

## Advanced Usage

### Measuring Reports with Parameters

Include parameters in the URL:

```text
https://reportserver/ReportServer?/Sales/Monthly&Year=2024&Month=12
```

### Different Viewport Sizes

Measure at different widths (reports may have responsive heights):

```javascript
viewport: {
  width: 1920, // Wide screen
  height: 1080
}
```

### Batch Processing with Different Configurations

Create multiple scripts with different configs:

```bash
# Measure with toolbar visible
node measure-reports.js reports-with-toolbar.txt

# Measure with toolbar hidden
CONFIG.hideToolbar = true;
node measure-reports.js reports-no-toolbar.txt
```

## Integration with CI/CD

Use as part of deployment pipeline:

```bash
#!/bin/bash
# measure-and-deploy.sh

# Measure report heights
node measure-reports.js production-reports.txt

# Parse results and update configuration
# ... your deployment logic ...

# Deploy to SharePoint
gulp package-solution --ship
```

## Performance

- **Speed**: ~3-5 seconds per report (depends on report complexity and `waitTime`)
- **Parallel execution**: Currently sequential (could be enhanced)
- **Resource usage**: One Chrome instance, reuses same page

### Example Timing

10 reports with 3s wait time:
- Total time: ~35-40 seconds
- Breakdown: 3s per report + ~0.5s navigation overhead

## Limitations

1. **Dynamic reports**: Height measured for default parameters only
2. **Interactive elements**: Expanded sections not measured (unless default state)
3. **Paginated reports**: Measures first page only
4. **Loading indicators**: May be included in height if visible during measurement

## Tips

1. **Run on the SSRS server**: Faster, no network latency, authentication easier
2. **Measure during low traffic**: Reports render faster
3. **Use consistent parameters**: If reports have parameters, always test with same values
4. **Verify visually first**: Set `headless: false` for initial runs
5. **Add margin**: Add 20-50px to measured heights for safety
6. **Re-measure after changes**: Report layout changes require re-measurement

## License

Same as parent project.
