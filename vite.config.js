import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Базовый путь для production
  base: './',
  
  // Настройки сервера разработки
  server: {
    port: 5173,
    open: true,
    cors: true
  },
  
  // Настройки сборки
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    
    // Минификация
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Удаляем все console.* в production
        drop_debugger: true,
        pure_funcs: ['console.info', 'console.debug', 'console.trace'],
        passes: 2 // Дополнительный проход для лучшей минификации
      },
      mangle: {
        safari10: true // Совместимость с Safari 10+
      }
    },
    
    // CSS минификация
    cssMinify: true,
    
    // Оптимизация
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        // Разделение на чанки
        manualChunks: (id) => {
          // Вендоры
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'vendor';
            return 'vendor';
          }
          // Админ модули (редко используются)
          if (id.includes('/admin-')) return 'admin';
          // Сравнение товаров
          if (id.includes('/compare-')) return 'compare';
          // Утилиты
          if (id.includes('/i18n.js') || id.includes('/theme.js') || id.includes('/form-validation.js')) {
            return 'utils';
          }
          // Калькулятор
          if (id.includes('/calculator.js')) return 'calculator';
        },
        // Именование файлов
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
      // Не обрабатывать legacy скрипты (IIFE)
      external: []
    },
    
    // Увеличиваем лимит для предупреждений
    chunkSizeWarningLimit: 500,
    
    // Source maps для production (опционально)
    sourcemap: false,
    
    // Tree-shaking и code splitting
    target: 'es2020',
    modulePreload: {
      polyfill: true
    }
  },
  
  // Оптимизация зависимостей
  optimizeDeps: {
    include: ['@supabase/supabase-js']
  },
  
  // CSS настройки
  css: {
    devSourcemap: true,
    // Минификация CSS в production
    postcss: {
      plugins: [
        // PurgeCSS будет удалять неиспользуемые стили
      ]
    }
  },
  
  // Экспериментальные функции для оптимизации
  experimental: {
    renderBuiltUrl(filename) {
      return '/' + filename;
    }
  }
});
