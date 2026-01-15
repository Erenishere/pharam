/**
 * Carton Configuration
 * Phase 2 - Requirement 28: Automatic Carton Quantity Calculation
 */

module.exports = {
    // Default number of boxes per carton
    // Can be overridden via environment variable
    defaultBoxesPerCarton: parseInt(process.env.BOXES_PER_CARTON, 10) || 12,

    // Enable item-level carton configuration (future enhancement)
    enableItemLevelCartonConfig: process.env.ENABLE_ITEM_CARTON_CONFIG === 'true',
};
