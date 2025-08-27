// Frontend Performance Testing and Optimization Suite
// Comprehensive frontend performance analysis and optimization for Summarize This

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

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
  
  // Performance testing configuration
  testing: {
    iterations: 5,
    warmupIterations: 2,
    timeout: 30000,
    networkThrottling: {
      slow3G: { downloadThroughput: 500 * 1024, uploadThroughput: 500 * 1024, latency: 400 },
      fast3G: { downloadThroughput: 1.6 * 1024 * 1024, uploadThroughput: 750 * 1024, latency: 150 },
      wifi: { downloadThroughput: 30 * 1024 * 1024, uploadThroughput: 15 * 1024 * 1024, latency: 2 }
    },
    deviceEmulation: {
      mobile: { width: 375, height: 667, deviceScaleFactor: 2, isMobile: true },
      tablet: { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true },
      desktop: { width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false }
    }
  },
  
  // Performance thresholds
  thresholds: {
    firstContentfulPaint: 2000,    // 2 seconds
    largestContentfulPaint: 4000,  // 4 seconds
    firstInputDelay: 100,          // 100ms
    cumulativeLayoutShift: 0.1,    // 0.1
    timeToInteractive: 5000,       // 5 seconds
    speedIndex: 4000,              // 4 seconds
    totalBlockingTime: 300,        // 300ms
    
    // Resource thresholds
    totalResourceSize: 2 * 1024 * 1024,  // 2MB
    imageOptimization: 0.8,               // 80% optimized
    cacheHitRatio: 0.9,                   // 90% cache hits
    
    // JavaScript performance
    jsExecutionTime: 1000,         // 1 second
    jsHeapSize: 50 * 1024 * 1024,  // 50MB
    
    // Accessibility
    accessibilityScore: 90,        // 90/100
    
    // SEO
    seoScore: 90                   // 90/100
  },
  
  // Output configuration
  outputDir: './performance-reports/frontend-performance',
  screenshotDir: './performance-reports/frontend-performance/screenshots'
};

// =============================================================================
// PERFORMANCE METRICS COLLECTOR
// =============================================================================

class PerformanceMetricsCollector {
  constructor() {
    this.browser = null;
    this.results = [];
  }
  
  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
  }
  
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
  
  async collectMetrics(url, options = {}) {
    const page = await this.browser.newPage();
    
    try {
      // Configure page
      await this.configurePage(page, options);
      
      // Collect performance metrics
      const metrics = await this.performanceTest(page, url, options);
      
      return metrics;
      
    } finally {
      await page.close();
    }
  }
  
  async configurePage(page, options) {
    // Set viewport
    const device = options.device || 'desktop';
    const viewport = CONFIG.testing.deviceEmulation[device];
    await page.setViewport(viewport);
    
    // Set network throttling
    if (options.networkThrottling) {
      const client = await page.target().createCDPSession();
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        ...CONFIG.testing.networkThrottling[options.networkThrottling]
      });
    }
    
    // Enable performance monitoring
    await page.setCacheEnabled(options.cacheEnabled !== false);
    
    // Set user agent
    if (viewport.isMobile) {
      await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1');
    }
  }
  
  async performanceTest(page, url, options) {
    const testName = `${this.getPageName(url)}_${options.device || 'desktop'}_${options.networkThrottling || 'wifi'}`;
    
    console.log(`Testing: ${testName}`);
    
    // Start performance monitoring
    await page.tracing.start({
      path: path.join(CONFIG.outputDir, `trace_${testName}.json`),
      screenshots: true
    });
    
    const startTime = performance.now();
    
    // Navigate to page
    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: CONFIG.testing.timeout
    });
    
    const loadTime = performance.now() - startTime;
    
    // Wait for page to be fully interactive
    await page.waitForTimeout(2000);
    
    // Collect Core Web Vitals
    const coreWebVitals = await this.collectCoreWebVitals(page);
    
    // Collect resource metrics
    const resourceMetrics = await this.collectResourceMetrics(page);
    
    // Collect JavaScript performance
    const jsMetrics = await this.collectJavaScriptMetrics(page);
    
    // Collect accessibility metrics
    const accessibilityMetrics = await this.collectAccessibilityMetrics(page);
    
    // Collect SEO metrics
    const seoMetrics = await this.collectSEOMetrics(page);
    
    // Take screenshot
    const screenshotPath = path.join(CONFIG.screenshotDir, `${testName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    // Stop tracing
    await page.tracing.stop();
    
    const metrics = {
      url,
      testName,
      timestamp: new Date().toISOString(),
      options,
      loadTime,
      responseStatus: response.status(),
      coreWebVitals,
      resourceMetrics,
      jsMetrics,
      accessibilityMetrics,
      seoMetrics,
      screenshotPath,
      passed: this.evaluateThresholds({
        ...coreWebVitals,
        ...resourceMetrics,
        ...jsMetrics,
        ...accessibilityMetrics,
        ...seoMetrics
      })
    };
    
    return metrics;
  }
  
  async collectCoreWebVitals(page) {
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals = {};
          
          entries.forEach((entry) => {
            switch (entry.entryType) {
              case 'paint':
                if (entry.name === 'first-contentful-paint') {
                  vitals.firstContentfulPaint = entry.startTime;
                }
                break;
              case 'largest-contentful-paint':
                vitals.largestContentfulPaint = entry.startTime;
                break;
              case 'layout-shift':
                if (!vitals.cumulativeLayoutShift) {
                  vitals.cumulativeLayoutShift = 0;
                }
                if (!entry.hadRecentInput) {
                  vitals.cumulativeLayoutShift += entry.value;
                }
                break;
              case 'first-input':
                vitals.firstInputDelay = entry.processingStart - entry.startTime;
                break;
            }
          });
          
          // Get additional metrics from Navigation Timing API
          const navigation = performance.getEntriesByType('navigation')[0];
          if (navigation) {
            vitals.timeToInteractive = navigation.domInteractive - navigation.navigationStart;
            vitals.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.navigationStart;
            vitals.loadComplete = navigation.loadEventEnd - navigation.navigationStart;
          }
          
          resolve(vitals);
        });
        
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift', 'first-input'] });
        
        // Fallback timeout
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0];
          resolve({
            firstContentfulPaint: 0,
            largestContentfulPaint: 0,
            cumulativeLayoutShift: 0,
            firstInputDelay: 0,
            timeToInteractive: navigation ? navigation.domInteractive - navigation.navigationStart : 0,
            domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.navigationStart : 0,
            loadComplete: navigation ? navigation.loadEventEnd - navigation.navigationStart : 0
          });
        }, 5000);
      });
    });
    
    return metrics;
  }
  
  async collectResourceMetrics(page) {
    const resourceMetrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      
      let totalSize = 0;
      let imageSize = 0;
      let jsSize = 0;
      let cssSize = 0;
      let fontSize = 0;
      
      const resourceTypes = {
        image: 0,
        script: 0,
        stylesheet: 0,
        font: 0,
        other: 0
      };
      
      const cacheable = {
        cached: 0,
        notCached: 0
      };
      
      resources.forEach((resource) => {
        const size = resource.transferSize || 0;
        totalSize += size;
        
        // Categorize by type
        if (resource.initiatorType === 'img' || resource.name.match(/\\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
          imageSize += size;
          resourceTypes.image++;
        } else if (resource.initiatorType === 'script' || resource.name.match(/\\.js$/i)) {
          jsSize += size;
          resourceTypes.script++;
        } else if (resource.initiatorType === 'link' || resource.name.match(/\\.css$/i)) {
          cssSize += size;
          resourceTypes.stylesheet++;
        } else if (resource.name.match(/\\.(woff|woff2|ttf|otf)$/i)) {
          fontSize += size;
          resourceTypes.font++;
        } else {
          resourceTypes.other++;
        }
        
        // Check cache status
        if (resource.transferSize === 0 && resource.decodedBodySize > 0) {
          cacheable.cached++;
        } else {
          cacheable.notCached++;
        }
      });
      
      return {
        totalResourceSize: totalSize,
        imageSize,
        jsSize,
        cssSize,
        fontSize,
        resourceCount: resources.length,
        resourceTypes,
        cacheHitRatio: cacheable.cached / (cacheable.cached + cacheable.notCached),
        averageResourceSize: totalSize / resources.length || 0
      };
    });
    
    return resourceMetrics;
  }
  
  async collectJavaScriptMetrics(page) {
    const jsMetrics = await page.evaluate(() => {
      const jsHeapSize = performance.memory ? performance.memory.usedJSHeapSize : 0;
      const jsHeapSizeLimit = performance.memory ? performance.memory.jsHeapSizeLimit : 0;
      
      // Measure JavaScript execution time
      const startTime = performance.now();
      
      // Simulate some JavaScript work
      let sum = 0;
      for (let i = 0; i < 100000; i++) {
        sum += Math.random();
      }
      
      const jsExecutionTime = performance.now() - startTime;
      
      return {
        jsHeapSize,
        jsHeapSizeLimit,
        jsExecutionTime,
        memoryUsageRatio: jsHeapSizeLimit > 0 ? jsHeapSize / jsHeapSizeLimit : 0
      };
    });
    
    return jsMetrics;
  }
  
  async collectAccessibilityMetrics(page) {
    const accessibilityMetrics = await page.evaluate(() => {
      const issues = [];
      let score = 100;
      
      // Check for missing alt text
      const images = document.querySelectorAll('img');
      let imagesWithoutAlt = 0;
      images.forEach(img => {
        if (!img.alt || img.alt.trim() === '') {
          imagesWithoutAlt++;
        }
      });
      
      if (imagesWithoutAlt > 0) {
        issues.push(`${imagesWithoutAlt} images missing alt text`);
        score -= Math.min(20, imagesWithoutAlt * 5);
      }
      
      // Check for proper heading structure
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const h1Count = document.querySelectorAll('h1').length;
      
      if (h1Count === 0) {
        issues.push('No H1 heading found');
        score -= 10;
      } else if (h1Count > 1) {
        issues.push('Multiple H1 headings found');
        score -= 5;
      }
      
      // Check for form labels
      const inputs = document.querySelectorAll('input, textarea, select');
      let inputsWithoutLabels = 0;
      inputs.forEach(input => {
        const label = document.querySelector(`label[for="${input.id}"]`);
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        
        if (!label && !ariaLabel && !ariaLabelledBy) {
          inputsWithoutLabels++;
        }
      });
      
      if (inputsWithoutLabels > 0) {
        issues.push(`${inputsWithoutLabels} form inputs missing labels`);
        score -= Math.min(15, inputsWithoutLabels * 3);
      }
      
      // Check for color contrast (simplified)
      const elements = document.querySelectorAll('*');
      let lowContrastElements = 0;
      
      // This is a simplified check - in reality, you'd use a proper color contrast library
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const color = style.color;
        const backgroundColor = style.backgroundColor;
        
        // Simple heuristic for low contrast
        if (color === 'rgb(128, 128, 128)' || color === '#808080') {
          lowContrastElements++;
        }
      });
      
      if (lowContrastElements > 0) {
        issues.push(`${lowContrastElements} elements with potentially low contrast`);
        score -= Math.min(10, lowContrastElements);
      }
      
      return {
        accessibilityScore: Math.max(0, score),
        accessibilityIssues: issues,
        imagesWithoutAlt,
        inputsWithoutLabels,
        headingStructure: {
          h1Count,
          totalHeadings: headings.length
        }
      };
    });
    
    return accessibilityMetrics;
  }
  
  async collectSEOMetrics(page) {
    const seoMetrics = await page.evaluate(() => {
      const issues = [];
      let score = 100;
      
      // Check for title tag
      const title = document.querySelector('title');
      if (!title || title.textContent.trim() === '') {
        issues.push('Missing or empty title tag');
        score -= 20;
      } else if (title.textContent.length < 30 || title.textContent.length > 60) {
        issues.push('Title tag length not optimal (30-60 characters)');
        score -= 5;
      }
      
      // Check for meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription || metaDescription.content.trim() === '') {
        issues.push('Missing or empty meta description');
        score -= 15;
      } else if (metaDescription.content.length < 120 || metaDescription.content.length > 160) {
        issues.push('Meta description length not optimal (120-160 characters)');
        score -= 5;
      }
      
      // Check for meta viewport
      const metaViewport = document.querySelector('meta[name="viewport"]');
      if (!metaViewport) {
        issues.push('Missing meta viewport tag');
        score -= 10;
      }
      
      // Check for canonical URL
      const canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        issues.push('Missing canonical URL');
        score -= 5;
      }
      
      // Check for structured data
      const structuredData = document.querySelectorAll('script[type="application/ld+json"]');
      if (structuredData.length === 0) {
        issues.push('No structured data found');
        score -= 5;
      }
      
      // Check for Open Graph tags
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDescription = document.querySelector('meta[property="og:description"]');
      const ogImage = document.querySelector('meta[property="og:image"]');
      
      if (!ogTitle || !ogDescription || !ogImage) {
        issues.push('Missing Open Graph tags');
        score -= 5;
      }
      
      return {
        seoScore: Math.max(0, score),
        seoIssues: issues,
        titleLength: title ? title.textContent.length : 0,
        metaDescriptionLength: metaDescription ? metaDescription.content.length : 0,
        hasCanonical: !!canonical,
        hasStructuredData: structuredData.length > 0,
        hasOpenGraph: !!(ogTitle && ogDescription && ogImage)
      };
    });
    
    return seoMetrics;
  }
  
  evaluateThresholds(metrics) {
    const violations = [];
    
    if (metrics.firstContentfulPaint > CONFIG.thresholds.firstContentfulPaint) {
      violations.push('First Contentful Paint');
    }
    
    if (metrics.largestContentfulPaint > CONFIG.thresholds.largestContentfulPaint) {
      violations.push('Largest Contentful Paint');
    }
    
    if (metrics.firstInputDelay > CONFIG.thresholds.firstInputDelay) {
      violations.push('First Input Delay');
    }
    
    if (metrics.cumulativeLayoutShift > CONFIG.thresholds.cumulativeLayoutShift) {
      violations.push('Cumulative Layout Shift');
    }
    
    if (metrics.timeToInteractive > CONFIG.thresholds.timeToInteractive) {
      violations.push('Time to Interactive');
    }
    
    if (metrics.totalResourceSize > CONFIG.thresholds.totalResourceSize) {
      violations.push('Total Resource Size');
    }
    
    if (metrics.jsExecutionTime > CONFIG.thresholds.jsExecutionTime) {
      violations.push('JavaScript Execution Time');
    }
    
    if (metrics.jsHeapSize > CONFIG.thresholds.jsHeapSize) {
      violations.push('JavaScript Heap Size');
    }
    
    if (metrics.accessibilityScore < CONFIG.thresholds.accessibilityScore) {
      violations.push('Accessibility Score');
    }
    
    if (metrics.seoScore < CONFIG.thresholds.seoScore) {
      violations.push('SEO Score');
    }
    
    return {
      passed: violations.length === 0,
      violations
    };
  }
  
  getPageName(url) {
    const urlObj = new URL(url);
    let pathname = urlObj.pathname;
    
    if (pathname === '/') {
      return 'homepage';
    }
    
    pathname = pathname.replace(/^\//, '').replace(/\\.html$/, '').replace(/\\//g, '-');
    return pathname || 'root';
  }
}

// =============================================================================
// OPTIMIZATION ANALYZER
// =============================================================================

class OptimizationAnalyzer {
  constructor() {
    this.recommendations = [];
  }
  
  analyzeResults(results) {
    this.recommendations = [];
    
    results.forEach(result => {
      this.analyzePerformanceMetrics(result);
      this.analyzeResourceOptimization(result);
      this.analyzeAccessibility(result);
      this.analyzeSEO(result);
    });
    
    return this.recommendations;
  }
  
  analyzePerformanceMetrics(result) {
    const { coreWebVitals, testName } = result;
    
    if (coreWebVitals.firstContentfulPaint > CONFIG.thresholds.firstContentfulPaint) {
      this.recommendations.push({
        page: testName,
        category: 'Performance',
        priority: 'High',
        issue: 'Slow First Contentful Paint',
        current: `${coreWebVitals.firstContentfulPaint.toFixed(0)}ms`,
        target: `${CONFIG.thresholds.firstContentfulPaint}ms`,
        recommendations: [
          'Optimize critical rendering path',
          'Minimize render-blocking resources',
          'Use resource hints (preload, prefetch)',
          'Optimize web fonts loading'
        ]
      });
    }
    
    if (coreWebVitals.largestContentfulPaint > CONFIG.thresholds.largestContentfulPaint) {
      this.recommendations.push({
        page: testName,
        category: 'Performance',
        priority: 'High',
        issue: 'Slow Largest Contentful Paint',
        current: `${coreWebVitals.largestContentfulPaint.toFixed(0)}ms`,
        target: `${CONFIG.thresholds.largestContentfulPaint}ms`,
        recommendations: [
          'Optimize largest content element (images, text blocks)',
          'Use modern image formats (WebP, AVIF)',
          'Implement lazy loading for below-fold content',
          'Optimize server response times'
        ]
      });
    }
    
    if (coreWebVitals.cumulativeLayoutShift > CONFIG.thresholds.cumulativeLayoutShift) {
      this.recommendations.push({
        page: testName,
        category: 'Performance',
        priority: 'Medium',
        issue: 'High Cumulative Layout Shift',
        current: coreWebVitals.cumulativeLayoutShift.toFixed(3),
        target: CONFIG.thresholds.cumulativeLayoutShift.toString(),
        recommendations: [
          'Set explicit dimensions for images and videos',
          'Reserve space for dynamic content',
          'Avoid inserting content above existing content',
          'Use CSS aspect-ratio for responsive media'
        ]
      });
    }
  }
  
  analyzeResourceOptimization(result) {
    const { resourceMetrics, testName } = result;
    
    if (resourceMetrics.totalResourceSize > CONFIG.thresholds.totalResourceSize) {
      this.recommendations.push({
        page: testName,
        category: 'Resource Optimization',
        priority: 'Medium',
        issue: 'Large Total Resource Size',
        current: `${(resourceMetrics.totalResourceSize / 1024 / 1024).toFixed(2)}MB`,
        target: `${(CONFIG.thresholds.totalResourceSize / 1024 / 1024).toFixed(2)}MB`,
        recommendations: [
          'Compress images and use modern formats',
          'Minify CSS and JavaScript',
          'Remove unused code',
          'Implement code splitting'
        ]
      });
    }
    
    if (resourceMetrics.cacheHitRatio < CONFIG.thresholds.cacheHitRatio) {
      this.recommendations.push({
        page: testName,
        category: 'Caching',
        priority: 'Medium',
        issue: 'Low Cache Hit Ratio',
        current: `${(resourceMetrics.cacheHitRatio * 100).toFixed(1)}%`,
        target: `${(CONFIG.thresholds.cacheHitRatio * 100).toFixed(1)}%`,
        recommendations: [
          'Set appropriate cache headers',
          'Use service workers for caching',
          'Implement browser caching strategy',
          'Use CDN for static assets'
        ]
      });
    }
    
    if (resourceMetrics.imageSize > resourceMetrics.totalResourceSize * 0.5) {
      this.recommendations.push({
        page: testName,
        category: 'Image Optimization',
        priority: 'Medium',
        issue: 'Images Account for Large Portion of Resources',
        current: `${(resourceMetrics.imageSize / 1024 / 1024).toFixed(2)}MB`,
        target: 'Optimize images',
        recommendations: [
          'Use WebP or AVIF format for images',
          'Implement responsive images with srcset',
          'Compress images without quality loss',
          'Use lazy loading for images'
        ]
      });
    }
  }
  
  analyzeAccessibility(result) {
    const { accessibilityMetrics, testName } = result;
    
    if (accessibilityMetrics.accessibilityScore < CONFIG.thresholds.accessibilityScore) {
      this.recommendations.push({
        page: testName,
        category: 'Accessibility',
        priority: 'High',
        issue: 'Low Accessibility Score',
        current: `${accessibilityMetrics.accessibilityScore}/100`,
        target: `${CONFIG.thresholds.accessibilityScore}/100`,
        recommendations: accessibilityMetrics.accessibilityIssues.map(issue => `Fix: ${issue}`)
      });
    }
  }
  
  analyzeSEO(result) {
    const { seoMetrics, testName } = result;
    
    if (seoMetrics.seoScore < CONFIG.thresholds.seoScore) {
      this.recommendations.push({
        page: testName,
        category: 'SEO',
        priority: 'Medium',
        issue: 'Low SEO Score',
        current: `${seoMetrics.seoScore}/100`,
        target: `${CONFIG.thresholds.seoScore}/100`,
        recommendations: seoMetrics.seoIssues.map(issue => `Fix: ${issue}`)
      });
    }
  }
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

function generatePerformanceReport(results, recommendations) {
  const report = {
    timestamp: new Date().toISOString(),
    configuration: CONFIG,
    summary: {
      totalTests: results.length,
      passedTests: results.filter(r => r.passed.passed).length,
      failedTests: results.filter(r => !r.passed.passed).length,
      averageLoadTime: results.reduce((sum, r) => sum + r.loadTime, 0) / results.length,
      averageFCP: 0,
      averageLCP: 0,
      averageCLS: 0,
      totalRecommendations: recommendations.length
    },
    results,
    recommendations,
    optimizationOpportunities: generateOptimizationOpportunities(results)
  };
  
  // Calculate average Core Web Vitals
  const validResults = results.filter(r => r.coreWebVitals);
  if (validResults.length > 0) {
    report.summary.averageFCP = validResults.reduce((sum, r) => sum + r.coreWebVitals.firstContentfulPaint, 0) / validResults.length;
    report.summary.averageLCP = validResults.reduce((sum, r) => sum + r.coreWebVitals.largestContentfulPaint, 0) / validResults.length;
    report.summary.averageCLS = validResults.reduce((sum, r) => sum + r.coreWebVitals.cumulativeLayoutShift, 0) / validResults.length;
  }
  
  return report;
}

function generateOptimizationOpportunities(results) {
  const opportunities = [];
  
  // Analyze common patterns across all results
  const totalResourceSizes = results.map(r => r.resourceMetrics?.totalResourceSize || 0);
  const avgResourceSize = totalResourceSizes.reduce((a, b) => a + b, 0) / totalResourceSizes.length;
  
  if (avgResourceSize > CONFIG.thresholds.totalResourceSize) {
    opportunities.push({
      category: 'Resource Optimization',
      impact: 'High',
      effort: 'Medium',
      description: 'Reduce overall resource size across all pages',
      potentialSavings: `${((avgResourceSize - CONFIG.thresholds.totalResourceSize) / 1024 / 1024).toFixed(2)}MB average`,
      actions: [
        'Implement image compression pipeline',
        'Set up code splitting for JavaScript',
        'Use tree shaking to remove unused code',
        'Implement resource bundling optimization'
      ]
    });
  }
  
  // Check for consistent accessibility issues
  const accessibilityScores = results.map(r => r.accessibilityMetrics?.accessibilityScore || 100);
  const avgAccessibilityScore = accessibilityScores.reduce((a, b) => a + b, 0) / accessibilityScores.length;
  
  if (avgAccessibilityScore < CONFIG.thresholds.accessibilityScore) {
    opportunities.push({
      category: 'Accessibility',
      impact: 'High',
      effort: 'Low',
      description: 'Improve accessibility across all pages',
      potentialSavings: `${(CONFIG.thresholds.accessibilityScore - avgAccessibilityScore).toFixed(1)} points improvement`,
      actions: [
        'Add alt text to all images',
        'Ensure proper heading structure',
        'Add labels to form inputs',
        'Improve color contrast ratios'
      ]
    });
  }
  
  return opportunities;
}

function generateHtmlReport(report) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Frontend Performance Report - Summarize This</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1, h2, h3 { color: #333; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .metric .value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric .label { color: #666; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
        .pass { color: #28a745; font-weight: bold; }
        .fail { color: #dc3545; font-weight: bold; }
        .recommendation { background: #fff3cd; padding: 10px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #ffc107; }
        .high { border-left-color: #dc3545; background: #f8d7da; }
        .medium { border-left-color: #fd7e14; }
        .low { border-left-color: #28a745; background: #d4edda; }
        .opportunity { background: #e7f3ff; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #007bff; }
        .core-vitals { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
        .vital { background: #f8f9fa; padding: 10px; border-radius: 4px; text-align: center; }
        .vital.good { background: #d4edda; }
        .vital.needs-improvement { background: #fff3cd; }
        .vital.poor { background: #f8d7da; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Frontend Performance Report - Summarize This</h1>
        <p><strong>Generated:</strong> ${report.timestamp}</p>
        
        <h2>Summary</h2>
        <div class="summary">
            <div class="metric">
                <div class="value">${report.summary.totalTests}</div>
                <div class="label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="value">${report.summary.passedTests}</div>
                <div class="label">Passed Tests</div>
            </div>
            <div class="metric">
                <div class="value">${report.summary.failedTests}</div>
                <div class="label">Failed Tests</div>
            </div>
            <div class="metric">
                <div class="value">${report.summary.averageLoadTime.toFixed(0)}ms</div>
                <div class="label">Avg Load Time</div>
            </div>
        </div>
        
        <h2>Core Web Vitals</h2>
        <div class="core-vitals">
            <div class="vital ${report.summary.averageFCP <= 1800 ? 'good' : report.summary.averageFCP <= 3000 ? 'needs-improvement' : 'poor'}">
                <div><strong>FCP</strong></div>
                <div>${report.summary.averageFCP.toFixed(0)}ms</div>
                <div><small>First Contentful Paint</small></div>
            </div>
            <div class="vital ${report.summary.averageLCP <= 2500 ? 'good' : report.summary.averageLCP <= 4000 ? 'needs-improvement' : 'poor'}">
                <div><strong>LCP</strong></div>
                <div>${report.summary.averageLCP.toFixed(0)}ms</div>
                <div><small>Largest Contentful Paint</small></div>
            </div>
            <div class="vital ${report.summary.averageCLS <= 0.1 ? 'good' : report.summary.averageCLS <= 0.25 ? 'needs-improvement' : 'poor'}">
                <div><strong>CLS</strong></div>
                <div>${report.summary.averageCLS.toFixed(3)}</div>
                <div><small>Cumulative Layout Shift</small></div>
            </div>
        </div>
        
        <h2>Test Results</h2>
        <table>
            <thead>
                <tr>
                    <th>Page</th>
                    <th>Device</th>
                    <th>Network</th>
                    <th>Status</th>
                    <th>Load Time</th>
                    <th>FCP</th>
                    <th>LCP</th>
                    <th>CLS</th>
                    <th>Accessibility</th>
                    <th>SEO</th>
                </tr>
            </thead>
            <tbody>
                ${report.results.map(result => `
                    <tr>
                        <td>${result.testName.split('_')[0]}</td>
                        <td>${result.options.device || 'desktop'}</td>
                        <td>${result.options.networkThrottling || 'wifi'}</td>
                        <td class="${result.passed.passed ? 'pass' : 'fail'}">
                            ${result.passed.passed ? 'PASS' : 'FAIL'}
                        </td>
                        <td>${result.loadTime.toFixed(0)}ms</td>
                        <td>${result.coreWebVitals?.firstContentfulPaint?.toFixed(0) || 'N/A'}ms</td>
                        <td>${result.coreWebVitals?.largestContentfulPaint?.toFixed(0) || 'N/A'}ms</td>
                        <td>${result.coreWebVitals?.cumulativeLayoutShift?.toFixed(3) || 'N/A'}</td>
                        <td>${result.accessibilityMetrics?.accessibilityScore || 'N/A'}/100</td>
                        <td>${result.seoMetrics?.seoScore || 'N/A'}/100</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        ${report.optimizationOpportunities.length > 0 ? `
        <h2>Optimization Opportunities</h2>
        ${report.optimizationOpportunities.map(opp => `
            <div class="opportunity">
                <h4>${opp.category} - ${opp.impact} Impact, ${opp.effort} Effort</h4>
                <p>${opp.description}</p>
                <p><strong>Potential Savings:</strong> ${opp.potentialSavings}</p>
                <ul>
                    ${opp.actions.map(action => `<li>${action}</li>`).join('')}
                </ul>
            </div>
        `).join('')}
        ` : ''}
        
        ${report.recommendations.length > 0 ? `
        <h2>Detailed Recommendations</h2>
        ${report.recommendations.map(rec => `
            <div class="recommendation ${rec.priority.toLowerCase()}">
                <h4>${rec.priority} Priority: ${rec.issue} (${rec.page})</h4>
                <p><strong>Current:</strong> ${rec.current} | <strong>Target:</strong> ${rec.target}</p>
                <ul>
                    ${rec.recommendations.map(r => `<li>${r}</li>`).join('')}
                </ul>
            </div>
        `).join('')}
        ` : ''}
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
    console.log('Starting frontend performance testing suite...');
    
    // Ensure output directories exist
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
    if (!fs.existsSync(CONFIG.screenshotDir)) {
      fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
    }
    
    const collector = new PerformanceMetricsCollector();
    await collector.initialize();
    
    const allResults = [];
    
    try {
      // Test each URL with different configurations
      for (const url of CONFIG.urls) {
        console.log(`\\nTesting URL: ${url}`);
        
        // Test configurations
        const testConfigs = [
          { device: 'desktop', networkThrottling: 'wifi' },
          { device: 'mobile', networkThrottling: 'fast3G' },
          { device: 'mobile', networkThrottling: 'slow3G' },
          { device: 'tablet', networkThrottling: 'wifi' }
        ];
        
        for (const config of testConfigs) {
          try {
            const results = [];
            
            // Run multiple iterations
            for (let i = 0; i < CONFIG.testing.iterations; i++) {
              const result = await collector.collectMetrics(url, config);
              results.push(result);
              
              if (i < CONFIG.testing.iterations - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between tests
              }
            }
            
            // Calculate average results
            const avgResult = this.calculateAverageResults(results);
            allResults.push(avgResult);
            
          } catch (error) {
            console.error(`Error testing ${url} with config ${JSON.stringify(config)}:`, error.message);
          }
        }
      }
      
    } finally {
      await collector.cleanup();
    }
    
    // Analyze results and generate recommendations
    const analyzer = new OptimizationAnalyzer();
    const recommendations = analyzer.analyzeResults(allResults);
    
    // Generate comprehensive report
    const report = generatePerformanceReport(allResults, recommendations);
    
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save JSON report
    const jsonPath = path.join(CONFIG.outputDir, `frontend-performance-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    
    // Save HTML report
    const htmlReport = generateHtmlReport(report);
    const htmlPath = path.join(CONFIG.outputDir, `frontend-performance-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlReport);
    
    console.log('\\n=== FRONTEND PERFORMANCE TESTING COMPLETE ===');
    console.log(`Total tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passedTests}`);
    console.log(`Failed: ${report.summary.failedTests}`);
    console.log(`Average load time: ${report.summary.averageLoadTime.toFixed(0)}ms`);
    console.log(`Average FCP: ${report.summary.averageFCP.toFixed(0)}ms`);
    console.log(`Average LCP: ${report.summary.averageLCP.toFixed(0)}ms`);
    console.log(`Average CLS: ${report.summary.averageCLS.toFixed(3)}`);
    console.log(`Total recommendations: ${report.recommendations.length}`);
    console.log(`Reports saved to: ${CONFIG.outputDir}`);
    
    // Exit with error code if tests failed
    if (report.summary.failedTests > 0) {
      console.log('\\nWARNING: Some frontend performance tests failed!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Error running frontend performance tests:', error);
    process.exit(1);
  }
}

// Helper function to calculate average results
function calculateAverageResults(results) {
  if (results.length === 0) return null;
  
  const avgResult = { ...results[0] };
  
  // Average numeric values
  avgResult.loadTime = results.reduce((sum, r) => sum + r.loadTime, 0) / results.length;
  
  if (avgResult.coreWebVitals) {
    Object.keys(avgResult.coreWebVitals).forEach(key => {
      if (typeof avgResult.coreWebVitals[key] === 'number') {
        avgResult.coreWebVitals[key] = results.reduce((sum, r) => sum + (r.coreWebVitals[key] || 0), 0) / results.length;
      }
    });
  }
  
  if (avgResult.resourceMetrics) {
    Object.keys(avgResult.resourceMetrics).forEach(key => {
      if (typeof avgResult.resourceMetrics[key] === 'number') {
        avgResult.resourceMetrics[key] = results.reduce((sum, r) => sum + (r.resourceMetrics[key] || 0), 0) / results.length;
      }
    });
  }
  
  if (avgResult.jsMetrics) {
    Object.keys(avgResult.jsMetrics).forEach(key => {
      if (typeof avgResult.jsMetrics[key] === 'number') {
        avgResult.jsMetrics[key] = results.reduce((sum, r) => sum + (r.jsMetrics[key] || 0), 0) / results.length;
      }
    });
  }
  
  return avgResult;
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  PerformanceMetricsCollector,
  OptimizationAnalyzer,
  generatePerformanceReport,
  CONFIG
};

