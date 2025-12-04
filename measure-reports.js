#!/usr/bin/env node

/**
 * SSRS Report Height Measurement Script
 *
 * Usage:
 *   node measure-reports.js <report-urls-file>
 *   node measure-reports.js reports.txt
 *
 * Or pass URLs directly:
 *   node measure-reports.js "https://reports.com/ReportServer?/Sales/Monthly" "https://reports.com/ReportServer?/HR/Employees"
 *
 * Requirements:
 *   npm install puppeteer
 */

const fs = require('fs');
const puppeteer = require('puppeteer');

// Configuration
const CONFIG = {
  waitTime: 3000, // Time to wait for report to render (ms)
  timeout: 30000, // Page load timeout (ms)
  embedMode: true, // Add rs:Embed=true
  hideToolbar: true, // Add rc:Toolbar=false
  hideParameters: false, // Add rc:Parameters=false
  headless: true, // Run browser in headless mode
  viewport: {
    width: 1024,
    height: 768
  }
};

/**
 * Build SSRS URL with parameters
 */
function buildUrl(baseUrl, config) {
  try {
    const url = new URL(baseUrl);

    if (config.embedMode) {
      url.searchParams.set('rs:Embed', 'true');
    }

    if (config.hideToolbar) {
      url.searchParams.set('rc:Toolbar', 'false');
    }

    if (config.hideParameters) {
      url.searchParams.set('rc:Parameters', 'false');
    }

    return url.toString();
  } catch (e) {
    console.error(`Invalid URL: ${baseUrl}`);
    return baseUrl;
  }
}

/**
 * Measure a single report height
 */
async function measureReport(page, url, config) {
  const finalUrl = buildUrl(url, config);

  try {
    console.log(`\nMeasuring: ${url}`);
    console.log(`Final URL: ${finalUrl}`);

    // Navigate to the report
    await page.goto(finalUrl, {
      waitUntil: 'networkidle2',
      timeout: config.timeout
    });

    // Wait additional time for report to fully render
    console.log(`Waiting ${config.waitTime}ms for report to render...`);
    await page.waitForTimeout(config.waitTime);

    // Measure the height
    const height = await page.evaluate(() => {
      return Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
      );
    });

    console.log(`✓ Height: ${height}px`);

    return {
      success: true,
      url: url,
      finalUrl: finalUrl,
      height: height
    };

  } catch (error) {
    console.error(`✗ Error: ${error.message}`);

    return {
      success: false,
      url: url,
      finalUrl: finalUrl,
      error: error.message
    };
  }
}

/**
 * Measure multiple reports
 */
async function measureReports(urls, config) {
  console.log('Starting SSRS Report Height Measurement');
  console.log('========================================');
  console.log(`Reports to measure: ${urls.length}`);
  console.log(`Configuration:`);
  console.log(`  - Embed mode: ${config.embedMode}`);
  console.log(`  - Hide toolbar: ${config.hideToolbar}`);
  console.log(`  - Hide parameters: ${config.hideParameters}`);
  console.log(`  - Wait time: ${config.waitTime}ms`);

  const browser = await puppeteer.launch({
    headless: config.headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security', // Allow cross-origin if needed
    ]
  });

  const page = await browser.newPage();
  await page.setViewport(config.viewport);

  // Handle authentication if needed (Windows authentication passthrough)
  // Uncomment if you need to set credentials:
  // await page.authenticate({
  //   username: 'domain\\username',
  //   password: 'password'
  // });

  const results = [];

  for (let i = 0; i < urls.length; i++) {
    console.log(`\n[${i + 1}/${urls.length}]`);
    const result = await measureReport(page, urls[i], config);
    results.push(result);
  }

  await browser.close();

  return results;
}

/**
 * Display results
 */
function displayResults(results) {
  console.log('\n\n');
  console.log('========================================');
  console.log('MEASUREMENT RESULTS');
  console.log('========================================\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Total: ${results.length} | Success: ${successful.length} | Failed: ${failed.length}\n`);

  if (successful.length > 0) {
    console.log('SUCCESSFUL MEASUREMENTS:');
    console.log('------------------------\n');

    successful.forEach((result, index) => {
      const reportName = result.url.split('/').pop().split('?')[0] || `Report ${index + 1}`;
      console.log(`${reportName}`);
      console.log(`  URL: ${result.url}`);
      console.log(`  Height: ${result.height}px\n`);
    });

    // CSV Output
    console.log('\nCSV FORMAT:');
    console.log('-----------');
    console.log('URL,Height');
    successful.forEach(r => {
      console.log(`"${r.url}",${r.height}`);
    });

    // JSON Output
    console.log('\n\nJSON FORMAT:');
    console.log('------------');
    console.log(JSON.stringify(successful.map(r => ({
      url: r.url,
      height: r.height
    })), null, 2));

    // Quick Reference
    console.log('\n\nQUICK REFERENCE:');
    console.log('----------------');
    successful.forEach(r => {
      const reportName = r.url.split('/').pop().split('?')[0] || r.url;
      console.log(`${reportName}: ${r.height}px`);
    });
  }

  if (failed.length > 0) {
    console.log('\n\nFAILED MEASUREMENTS:');
    console.log('--------------------\n');

    failed.forEach(result => {
      console.log(`URL: ${result.url}`);
      console.log(`Error: ${result.error}\n`);
    });
  }

  // Save to file
  const outputFile = 'report-heights.json';
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`\n\nResults saved to: ${outputFile}`);
}

/**
 * Load URLs from file or arguments
 */
function loadUrls(args) {
  if (args.length === 0) {
    console.error('Error: No URLs or file provided');
    console.log('\nUsage:');
    console.log('  node measure-reports.js <file-path>');
    console.log('  node measure-reports.js "url1" "url2" "url3"');
    console.log('\nExample:');
    console.log('  node measure-reports.js reports.txt');
    console.log('  node measure-reports.js "https://reports.com/ReportServer?/Sales/Monthly"');
    process.exit(1);
  }

  // Check if first argument is a file
  const firstArg = args[0];
  if (fs.existsSync(firstArg)) {
    console.log(`Loading URLs from file: ${firstArg}`);
    const content = fs.readFileSync(firstArg, 'utf-8');
    return content.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  }

  // Otherwise treat all arguments as URLs
  console.log('Using URLs from command line arguments');
  return args;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const urls = loadUrls(args);

  if (urls.length === 0) {
    console.error('Error: No valid URLs found');
    process.exit(1);
  }

  try {
    const results = await measureReports(urls, CONFIG);
    displayResults(results);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { measureReports, buildUrl };
