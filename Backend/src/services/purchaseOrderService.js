const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const Item = require('../models/Item');

/**
 * Purchase Order Service
 * Phase 2 - Requirement 10: Purchase Order Integration
 * Task 41.2: Create PurchaseOrder service
 */
class PurchaseOrderService {
  /**
   * Create a new purchase order
   * @param {Object} data - Purchase order data
   * @returns {Promise<Object>} Created purchase order
   */
  async createPurchaseOrder(data) {
    const { poNumber, supplierId, poDate, items, notes, createdBy } = data;

    // Validate supplier exists
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    // Validate all items exist
    const itemIds = items.map((item) => item.itemId);
    const existingItems = await Item.find({ _id: { $in: itemIds } });
    if (existingItems.length !== itemIds.length) {
      throw new Error('One or more items not found');
    }

    // Calculate line totals and order totals
    let subtotal = 0;
    const processedItems = items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;
      return {
        ...item,
        lineTotal,
        receivedQuantity: 0,
        pendingQuantity: item.quantity,
      };
    });

    // Create purchase order
    const purchaseOrder = await PurchaseOrder.create({
      poNumber,
      supplierId,
      poDate: poDate || new Date(),
      items: processedItems,
      subtotal,
      totalAmount: subtotal, // Can add tax calculation later if needed
      notes,
      createdBy,
      status: 'draft',
      fulfillmentStatus: 'pending',
    });

    return await PurchaseOrder.findById(purchaseOrder._id)
      .populate('supplierId', 'name code contactPerson phone email')
      .populate('items.itemId', 'name code unit')
      .populate('createdBy', 'username email');
  }

  /**
   * Get all purchase orders with optional filters
   * @param {Object} filters - Query filters
   * @returns {Promise<Array>} List of purchase orders
   */
  async getPurchaseOrders(filters = {}) {
    const {
      status,
      fulfillmentStatus,
      supplierId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sort = '-createdAt',
    } = filters;

    const query = { isDeleted: false };

    if (status) {
      query.status = status;
    }

    if (fulfillmentStatus) {
      query.fulfillmentStatus = fulfillmentStatus;
    }

    if (supplierId) {
      query.supplierId = supplierId;
    }

    if (startDate || endDate) {
      query.poDate = {};
      if (startDate) {
        query.poDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.poDate.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [purchaseOrders, total] = await Promise.all([
      PurchaseOrder.find(query)
        .populate('supplierId', 'name code contactPerson phone')
        .populate('items.itemId', 'name code unit')
        .populate('createdBy', 'username email')
        .populate('approvedBy', 'username email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      PurchaseOrder.countDocuments(query),
    ]);

    return {
      purchaseOrders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get purchase order by ID
   * @param {string} id - Purchase order ID
   * @returns {Promise<Object>} Purchase order
   */
  async getPurchaseOrderById(id) {
    const purchaseOrder = await PurchaseOrder.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate('supplierId', 'name code contactPerson phone email address city')
      .populate('items.itemId', 'name code unit purchasePrice')
      .populate('createdBy', 'username email')
      .populate('approvedBy', 'username email');

    if (!purchaseOrder) {
      throw new Error('Purchase order not found');
    }

    return purchaseOrder;
  }

  /**
   * Approve a purchase order
   * @param {string} id - Purchase order ID
   * @param {string} approvedBy - User ID who approved
   * @returns {Promise<Object>} Approved purchase order
   */
  async approvePurchaseOrder(id, approvedBy) {
    const purchaseOrder = await PurchaseOrder.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!purchaseOrder) {
      throw new Error('Purchase order not found');
    }

    if (purchaseOrder.status === 'approved') {
      throw new Error('Purchase order is already approved');
    }

    if (purchaseOrder.status === 'cancelled' || purchaseOrder.status === 'rejected') {
      throw new Error(`Cannot approve ${purchaseOrder.status} purchase order`);
    }

    purchaseOrder.status = 'approved';
    purchaseOrder.approvedBy = approvedBy;
    purchaseOrder.approvedAt = new Date();

    await purchaseOrder.save();

    return await this.getPurchaseOrderById(id);
  }

  /**
   * Update purchase order
   * @param {string} id - Purchase order ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated purchase order
   */
  async updatePurchaseOrder(id, data) {
    const purchaseOrder = await PurchaseOrder.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!purchaseOrder) {
      throw new Error('Purchase order not found');
    }

    if (purchaseOrder.status === 'approved') {
      throw new Error('Cannot update approved purchase order');
    }

    // Update allowed fields
    const allowedUpdates = ['poDate', 'items', 'notes', 'status'];
    allowedUpdates.forEach((field) => {
      if (data[field] !== undefined) {
        purchaseOrder[field] = data[field];
      }
    });

    // Recalculate totals if items changed
    if (data.items) {
      let subtotal = 0;
      purchaseOrder.items = data.items.map((item) => {
        const lineTotal = item.quantity * item.unitPrice;
        subtotal += lineTotal;
        return {
          ...item,
          lineTotal,
          receivedQuantity: item.receivedQuantity || 0,
          pendingQuantity: item.quantity - (item.receivedQuantity || 0),
        };
      });
      purchaseOrder.subtotal = subtotal;
      purchaseOrder.totalAmount = subtotal;
    }

    await purchaseOrder.save();

    return await this.getPurchaseOrderById(id);
  }

  /**
   * Delete (soft delete) a purchase order
   * @param {string} id - Purchase order ID
   * @returns {Promise<Object>} Deleted purchase order
   */
  async deletePurchaseOrder(id) {
    const purchaseOrder = await PurchaseOrder.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!purchaseOrder) {
      throw new Error('Purchase order not found');
    }

    if (purchaseOrder.status === 'approved') {
      throw new Error('Cannot delete approved purchase order');
    }

    purchaseOrder.isDeleted = true;
    await purchaseOrder.save();

    return { message: 'Purchase order deleted successfully' };
  }

  /**
   * Convert purchase order to invoice
   * Phase 2 - Requirement 10.2, 10.3 - Task 42.1
   * @param {string} poId - Purchase order ID
   * @param {Object} additionalData - Additional invoice data (optional)
   * @returns {Promise<Object>} Created invoice
   */
  async convertPOToInvoice(poId, additionalData = {}) {
    // Get purchase order
    const purchaseOrder = await this.getPurchaseOrderById(poId);

    // Validate PO is approved
    if (purchaseOrder.status !== 'approved') {
      throw new Error('Purchase order must be approved before conversion to invoice');
    }

    // Import Invoice model and purchaseInvoiceService
    const Invoice = require('../models/Invoice');
    const purchaseInvoiceService = require('./purchaseInvoiceService');

    // Prepare invoice data from PO
    const invoiceData = {
      invoiceType: 'purchase',
      supplierId: purchaseOrder.supplierId._id,
      invoiceDate: additionalData.invoiceDate || new Date(),
      supplierBillNo: additionalData.supplierBillNo || `PO-${purchaseOrder.poNumber}`,
      poNumber: purchaseOrder.poNumber,
      poId: purchaseOrder._id,
      items: purchaseOrder.items.map((item) => ({
        itemId: item.itemId._id,
        quantity: additionalData.partialQuantity ?
          (additionalData.itemQuantities?.[item.itemId._id.toString()] || item.pendingQuantity) :
          item.pendingQuantity,
        unitPrice: item.unitPrice,
        gstRate: additionalData.gstRate || 18, // Default to 18% if not specified
      })),
      notes: additionalData.notes || `Converted from PO: ${purchaseOrder.poNumber}`,
    };

    // Add optional fields if provided
    if (additionalData.dimension) {
      invoiceData.dimension = additionalData.dimension;
    }
    if (additionalData.biltyNo) {
      invoiceData.biltyNo = additionalData.biltyNo;
    }
    if (additionalData.biltyDate) {
      invoiceData.biltyDate = additionalData.biltyDate;
    }
    if (additionalData.transportCompany) {
      invoiceData.transportCompany = additionalData.transportCompany;
    }
    if (additionalData.transportCharges) {
      invoiceData.transportCharges = additionalData.transportCharges;
    }

    // Create purchase invoice
    const invoice = await purchaseInvoiceService.createPurchaseInvoice(invoiceData);

    // Update PO fulfillment after invoice creation
    await this.updatePOFulfillment(poId, invoice.items);

    return invoice;
  }

  /**
   * Update PO fulfillment tracking
   * Phase 2 - Requirement 10.4 - Task 43.1
   * @param {string} poId - Purchase order ID
   * @param {Array} invoiceItems - Invoice items with quantities
   * @returns {Promise<Object>} Updated purchase order
   */
  async updatePOFulfillment(poId, invoiceItems) {
    const purchaseOrder = await PurchaseOrder.findById(poId);

    if (!purchaseOrder) {
      throw new Error('Purchase order not found');
    }

    // Update received quantities for each item
    invoiceItems.forEach((invoiceItem) => {
      const poItem = purchaseOrder.items.find(
        (item) => item.itemId.toString() === invoiceItem.itemId.toString()
      );

      if (poItem) {
        poItem.receivedQuantity = (poItem.receivedQuantity || 0) + invoiceItem.quantity;
        poItem.pendingQuantity = poItem.quantity - poItem.receivedQuantity;
      }
    });

    // Update fulfillment status
    const allFulfilled = purchaseOrder.items.every(
      (item) => item.receivedQuantity >= item.quantity
    );
    const anyReceived = purchaseOrder.items.some((item) => item.receivedQuantity > 0);

    if (allFulfilled) {
      purchaseOrder.fulfillmentStatus = 'fulfilled';
    } else if (anyReceived) {
      purchaseOrder.fulfillmentStatus = 'partial';
    } else {
      purchaseOrder.fulfillmentStatus = 'pending';
    }

    await purchaseOrder.save();

    return await this.getPurchaseOrderById(poId);
  }

  /**
   * Get pending quantities for a purchase order
   * Phase 2 - Requirement 10.5 - Task 43.2
   * @param {string} poId - Purchase order ID
   * @returns {Promise<Object>} Pending quantities per item
   */
  async getPOPendingQuantities(poId) {
    const purchaseOrder = await this.getPurchaseOrderById(poId);

    const pendingQuantities = purchaseOrder.items.map((item) => ({
      itemId: item.itemId._id,
      itemName: item.itemId.name,
      itemCode: item.itemId.code,
      orderedQuantity: item.quantity,
      receivedQuantity: item.receivedQuantity || 0,
      pendingQuantity: item.pendingQuantity || item.quantity,
      unitPrice: item.unitPrice,
    }));

    return {
      poNumber: purchaseOrder.poNumber,
      poId: purchaseOrder._id,
      supplierId: purchaseOrder.supplierId._id,
      supplierName: purchaseOrder.supplierId.name,
      fulfillmentStatus: purchaseOrder.fulfillmentStatus,
      items: pendingQuantities,
    };
  }

  /**
   * Get PO fulfillment report
   * Phase 2 - Requirement 10.4, 10.5 - Task 43.3
   * @param {Object} filters - Date range and other filters
   * @returns {Promise<Object>} Fulfillment report
   */
  async getPOFulfillmentReport(filters = {}) {
    const { startDate, endDate, fulfillmentStatus, supplierId } = filters;

    const query = { isDeleted: false, status: 'approved' };

    if (fulfillmentStatus) {
      query.fulfillmentStatus = fulfillmentStatus;
    }

    if (supplierId) {
      query.supplierId = supplierId;
    }

    if (startDate || endDate) {
      query.poDate = {};
      if (startDate) {
        query.poDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.poDate.$lte = new Date(endDate);
      }
    }

    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('supplierId', 'name code contactPerson phone')
      .populate('items.itemId', 'name code unit')
      .sort('-poDate')
      .lean();

    // Calculate summary statistics
    const summary = {
      totalPOs: purchaseOrders.length,
      fullyFulfilled: purchaseOrders.filter((po) => po.fulfillmentStatus === 'fulfilled').length,
      partiallyFulfilled: purchaseOrders.filter((po) => po.fulfillmentStatus === 'partial')
        .length,
      pending: purchaseOrders.filter((po) => po.fulfillmentStatus === 'pending').length,
    };

    // Format PO details with pending quantities
    const poDetails = purchaseOrders.map((po) => ({
      poNumber: po.poNumber,
      poId: po._id,
      poDate: po.poDate,
      supplier: {
        id: po.supplierId._id,
        name: po.supplierId.name,
        code: po.supplierId.code,
      },
      fulfillmentStatus: po.fulfillmentStatus,
      totalAmount: po.totalAmount,
      items: po.items.map((item) => ({
        itemId: item.itemId._id,
        itemName: item.itemId.name,
        itemCode: item.itemId.code,
        orderedQuantity: item.quantity,
        receivedQuantity: item.receivedQuantity || 0,
        pendingQuantity: item.pendingQuantity || item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    }));

    return {
      reportType: 'po_fulfillment',
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      summary,
      purchaseOrders: poDetails,
      generatedAt: new Date(),
    };
  }

  /**
   * Get PO rate for an item and supplier
   * Phase 2 - Requirement 18.3 - Task 60.1
   * @param {string} itemId - Item ID
   * @param {string} supplierId - Supplier ID
   * @returns {Promise<Object>} PO rate information
   */
  async getPORate(itemId, supplierId) {
    if (!itemId) {
      throw new Error('Item ID is required');
    }

    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }

    // Find the latest approved PO with this item and supplier
    const purchaseOrders = await PurchaseOrder.find({
      supplierId: supplierId,
      status: 'approved',
      isDeleted: false,
      'items.itemId': itemId
    })
      .populate('supplierId', 'name code')
      .populate('items.itemId', 'name code unit')
      .sort({ poDate: -1, createdAt: -1 })
      .limit(5) // Get last 5 POs for this combination
      .lean();

    if (!purchaseOrders || purchaseOrders.length === 0) {
      return null; // No PO found
    }

    // Extract item details from each PO
    const poRates = [];

    for (const po of purchaseOrders) {
      const poItem = po.items.find(
        item => item.itemId._id.toString() === itemId.toString()
      );

      if (poItem) {
        poRates.push({
          poId: po._id,
          poNumber: po.poNumber,
          poDate: po.poDate,
          supplier: {
            id: po.supplierId._id,
            name: po.supplierId.name,
            code: po.supplierId.code
          },
          item: {
            id: poItem.itemId._id,
            name: poItem.itemId.name,
            code: poItem.itemId.code,
            unit: poItem.itemId.unit
          },
          unitPrice: poItem.unitPrice,
          quantity: poItem.quantity,
          receivedQuantity: poItem.receivedQuantity || 0,
          pendingQuantity: poItem.pendingQuantity || poItem.quantity,
          lineTotal: poItem.lineTotal
        });
      }
    }

    if (poRates.length === 0) {
      return null;
    }

    // Return the latest rate (first in array) along with history
    return {
      latestRate: poRates[0],
      history: poRates,
      count: poRates.length
    };
  }
}


module.exports = new PurchaseOrderService();
