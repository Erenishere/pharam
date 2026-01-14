const express = require('express');
const schemeController = require('../controllers/schemeController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate);

// Scheme routes
router.post('/', schemeController.createScheme);
router.get('/', schemeController.getAllSchemes);
router.get('/:id', schemeController.getSchemeById);
router.get('/company/:companyId', schemeController.getSchemesByCompany);
router.put('/:id', schemeController.updateScheme);
router.delete('/:id', schemeController.deleteScheme);

// Additional utility endpoints
router.post('/:id/qualify', schemeController.checkSchemeQualification);
router.post('/applicable', schemeController.getApplicableSchemes);
router.post('/:id/calculate-bonus', schemeController.calculateSchemeBonus);

module.exports = router;