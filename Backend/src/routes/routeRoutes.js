const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const { authenticate, authorize } = require('../middleware/auth');

// Protect all routes
router.use(authenticate);

// Routes
router
    .route('/')
    .post(authorize('admin', 'manager'), routeController.createRoute)
    .get(routeController.getRoutes);

router
    .route('/:id')
    .get(routeController.getRouteById)
    .put(authorize('admin', 'manager'), routeController.updateRoute)
    .delete(authorize('admin', 'manager'), routeController.deleteRoute);

router.post('/:id/assign', authorize('admin', 'manager'), routeController.assignSalesman);

module.exports = router;
