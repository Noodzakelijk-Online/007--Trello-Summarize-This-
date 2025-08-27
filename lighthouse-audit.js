// Lighthouse Performance Audit for Summarize This Frontend
// Comprehensive frontend performance testing and optimization analysis

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  // Target URLs to test
  urls: [
    'http://localhost:3000',
    'http://localhost:3000/summary.html',
    'http://localhost:3000/transcribe.html',
    'http://localhost:3000/settings.html',
    'http://localhost:3000/purchase.html',
    'http://localhost:3000/landing/index.html',
    'http://localhost:3000/onboarding/index.html',
    'http://localhost:3000/advanced-monitoring/index.html'
  ],
  
  // Lighthouse configuration
  lighthouseConfig: {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'desktop',
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0
      },
      screenEmulation: {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false
      },
      emulatedUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.109 Safari/537.36'
    }
  },
  
  // Mobile configuration
  mobileConfig: {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'mobile',
      throttling: {
        rttMs: 150,
        throughputKbps: 1638.4,
        cpuSlowdownMultiplier: 4,
        requestLatencyMs: 150,
        downloadThroughputKbps: 1638.4,
        uploadThroughputKbps: 750
      },
      screenEmulation: {
        mobile: true,
        width: 375,
        height: 667,
        deviceScaleFactor: 2,
        disabled: false
      }
    }
  },
  
  // Chrome launch options
  chromeFlags: [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding'
  ],
  
  // Output directory
  outputDir: './performance-reports',
  
  // Performance thresholds
  thresholds: {
    performance: 90,
    accessibility: 95,
    bestPractices: 90,
    seo: 90,
    pwa: 80
  }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Ensure output directory exists
function ensureOutputDir() {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
}

// Generate timestamp for file names
function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

// Extract page name from URL
function getPageName(url) {
  const urlObj = new URL(url);
  let pathname = urlObj.pathname;
  
  if (pathname === '/') {
    return 'homepage';
  }
  
  // Remove leading slash and file extension
  pathname = pathname.replace(/^\//, '').replace(/\.[^/.]+$/, '');
  
  // Replace slashes with dashes
  return pathname.replace(/\//g, '-') || 'root';
}

// Calculate performance score
function calculateOverallScore(lhr) {
  const categories = lhr.categories;
  const scores = {
    performance: categories.performance?.score * 100 || 0,
    accessibility: categories.accessibility?.score * 100 || 0,
    bestPractices: categories['best-practices']?.score * 100 || 0,
    seo: categories.seo?.score * 100 || 0,
    pwa: categories.pwa?.score * 100 || 0
  };
  
  const overallScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;
  
  return { ...scores, overall: overallScore };
}

// Extract key metrics
function extractKeyMetrics(lhr) {
  const audits = lhr.audits;
  
  return {
    // Core Web Vitals
    firstContentfulPaint: audits['first-contentful-paint']?.numericValue || 0,
    largestContentfulPaint: audits['largest-contentful-paint']?.numericValue || 0,
    cumulativeLayoutShift: audits['cumulative-layout-shift']?.numericValue || 0,
    firstInputDelay: audits['max-potential-fid']?.numericValue || 0,
    
    // Other important metrics
    speedIndex: audits['speed-index']?.numericValue || 0,
    timeToInteractive: audits['interactive']?.numericValue || 0,
    totalBlockingTime: audits['total-blocking-time']?.numericValue || 0,
    
    // Resource metrics
    totalByteWeight: audits['total-byte-weight']?.numericValue || 0,
    unusedCssRules: audits['unused-css-rules']?.details?.overallSavingsBytes || 0,
    unusedJavaScript: audits['unused-javascript']?.details?.overallSavingsBytes || 0,
    
    // Image optimization
    modernImageFormats: audits['modern-image-formats']?.details?.overallSavingsBytes || 0,
    efficientAnimatedContent: audits['efficient-animated-content']?.details?.overallSavingsBytes || 0,
    
    // Network metrics
    serverResponseTime: audits['server-response-time']?.numericValue || 0,
    redirects: audits['redirects']?.details?.overallSavingsMs || 0
  };
}

// Generate recommendations
function generateRecommendations(lhr) {
  const audits = lhr.audits;
  const recommendations = [];
  
  // Performance recommendations
  if (audits['unused-css-rules']?.score < 0.9) {
    recommendations.push({
      category: 'Performance',
      priority: 'High',
      issue: 'Unused CSS',
      description: 'Remove unused CSS rules to reduce bundle size',
      potentialSavings: `${Math.round((audits['unused-css-rules']?.details?.overallSavingsBytes || 0) / 1024)}KB`
    });
  }
  
  if (audits['unused-javascript']?.score < 0.9) {
    recommendations.push({
      category: 'Performance',
      priority: 'High',
      issue: 'Unused JavaScript',
      description: 'Remove unused JavaScript to reduce bundle size',
      potentialSavings: `${Math.round((audits['unused-javascript']?.details?.overallSavingsBytes || 0) / 1024)}KB`
    });
  }
  
  if (audits['modern-image-formats']?.score < 0.9) {
    recommendations.push({
      category: 'Performance',
      priority: 'Medium',
      issue: 'Image Format Optimization',
      description: 'Use modern image formats like WebP or AVIF',
      potentialSavings: `${Math.round((audits['modern-image-formats']?.details?.overallSavingsBytes || 0) / 1024)}KB`
    });
  }
  
  if (audits['render-blocking-resources']?.score < 0.9) {
    recommendations.push({
      category: 'Performance',
      priority: 'High',
      issue: 'Render-blocking Resources',
      description: 'Eliminate render-blocking resources',
      potentialSavings: `${Math.round((audits['render-blocking-resources']?.details?.overallSavingsMs || 0))}ms`
    });
  }
  
  // Accessibility recommendations
  if (audits['color-contrast']?.score < 1) {
    recommendations.push({
      category: 'Accessibility',
      priority: 'High',
      issue: 'Color Contrast',
      description: 'Ensure sufficient color contrast for text elements',
      potentialSavings: 'Improved accessibility'
    });
  }
  
  if (audits['image-alt']?.score < 1) {
    recommendations.push({
      category: 'Accessibility',
      priority: 'Medium',
      issue: 'Image Alt Text',
      description: 'Add alt text to all images',
      potentialSavings: 'Improved accessibility'
    });
  }
  
  // SEO recommendations
  if (audits['meta-description']?.score < 1) {
    recommendations.push({
      category: 'SEO',
      priority: 'Medium',
      issue: 'Meta Description',
      description: 'Add meta description to improve SEO',
      potentialSavings: 'Better search visibility'
    });
  }
  
  return recommendations;
}

// =============================================================================
// AUDIT FUNCTIONS
// =============================================================================

// Run Lighthouse audit for a single URL
async function auditUrl(url, config, formFactor = 'desktop') {
  console.log(`Starting ${formFactor} audit for: ${url}`);
  
  const chrome = await chromeLauncher.launch({
    chromeFlags: CONFIG.chromeFlags
  });
  
  try {
    const runnerResult = await lighthouse(url, {
      port: chrome.port,
      disableDeviceEmulation: formFactor === 'desktop',
      disableStorageReset: false
    }, config);
    
    const lhr = runnerResult.lhr;
    const scores = calculateOverallScore(lhr);
    const metrics = extractKeyMetrics(lhr);
    const recommendations = generateRecommendations(lhr);
    
    console.log(`${formFactor} audit completed for: ${url}`);
    console.log(`Performance Score: ${scores.performance.toFixed(1)}`);
    console.log(`Overall Score: ${scores.overall.toFixed(1)}`);
    
    return {
      url,
      formFactor,
      timestamp: new Date().toISOString(),
      scores,
      metrics,
      recommendations,
      lhr,
      report: runnerResult.report
    };
    
  } finally {
    await chrome.kill();
  }
}

// Run comprehensive audit suite
async function runComprehensiveAudit() {
  console.log('Starting comprehensive Lighthouse audit...');
  
  ensureOutputDir();
  
  const results = [];
  const timestamp = getTimestamp();
  
  // Test each URL on both desktop and mobile
  for (const url of CONFIG.urls) {
    try {
      // Desktop audit
      const desktopResult = await auditUrl(url, CONFIG.lighthouseConfig, 'desktop');
      results.push(desktopResult);
      
      // Mobile audit
      const mobileResult = await auditUrl(url, CONFIG.mobileConfig, 'mobile');
      results.push(mobileResult);
      
      // Save individual reports
      const pageName = getPageName(url);
      
      // Save desktop report
      const desktopReportPath = path.join(CONFIG.outputDir, `${pageName}-desktop-${timestamp}.html`);
      fs.writeFileSync(desktopReportPath, desktopResult.report);
      
      // Save mobile report
      const mobileReportPath = path.join(CONFIG.outputDir, `${pageName}-mobile-${timestamp}.html`);
      fs.writeFileSync(mobileReportPath, mobileResult.report);
      
      console.log(`Reports saved for ${pageName}`);
      
    } catch (error) {
      console.error(`Error auditing ${url}:`, error.message);
      results.push({
        url,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return results;
}

// Generate summary report
function generateSummaryReport(results) {
  const summary = {
    timestamp: new Date().toISOString(),
    totalPages: CONFIG.urls.length,
    totalAudits: results.length,
    averageScores: {
      desktop: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0, pwa: 0, overall: 0 },
      mobile: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0, pwa: 0, overall: 0 }
    },
    pageResults: [],
    recommendations: [],
    thresholdViolations: []
  };
  
  const desktopResults = results.filter(r => r.formFactor === 'desktop' && !r.error);
  const mobileResults = results.filter(r => r.formFactor === 'mobile' && !r.error);
  
  // Calculate average scores
  if (desktopResults.length > 0) {
    const desktopScores = desktopResults.reduce((acc, result) => {
      Object.keys(result.scores).forEach(key => {
        acc[key] = (acc[key] || 0) + result.scores[key];
      });
      return acc;
    }, {});
    
    Object.keys(desktopScores).forEach(key => {
      summary.averageScores.desktop[key] = desktopScores[key] / desktopResults.length;
    });
  }
  
  if (mobileResults.length > 0) {
    const mobileScores = mobileResults.reduce((acc, result) => {
      Object.keys(result.scores).forEach(key => {
        acc[key] = (acc[key] || 0) + result.scores[key];
      });
      return acc;
    }, {});
    
    Object.keys(mobileScores).forEach(key => {
      summary.averageScores.mobile[key] = mobileScores[key] / mobileResults.length;
    });
  }
  
  // Collect page results
  CONFIG.urls.forEach(url => {
    const pageName = getPageName(url);
    const desktopResult = results.find(r => r.url === url && r.formFactor === 'desktop');
    const mobileResult = results.find(r => r.url === url && r.formFactor === 'mobile');
    
    summary.pageResults.push({
      url,
      pageName,
      desktop: desktopResult ? {
        scores: desktopResult.scores,
        metrics: desktopResult.metrics
      } : null,
      mobile: mobileResult ? {
        scores: mobileResult.scores,
        metrics: mobileResult.metrics
      } : null
    });
  });
  
  // Collect all recommendations
  results.forEach(result => {
    if (result.recommendations) {
      result.recommendations.forEach(rec => {
        summary.recommendations.push({
          ...rec,
          url: result.url,
          formFactor: result.formFactor
        });
      });
    }
  });
  
  // Check threshold violations
  results.forEach(result => {
    if (result.scores) {
      Object.keys(CONFIG.thresholds).forEach(category => {
        if (result.scores[category] < CONFIG.thresholds[category]) {
          summary.thresholdViolations.push({
            url: result.url,
            formFactor: result.formFactor,
            category,
            score: result.scores[category],
            threshold: CONFIG.thresholds[category]
          });
        }
      });
    }
  });
  
  return summary;
}

// Generate HTML summary report
function generateHtmlSummary(summary) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Summarize This - Performance Audit Summary</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1, h2, h3 { color: #333; }
        .score { display: inline-block; padding: 5px 10px; border-radius: 4px; color: white; font-weight: bold; }
        .score.excellent { background: #0cce6b; }
        .score.good { background: #ffa400; }
        .score.poor { background: #ff4e42; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; }
        .recommendations { margin: 20px 0; }
        .recommendation { background: #fff3cd; padding: 10px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #ffc107; }
        .violation { background: #f8d7da; padding: 10px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #dc3545; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
        .chart { margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Summarize This - Performance Audit Summary</h1>
        <p><strong>Generated:</strong> ${summary.timestamp}</p>
        <p><strong>Pages Tested:</strong> ${summary.totalPages}</p>
        <p><strong>Total Audits:</strong> ${summary.totalAudits}</p>
        
        <h2>Average Scores</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <h3>Desktop Performance</h3>
                <div class="score ${summary.averageScores.desktop.performance >= 90 ? 'excellent' : summary.averageScores.desktop.performance >= 50 ? 'good' : 'poor'}">
                    ${summary.averageScores.desktop.performance.toFixed(1)}
                </div>
                <p>Performance: ${summary.averageScores.desktop.performance.toFixed(1)}</p>
                <p>Accessibility: ${summary.averageScores.desktop.accessibility.toFixed(1)}</p>
                <p>Best Practices: ${summary.averageScores.desktop.bestPractices.toFixed(1)}</p>
                <p>SEO: ${summary.averageScores.desktop.seo.toFixed(1)}</p>
            </div>
            <div class="metric-card">
                <h3>Mobile Performance</h3>
                <div class="score ${summary.averageScores.mobile.performance >= 90 ? 'excellent' : summary.averageScores.mobile.performance >= 50 ? 'good' : 'poor'}">
                    ${summary.averageScores.mobile.performance.toFixed(1)}
                </div>
                <p>Performance: ${summary.averageScores.mobile.performance.toFixed(1)}</p>
                <p>Accessibility: ${summary.averageScores.mobile.accessibility.toFixed(1)}</p>
                <p>Best Practices: ${summary.averageScores.mobile.bestPractices.toFixed(1)}</p>
                <p>SEO: ${summary.averageScores.mobile.seo.toFixed(1)}</p>
            </div>
        </div>
        
        <h2>Page Results</h2>
        <table>
            <thead>
                <tr>
                    <th>Page</th>
                    <th>Desktop Performance</th>
                    <th>Mobile Performance</th>
                    <th>Desktop LCP</th>
                    <th>Mobile LCP</th>
                    <th>Desktop CLS</th>
                    <th>Mobile CLS</th>
                </tr>
            </thead>
            <tbody>
                ${summary.pageResults.map(page => `
                    <tr>
                        <td>${page.pageName}</td>
                        <td>${page.desktop ? page.desktop.scores.performance.toFixed(1) : 'N/A'}</td>
                        <td>${page.mobile ? page.mobile.scores.performance.toFixed(1) : 'N/A'}</td>
                        <td>${page.desktop ? (page.desktop.metrics.largestContentfulPaint / 1000).toFixed(2) + 's' : 'N/A'}</td>
                        <td>${page.mobile ? (page.mobile.metrics.largestContentfulPaint / 1000).toFixed(2) + 's' : 'N/A'}</td>
                        <td>${page.desktop ? page.desktop.metrics.cumulativeLayoutShift.toFixed(3) : 'N/A'}</td>
                        <td>${page.mobile ? page.mobile.metrics.cumulativeLayoutShift.toFixed(3) : 'N/A'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        ${summary.thresholdViolations.length > 0 ? `
        <h2>Threshold Violations</h2>
        <div class="violations">
            ${summary.thresholdViolations.map(violation => `
                <div class="violation">
                    <strong>${violation.url}</strong> (${violation.formFactor})<br>
                    ${violation.category}: ${violation.score.toFixed(1)} (threshold: ${violation.threshold})
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        <h2>Top Recommendations</h2>
        <div class="recommendations">
            ${summary.recommendations.slice(0, 10).map(rec => `
                <div class="recommendation">
                    <strong>${rec.category} - ${rec.priority} Priority:</strong> ${rec.issue}<br>
                    ${rec.description}<br>
                    <small>Potential savings: ${rec.potentialSavings} | Page: ${getPageName(rec.url)} (${rec.formFactor})</small>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
  `;
  
  return html;
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  try {
    console.log('Starting Lighthouse performance audit suite...');
    
    // Run comprehensive audit
    const results = await runComprehensiveAudit();
    
    // Generate summary
    const summary = generateSummaryReport(results);
    
    // Save results
    const timestamp = getTimestamp();
    
    // Save JSON summary
    const jsonPath = path.join(CONFIG.outputDir, `summary-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
    
    // Save HTML summary
    const htmlSummary = generateHtmlSummary(summary);
    const htmlPath = path.join(CONFIG.outputDir, `summary-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlSummary);
    
    console.log('\\n=== AUDIT COMPLETE ===');
    console.log(`Total pages tested: ${summary.totalPages}`);
    console.log(`Total audits run: ${summary.totalAudits}`);
    console.log(`Average desktop performance: ${summary.averageScores.desktop.performance.toFixed(1)}`);
    console.log(`Average mobile performance: ${summary.averageScores.mobile.performance.toFixed(1)}`);
    console.log(`Threshold violations: ${summary.thresholdViolations.length}`);
    console.log(`Reports saved to: ${CONFIG.outputDir}`);
    
    // Exit with error code if there are threshold violations
    if (summary.thresholdViolations.length > 0) {
      console.log('\\nWARNING: Performance thresholds violated!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Error running audit:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  auditUrl,
  runComprehensiveAudit,
  generateSummaryReport,
  CONFIG
};

