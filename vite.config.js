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
        drop_console: false, // Оставляем console.log для отладки
        drop_debugger: true
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
    sourcemap: false
  },
  
  // Оптимизация зависимостей
  optimizeDeps: {
    include: ['@supabase/supabase-js']
  },
  
  // CSS настройки
  css: {
    devSourcemap: true
  }
});
