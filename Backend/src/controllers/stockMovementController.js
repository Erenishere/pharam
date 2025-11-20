const stockMovementService = require('../services/stockMovementService');

/**
 * Stock Movement Controller
 * Handles HTTP requests for stock movement operations
 */
class StockMovementController {
  /**
   * Get all stock movements with filtering and pagination
   */
  async getMovements(req, res, next) {
    try {
      const { itemId, movementType, referenceType, startDate, endDate, page, limit, sortBy, sortOrder } = req.query;

      // Build filters
      const filters = {};
      if (itemId) filters.itemId = itemId;
      if (movementType) filters.movementType = movementType;
      if (referenceType) filters.referenceType = referenceType;
      if (startDate && endDate) {
        filters.movementDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      // Build options
      const options = {
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 50,
        sortBy: sortBy || 'movementDate',
        sortOrder: sortOrder || 'desc',
      };

      const result = await stockMovementService.getMovements(filters, options);

      res.status(200).json({
        success: true,
        data: result.movements,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get stock movement by ID
   */
  async getMovementById(req, res, next) {
    try {
      const { id } = req.params;

      const movement = await stockMovementService.getMovementById(id);

      res.status(200).json({
        success: true,
        data: movement,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get stock movements for a specific item
   */
  async getMovementsByItem(req, res, next) {
    try {
      const { itemId } = req.params;
      const { limit } = req.query;

      const movements = await stockMovementService.getMovementsByItem(
        itemId,
        parseInt(limit, 10) || 50
      );

      res.status(200).json({
        success: true,
        data: movements,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get stock movement history for an item
   */
  async getItemMovementHistory(req, res, next) {
    try {
      const { itemId } = req.params;
      const { days } = req.query;

      const history = await stockMovementService.getItemMovementHistory(
        itemId,
        parseInt(days, 10) || 30
      );

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get stock movements by date range
   */
  async getMovementsByDateRange(req, res, next) {
    try {
      const { startDate, endDate, itemId, movementType } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const filters = {};
      if (itemId) filters.itemId = itemId;
      if (movementType) filters.movementType = movementType;

      const movements = await stockMovementService.getMovementsByDateRange(
        new Date(startDate),
        new Date(endDate),
        filters
      );

      res.status(200).json({
        success: true,
        data: movements,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record stock adjustment
   */
  async recordAdjustment(req, res, next) {
    try {
      const { itemId, quantity, reason } = req.body;
      const userId = req.user.userId;

      if (!itemId || !quantity || !reason) {
        return res.status(400).json({
          success: false,
          message: 'Item ID, quantity, and reason are required',
        });
      }

      const movement = await stockMovementService.recordAdjustment(
        itemId,
        quantity,
        reason,
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Stock adjustment recorded successfully',
        data: movement,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record stock correction
   */
  async recordCorrection(req, res, next) {
    try {
      const { itemId, actualStock, reason } = req.body;
      const userId = req.user.userId;

      if (!itemId || actualStock === undefined || !reason) {
        return res.status(400).json({
          success: false,
          message: 'Item ID, actual stock, and reason are required',
        });
      }

      const movement = await stockMovementService.recordCorrection(
        itemId,
        actualStock,
        reason,
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Stock correction recorded successfully',
        data: movement,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get stock balance for an item
   */
  async getStockBalance(req, res, next) {
    try {
      const { itemId } = req.params;
      const { asOfDate } = req.query;

      const balance = await stockMovementService.getStockBalance(
        itemId,
        asOfDate ? new Date(asOfDate) : new Date()
      );

      res.status(200).json({
        success: true,
        data: {
          itemId,
          balance,
          asOfDate: asOfDate || new Date(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get expired batches
   */
  async getExpiredBatches(req, res, next) {
    try {
      const batches = await stockMovementService.getExpiredBatches();

      res.status(200).json({
        success: true,
        data: batches,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get stock movement statistics
   */
  async getMovementStatistics(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      const stats = await stockMovementService.getMovementStatistics(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get item-wise movement report
   */
  async getItemWiseMovementReport(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await stockMovementService.getItemWiseMovementReport(
        new Date(startDate),
        new Date(endDate)
      );

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate stock availability
   */
  async validateStockAvailability(req, res, next) {
    try {
      const { itemId, quantity } = req.query;

      if (!itemId || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'Item ID and quantity are required',
        });
      }

      const validation = await stockMovementService.validateStockAvailability(
        itemId,
        parseInt(quantity, 10)
      );

      res.status(200).json({
        success: true,
        data: validation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(req, res, next) {
    try {
      const { days } = req.query;

      const items = await stockMovementService.getLowStockItems(
        parseInt(days, 10) || 30
      );

      res.status(200).json({
        success: true,
        data: items,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StockMovementController();
