export default {
  base: './',
  build: {
    target: 'es2022',
    rollupOptions: { input: { main: 'index.html', aqua: 'aqua.html' } },
  },
};
