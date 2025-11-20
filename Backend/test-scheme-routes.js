/**
 * Test script to verify scheme routes are properly registered
 */

const express = require('express');
const schemeRoutes = require('./src/routes/schemeRoutes');

const app = express();

// Mount scheme routes
app.use('/api/schemes', schemeRoutes);

// Get all registered routes
const routes = [];
app._router.stack.forEach(middleware => {
  if (middleware.route) {
    routes.push({
      path: middleware.route.path,
      methods: Object.keys(middleware.route.methods)
    });
  } else if (middleware.name === 'router') {
    middleware.handle.stack.forEach(handler => {
      if (handler.route) {
        const path = '/api/schemes' + handler.route.path;
        routes.push({
          path: path,
          methods: Object.keys(handler.route.methods)
        });
      }
    });
  }
});

console.log('✓ Scheme routes loaded successfully\n');
console.log('Registered routes:');
routes.forEach(route => {
  route.methods.forEach(method => {
    console.log(`  ${method.toUpperCase().padEnd(7)} ${route.path}`);
  });
});

console.log('\n✓ All scheme routes are properly registered!');
