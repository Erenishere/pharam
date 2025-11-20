const salesmanService = require('../services/salesmanService');

/**
 * Salesman Controller
 * Handles HTTP requests for salesman operations
 */
class SalesmanController {
  /**
   * Create salesman
   * POST /api/v1/salesmen
   */
  async createSalesman(req, res) {
    try {
      const salesmanData = {
        ...req.body,
        createdBy: req.user.id,
      };

      const salesman = await salesmanService.createSalesman(salesmanData);

      res.status(201).json({
        success: true,
        message: 'Salesman created successfully',
        data: { salesman },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to create salesman',
        message: error.message,
      });
    }
  }

  /**
   * Get all salesmen
   * GET /api/v1/salesmen
   */
  async getAllSalesmen(req, res) {
    try {
      const { isActive, routeId, search, page, limit, sort } = req.query;

      const filters = {
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        routeId,
        search,
      };

      const options = {
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 50,
        sort: sort || 'name',
      };

      const result = await salesmanService.getSalesmen(filters, options);

      res.status(200).json({
        success: true,
        message: 'Salesmen retrieved successfully',
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to retrieve salesmen',
        message: error.message,
      });
    }
  }

  /**
   * Get salesman by ID
   * GET /api/v1/salesmen/:id
   */
  async getSalesmanById(req, res) {
    try {
      const { id } = req.params;
      const salesman = await salesmanService.getSalesmanById(id);

      res.status(200).json({
        success: true,
        message: 'Salesman retrieved successfully',
        data: { salesman },
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'Salesman not found',
        message: error.message,
      });
    }
  }

  /**
   * Update salesman
   * PUT /api/v1/salesmen/:id
   */
  async updateSalesman(req, res) {
    try {
      const { id } = req.params;
      const salesman = await salesmanService.updateSalesman(id, req.body);

      res.status(200).json({
        success: true,
        message: 'Salesman updated successfully',
        data: { salesman },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to update salesman',
        message: error.message,
      });
    }
  }

  /**
   * Delete salesman
   * DELETE /api/v1/salesmen/:id
   */
  async deleteSalesman(req, res) {
    try {
      const { id } = req.params;
      const salesman = await salesmanService.deleteSalesman(id);

      res.status(200).json({
        success: true,
        message: 'Salesman deleted successfully',
        data: { salesman },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Failed to delete salesman',
        message: error.message,
      });
    }
  }

  /**
   * Get salesman by code
   * GET /api/v1/salesmen/code/:code
   */
  async getSalesmanByCode(req, res) {
    try {
      const { code } = req.params;
      const salesman = await salesmanService.getSalesmanByCode(code);

      res.status(200).json({
        success: true,
        message: 'Salesman retrieved successfully',
        data: { salesman },
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'Salesman not found',
        message: error.message,
      });
    }
  }
}

module.exports = new SalesmanController();
