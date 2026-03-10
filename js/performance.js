/**
 * Performance monitoring and Web Vitals tracking
 * Отслеживание метрик производительности
 */

// Web Vitals метрики
let metricsBuffer = {
  FCP: null,  // First Contentful Paint
  LCP: null,  // Largest Contentful Paint
  FID: null,  // First Input Delay
  CLS: null,  // Cumulative Layout Shift
  TTFB: null  // Time to First Byte
};

/**
 * Замер Web Vitals с использованием PerformanceObserver
 */
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined' || !window.PerformanceObserver) return;

  // First Contentful Paint (FCP)
  try {
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          metricsBuffer.FCP = entry.startTime;
          if (import.meta.env?.DEV) console.log('FCP:', entry.startTime.toFixed(2), 'ms');
          reportMetric('FCP', entry.startTime);
        }
      }
    });
    paintObserver.observe({ type: 'paint', buffered: true });
  } catch (e) {}

  // Largest Contentful Paint (LCP)
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      metricsBuffer.LCP = lastEntry.startTime;
      if (import.meta.env?.DEV) console.log('LCP:', lastEntry.startTime.toFixed(2), 'ms');
      reportMetric('LCP', lastEntry.startTime);
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {}

  // First Input Delay (FID)
  try {
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        metricsBuffer.FID = entry.processingStart - entry.startTime;
        if (import.meta.env?.DEV) console.log('FID:', metricsBuffer.FID.toFixed(2), 'ms');
        reportMetric('FID', metricsBuffer.FID);
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch (e) {}

  // Cumulative Layout Shift (CLS)
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      metricsBuffer.CLS = clsValue;
      if (import.meta.env?.DEV) console.log('CLS:', clsValue.toFixed(4));
      reportMetric('CLS', clsValue);
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {}

  // Time to First Byte (TTFB)
  try {
    const navigationEntry = performance.getEntriesByType('navigation')[0];
    if (navigationEntry) {
      metricsBuffer.TTFB = navigationEntry.responseStart - navigationEntry.requestStart;
      if (import.meta.env?.DEV) console.log('TTFB:', metricsBuffer.TTFB.toFixed(2), 'ms');
      reportMetric('TTFB', metricsBuffer.TTFB);
    }
  } catch (e) {}
}

/**
 * Отправка метрики в аналитику
 */
function reportMetric(name, value) {
  // Google Analytics 4
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'web_vitals', {
      event_category: 'Web Vitals',
      event_label: name,
      value: Math.round(value),
      non_interaction: true
    });
  }

  // Можно добавить отправку на собственный сервер
  // sendToAnalytics({ metric: name, value });
}

/**
 * Получить все собранные метрики
 */
export function getPerformanceMetrics() {
  return { ...metricsBuffer };
}

/**
 * Debounce функция для оптимизации событий
 * @param {Function} func - Функция для вызова
 * @param {number} wait - Задержка в мс
 * @param {boolean} immediate - Вызвать сразу первый раз
 */
export function debounce(func, wait = 300, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const context = this;
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

/**
 * Throttle функция для ограничения частоты вызовов
 * @param {Function} func - Функция для вызова
 * @param {number} limit - Минимальный интервал между вызовами в мс
 */
export function throttle(func, limit = 100) {
  let inThrottle;
  return function(...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Измерение времени выполнения функции
 */
export function measurePerformance(name, func) {
  const start = performance.now();
  const result = func();
  const end = performance.now();
  if (import.meta.env?.DEV) console.log(`⏱️ ${name}: ${(end - start).toFixed(2)}ms`);
  return result;
}

/**
 * Асинхронная версия measurePerformance
 */
export async function measurePerformanceAsync(name, func) {
  const start = performance.now();
  const result = await func();
  const end = performance.now();
  if (import.meta.env?.DEV) console.log(`⏱️ ${name}: ${(end - start).toFixed(2)}ms`);
  return result;
}

// Экспорт для использования в window (опционально)
if (typeof window !== 'undefined') {
  window.performanceUtils = {
    getMetrics: getPerformanceMetrics,
    debounce,
    throttle,
    measure: measurePerformance,
    measureAsync: measurePerformanceAsync
  };
}
