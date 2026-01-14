const Item = require('../models/Item');
const boxUnitConversionService = require('./boxUnitConversionService');

/**
 * Box/Unit Report Service
 * Phase 2 - Requirement 12.5 - Task 45.5
 */
class BoxUnitReportService {
  /**
   * Get stock report in box/unit format for all items
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Stock report
   */
  async getBoxUnitStockReport(filters = {}) {
    const { category, lowStock, includeInactive } = filters;

    const query = {};

    if (category) {
      query.category = category;
    }

    if (!includeInactive) {
      query.isActive = true;
    }

    const items = await Item.find(query).sort({ code: 1 }).lean();

    const stockData = items.map((item) => {
      const currentStock = item.inventory?.currentStock || 0;
      const packSize = item.packSize || 1;
      const minimumStock = item.inventory?.minimumStock || 0;

      const conversion = boxUnitConversionService.convertUnitsToBoxes(currentStock, packSize);
      const isLowStock = currentStock <= minimumStock;

      return {
        itemId: item._id,
        code: item.code,
        name: item.name,
        category: item.category,
        packSize,
        currentStock: {
          units: currentStock,
          boxes: conversion.boxes,
          remainingUnits: conversion.remainingUnits,
          display: boxUnitConversionService.formatBoxUnitDisplay(
            conversion.boxes,
            conversion.remainingUnits
          ),
        },
        minimumStock,
        isLowStock,
        isActive: item.isActive,
      };
    });

    // Filter by low stock if requested
    const filteredData = lowStock ? stockData.filter((item) => item.isLowStock) : stockData;

    return {
      reportType: 'box_unit_stock',
      generatedAt: new Date(),
      filters,
      summary: {
        totalItems: filteredData.length,
        lowStockItems: filteredData.filter((item) => item.isLowStock).length,
      },
      items: filteredData,
    };
  }

  /**
   * Get box/unit stock report for a specific item
   * @param {string} itemId - Item ID
   * @returns {Promise<Object>} Item stock details
   */
  async getItemBoxUnitStock(itemId) {
    const item = await Item.findById(itemId).lean();

    if (!item) {
      throw new Error('Item not found');
    }

    const currentStock = item.inventory?.currentStock || 0;
    const packSize = item.packSize || 1;
    const minimumStock = item.inventory?.minimumStock || 0;
    const maximumStock = item.inventory?.maximumStock || 0;

    const conversion = boxUnitConversionService.convertUnitsToBoxes(currentStock, packSize);
    const minConversion = boxUnitConversionService.convertUnitsToBoxes(minimumStock, packSize);
    const maxConversion = boxUnitConversionService.convertUnitsToBoxes(maximumStock, packSize);

    return {
      itemId: item._id,
      code: item.code,
      name: item.name,
      category: item.category,
      unit: item.unit,
      packSize,
      currentStock: {
        units: currentStock,
        boxes: conversion.boxes,
        remainingUnits: conversion.remainingUnits,
        display: boxUnitConversionService.formatBoxUnitDisplay(
          conversion.boxes,
          conversion.remainingUnits
        ),
      },
      minimumStock: {
        units: minimumStock,
        boxes: minConversion.boxes,
        remainingUnits: minConversion.remainingUnits,
        display: boxUnitConversionService.formatBoxUnitDisplay(
          minConversion.boxes,
          minConversion.remainingUnits
        ),
      },
      maximumStock: {
        units: maximumStock,
        boxes: maxConversion.boxes,
        remainingUnits: maxConversion.remainingUnits,
        display: boxUnitConversionService.formatBoxUnitDisplay(
          maxConversion.boxes,
          maxConversion.remainingUnits
        ),
      },
      stockStatus: this.getStockStatus(currentStock, minimumStock, maximumStock),
      isActive: item.isActive,
    };
  }

  /**
   * Get stock status
   * @param {number} current - Current stock
   * @param {number} minimum - Minimum stock
   * @param {number} maximum - Maximum stock
   * @returns {string} Stock status
   */
  getStockStatus(current, minimum, maximum) {
    if (current <= 0) return 'out_of_stock';
    if (current <= minimum) return 'low_stock';
    if (current >= maximum) return 'overstock';
    return 'in_stock';
  }

  /**
   * Get box/unit stock comparison report
   * Compare stock levels across multiple items
   * @param {Array} itemIds - Array of item IDs
   * @returns {Promise<Object>} Comparison report
   */
  async getBoxUnitStockComparison(itemIds) {
    if (!itemIds || itemIds.length === 0) {
      throw new Error('At least one item ID is required');
    }

    const items = await Item.find({ _id: { $in: itemIds } }).lean();

    const comparison = items.map((item) => {
      const currentStock = item.inventory?.currentStock || 0;
      const packSize = item.packSize || 1;

      const conversion = boxUnitConversionService.convertUnitsToBoxes(currentStock, packSize);

      return {
        itemId: item._id,
        code: item.code,
        name: item.name,
        packSize,
        currentStockUnits: currentStock,
        currentStockBoxes: conversion.boxes,
        remainingUnits: conversion.remainingUnits,
        display: boxUnitConversionService.formatBoxUnitDisplay(
          conversion.boxes,
          conversion.remainingUnits
        ),
      };
    });

    return {
      reportType: 'box_unit_comparison',
      generatedAt: new Date(),
      itemCount: comparison.length,
      items: comparison,
    };
  }
}

module.exports = new BoxUnitReportService();
