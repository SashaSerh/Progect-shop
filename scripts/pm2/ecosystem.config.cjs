module.exports = {
  apps: [
    {
      name: 'progect-shop-vite',
      script: 'npm',
      args: 'run dev',
      cwd: '/Users/sa/Desktop/Progect-shop', // set to your project path if different
      env: {
        NODE_ENV: 'development',
        PORT: '5173'
      },
      watch: false,
      autorestart: true,
      max_restarts: 10
    }
  ]
};
