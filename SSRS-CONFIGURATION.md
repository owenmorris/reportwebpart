# SSRS Report Viewer Web Part Configuration Guide

This document outlines the configuration options for the SSRS Report Viewer web part and the supported URL parameters for SQL Server Reporting Services.

## Web Part Configuration

### Report Settings

#### Report URL
- **Property**: `reportUrl`
- **Format**: Full URL to the SSRS report
- **Example**: `https://reportserver/ReportServer/Pages/ReportViewer.aspx?/FolderName/ReportName`
- **Note**: The web part automatically appends `rs:Embed=true` to optimize for iframe embedding

#### Report Parameters
- **Property**: `reportParameters`
- **Format**: JSON object with key-value pairs
- **Example**:
  ```json
  {
    "Year": "2024",
    "Month": "12",
    "Department": "Sales"
  }
  ```
- **Note**: Parameters are automatically appended to the report URL

### Display Options

#### Show Toolbar
- **Property**: `showToolbar`
- **Type**: Toggle (true/false)
- **Default**: `false`
- **SSRS Parameter**: `rc:Toolbar=false` (when hidden)
- **Description**: Controls visibility of the SSRS toolbar containing export, print, and navigation buttons

#### Show Parameters Area
- **Property**: `showParameters`
- **Type**: Toggle (true/false)
- **Default**: `false`
- **SSRS Parameter**: `rc:Parameters=false` (when hidden)
- **Description**: Controls visibility of the parameters panel at the top of the report

### Height Settings

#### Height Mode
- **Property**: `heightMode`
- **Type**: Dropdown
- **Options**:
  - **Fixed Height (800px)**: Default fixed height suitable for most reports
  - **Full Viewport Height**: Uses `100vh` to fill the entire viewport
  - **Custom Height**: Allows manual height specification

#### Custom Height
- **Property**: `customHeight`
- **Type**: Slider (300-2000 pixels)
- **Default**: 800
- **Step**: 50 pixels
- **Note**: Only active when Height Mode is set to "Custom Height"

---

## SSRS URL Access Parameters

The web part automatically constructs the report URL with the following parameters. These are standard SSRS URL access parameters supported by SQL Server Reporting Services.

### Core Parameters (Always Applied)

#### rs:Embed=true
- **Purpose**: Optimizes the report for iframe embedding
- **Effect**: Removes SSRS chrome and UI elements for cleaner embedding
- **Applied**: Automatically by the web part

### Report Viewer Command Parameters (rc:)

#### rc:Toolbar
- **Values**: `true` | `false`
- **Default**: Shown unless configured otherwise
- **Description**: Shows/hides the report toolbar
- **Controlled by**: Web part "Show Toolbar" toggle

#### rc:Parameters
- **Values**: `true` | `false` | `Collapsed`
- **Default**: Shown unless configured otherwise
- **Description**: Shows/hides the parameters area
- **Controlled by**: Web part "Show Parameters Area" toggle

### Additional Supported Parameters (Manual Configuration)

You can add these parameters directly to your report URL if needed:

#### rc:Zoom
- **Values**: `Page Width` | `Whole Page` | `100` (percentage)
- **Example**: `&rc:Zoom=Page Width`
- **Description**: Sets the initial zoom level of the report

#### rc:Section
- **Values**: Page number (integer)
- **Example**: `&rc:Section=1`
- **Description**: Specifies which page to display initially

#### rs:Command
- **Values**: `Render` | `GetResourceContents`
- **Default**: `Render`
- **Description**: Specifies the type of operation to perform

#### rs:Format
- **Values**: `HTML5` | `PDF` | `EXCEL` | `WORD` | `CSV` | `XML` | `IMAGE`
- **Default**: `HTML5`
- **Example**: `&rs:Format=PDF`
- **Description**: Specifies the output format (use HTML5 for iframe viewing)

---

## Server Configuration

### X-Frame-Options Header

For the web part to function properly, you may need to configure the SSRS server to allow iframe embedding.

**Location**: SSRS Configuration Manager > Advanced Settings

**Option**: `X-Frame-Options`

**Values**:
- Remove the header entirely (not recommended for public-facing servers)
- Set to `SAMEORIGIN` if SharePoint and SSRS are on the same domain
- Configure custom header patterns to allow specific origins

**Security Note**: Only modify this setting after careful security consideration, especially for internet-facing report servers.

### CORS Configuration

If your SharePoint site and SSRS server are on different domains, you may need to configure Cross-Origin Resource Sharing (CORS) on the report server.

**Configuration File**: `rsreportserver.config`

**Sample Configuration**:
```xml
<Configuration>
  <Service>
    <IsWebServiceEnabled>True</IsWebServiceEnabled>
    <CORSAllowedOrigins>
      <Origin>https://yoursharepointsite.com</Origin>
    </CORSAllowedOrigins>
  </Service>
</Configuration>
```

---

## Dynamic Height with PostMessage (Advanced)

The web part includes support for dynamic height adjustment using the `postMessage` API. This requires adding JavaScript to your SSRS reports.

### Current Limitation

Without server-side configuration, the iframe uses static height based on your selection:
- Fixed: 800px
- Viewport: 100vh
- Custom: Your specified height

### Enabling Dynamic Height

#### Step 1: Add JavaScript to SSRS Report

Add this code to your SSRS report's **Code** section (Report Properties > Code):

```javascript
function sendHeightToParent() {
  var height = document.body.scrollHeight;
  window.parent.postMessage({
    reportHeight: height
  }, '*');
}

// Send initial height
window.addEventListener('load', function() {
  sendHeightToParent();
});

// Send height updates when content changes
var observer = new MutationObserver(function() {
  sendHeightToParent();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true
});
```

#### Step 2: Alternative - Global SSRS Configuration

For a global solution affecting all reports, add the script to:

**Location**: `C:\Program Files\Microsoft SQL Server Reporting Services\SSRS\ReportServer\Pages\ReportViewer.aspx`

**Method**: Add script tag before closing `</body>` tag:

```html
<script>
(function() {
  function sendHeightToParent() {
    var height = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    window.parent.postMessage({ reportHeight: height }, '*');
  }

  if (window.self !== window.top) {
    window.addEventListener('load', sendHeightToParent);
    setInterval(sendHeightToParent, 1000);
  }
})();
</script>
```

#### Step 3: Activate in Web Part

In the component file (`ReportViewerModern.tsx`), uncomment the postMessage handler:

**Location**: Lines 61-72

```typescript
const handlePostMessage = (event: MessageEvent): void => {
  // Uncomment and configure for your SSRS server domain
  const allowedOrigins = ['https://yourreportserver.com'];

  if (allowedOrigins.includes(event.origin) &&
      event.data &&
      event.data.reportHeight &&
      iframeRef.current) {
    iframeRef.current.style.height = `${event.data.reportHeight}px`;
  }
};
```

**Security Note**: Always validate the message origin to prevent XSS attacks. Replace `['https://yourreportserver.com']` with your actual SSRS server domain.

---

## Example Configurations

### Simple Report (No Parameters)
```
Report URL: https://reports.company.com/ReportServer?/Sales/MonthlySummary
Show Toolbar: Off
Show Parameters: Off
Height Mode: Fixed Height (800px)
```

### Interactive Report with Parameters
```
Report URL: https://reports.company.com/ReportServer?/HR/EmployeeReport
Report Parameters: {"Department":"IT","Year":"2024"}
Show Toolbar: On
Show Parameters: On
Height Mode: Custom Height (1200px)
```

### Dashboard Style Report
```
Report URL: https://reports.company.com/ReportServer?/Dashboard/Executive&rc:Zoom=Page Width
Show Toolbar: Off
Show Parameters: Off
Height Mode: Full Viewport Height
```

---

## Troubleshooting

### Report Not Displaying

1. **Check X-Frame-Options**: Verify SSRS server allows iframe embedding
2. **Verify URL**: Ensure the report URL is accessible and correct
3. **Check Browser Console**: Look for CORS or X-Frame-Options errors
4. **Test Direct Access**: Open the report URL directly in a browser

### Height Issues

1. **Report Truncated**: Increase the custom height or use viewport height mode
2. **Too Much White Space**: Reduce the custom height or wait for dynamic height implementation
3. **Scrollbars Appearing**: This is normal for fixed-height iframes with oversized content

### Parameters Not Working

1. **Verify JSON Format**: Ensure report parameters are valid JSON
2. **Check Parameter Names**: Must match exact parameter names in SSRS report (case-sensitive)
3. **Parameter Types**: String values should be in quotes, numbers without quotes

### Authentication Issues

1. **Credentials Required**: Configure SSRS for Windows Authentication or appropriate auth method
2. **SSO Not Working**: Ensure Kerberos delegation is configured for cross-domain scenarios
3. **401 Errors**: Check SSRS security settings and SharePoint authentication passthrough

---

## References

- [SSRS URL Access Parameter Reference](https://learn.microsoft.com/en-us/sql/reporting-services/url-access-parameter-reference)
- [SSRS URL Access](https://learn.microsoft.com/en-us/sql/reporting-services/url-access-ssrs)
- [Configure SSRS for iframe Embedding](https://learn.microsoft.com/en-us/sql/reporting-services/tools/server-properties-advanced-page-reporting-services)
- [PostMessage API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
