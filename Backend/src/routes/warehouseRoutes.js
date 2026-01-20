const express = require('express');
const warehouseController = require('../controllers/warehouseController');
const batchController = require('../controllers/batchController');
const auth = require('../middleware/auth');

const router = express.Router();

// Protect all routes after this middleware
router.use(auth.authenticate);

// Restrict the following routes to admin users only
router.use(auth.authorize(['admin', 'inventory-manager']));

router
  .route('/')
  .get(warehouseController.getAllWarehouses)
  .post(warehouseController.createWarehouse);

router
  .route('/:id')
  .get(warehouseController.getWarehouse)
  .put(warehouseController.updateWarehouse)
  .patch(warehouseController.updateWarehouse)
  .delete(warehouseController.deleteWarehouse);

router.patch('/:id/toggle-status', warehouseController.toggleWarehouseStatus);
router.get('/statistics', warehouseController.getWarehouseStatistics);
router.get('/:id/batches', batchController.getBatchesByLocation);

module.exports = router;
