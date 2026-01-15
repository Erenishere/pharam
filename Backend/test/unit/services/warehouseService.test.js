const { expect } = require('chai');
const sinon = require('sinon');
const Warehouse = require('../../../src/models/Warehouse');
const warehouseService = require('../../../src/services/warehouseService');
const AppError = require('../../../src/utils/appError');

describe('Warehouse Service', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  const mockWarehouse = {
    _id: '5f8d0f3d8e4a4d0a3c8b4567',
    code: 'WH0001',
    name: 'Main Warehouse',
    location: {
      address: '123 Main St',
      city: 'New York',
      country: 'USA'
    },
    isActive: true,
    save: () => Promise.resolve()
  };

  describe('createWarehouse', () => {
    it('should create a new warehouse', async () => {
      const warehouseData = {
        name: 'New Warehouse',
        location: {
          address: '456 Oak St',
          city: 'Los Angeles',
          country: 'USA'
        }
      };

      sandbox.stub(Warehouse, 'create').resolves({
        ...mockWarehouse,
        ...warehouseData
      });

      const result = await warehouseService.createWarehouse(warehouseData);

      expect(result).to.include(warehouseData);
      expect(Warehouse.create.calledOnce).to.be.true;
    });

    it('should throw error for duplicate code', async () => {
      const warehouseData = {
        name: 'Duplicate Warehouse',
        code: 'WH0001',
        location: {
          address: '789 Pine St',
          city: 'Chicago',
          country: 'USA'
        }
      };

      const error = new Error('Duplicate key error');
      error.code = 11000;
      sandbox.stub(Warehouse, 'create').rejects(error);

      try {
        await warehouseService.createWarehouse(warehouseData);
        throw new Error('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(400);
        expect(err.message).to.equal('A warehouse with this code already exists');
      }
    });
  });

  describe('getWarehouseById', () => {
    it('should return a warehouse by ID', async () => {
      sandbox.stub(Warehouse, 'findById').resolves(mockWarehouse);

      const result = await warehouseService.getWarehouseById('5f8d0f3d8e4a4d0a3c8b4567');

      expect(result).to.deep.equal(mockWarehouse);
      expect(Warehouse.findById.calledOnce).to.be.true;
    });

    it('should throw error if warehouse not found', async () => {
      sandbox.stub(Warehouse, 'findById').resolves(null);

      try {
        await warehouseService.getWarehouseById('nonexistentid');
        throw new Error('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(404);
        expect(err.message).to.equal('Warehouse not found');
      }
    });
  });

  describe('getAllWarehouses', () => {
    it('should return all warehouses with pagination', async () => {
      const mockWarehouses = [
        { ...mockWarehouse, name: 'Warehouse 1' },
        { ...mockWarehouse, name: 'Warehouse 2', _id: '5f8d0f3d8e4a4d0a3c8b4568' }
      ];

      const mockQuery = {
        filter: () => ({
          sort: () => ({
            limit: () => ({
              skip: () => ({
                exec: () => Promise.resolve(mockWarehouses)
              })
            })
          })
        })
      };

      sandbox.stub(Warehouse, 'find').returns(mockQuery);
      sandbox.stub(Warehouse, 'countDocuments').resolves(2);

      const result = await warehouseService.getAllWarehouses(
        { search: 'warehouse' },
        { page: 1, limit: 10 }
      );

      expect(result.data).to.have.lengthOf(2);
      expect(result.pagination.total).to.equal(2);
    });
  });

  describe('updateWarehouse', () => {
    it('should update a warehouse', async () => {
      const updateData = { name: 'Updated Warehouse Name' };
      const updatedWarehouse = { ...mockWarehouse, ...updateData };

      sandbox.stub(Warehouse, 'findByIdAndUpdate').resolves(updatedWarehouse);

      const result = await warehouseService.updateWarehouse(
        '5f8d0f3d8e4a4d0a3c8b4567',
        updateData
      );

      expect(result.name).to.equal(updateData.name);
      expect(Warehouse.findByIdAndUpdate.calledOnce).to.be.true;
    });

    it('should prevent updating the warehouse code', async () => {
      const updateData = { code: 'NEWCODE' };
      
      sandbox.stub(Warehouse, 'findByIdAndUpdate').callsFake((id, data) => {
        expect(data.code).to.be.undefined;
        return Promise.resolve(mockWarehouse);
      });

      await warehouseService.updateWarehouse('5f8d0f3d8e4a4d0a3c8b4567', updateData);
    });
  });

  describe('deleteWarehouse', () => {
    it('should delete a warehouse', async () => {
      sandbox.stub(Warehouse, 'findByIdAndDelete').resolves(mockWarehouse);
      sandbox.stub(warehouseService, 'warehouseHasInventory').resolves(false);

      const result = await warehouseService.deleteWarehouse('5f8d0f3d8e4a4d0a3c8b4567');
      
      expect(result).to.be.true;
      expect(Warehouse.findByIdAndDelete.calledOnce).to.be.true;
    });

    it('should not delete a warehouse with inventory', async () => {
      sandbox.stub(warehouseService, 'warehouseHasInventory').resolves(true);

      try {
        await warehouseService.deleteWarehouse('5f8d0f3d8e4a4d0a3c8b4567');
        throw new Error('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceOf(AppError);
        expect(err.statusCode).to.equal(400);
        expect(err.message).to.equal('Cannot delete warehouse with existing inventory');
      }
    });
  });

  describe('toggleWarehouseStatus', () => {
    it('should toggle warehouse status', async () => {
      const warehouse = {
        ...mockWarehouse,
        isActive: true,
        save: sandbox.stub().resolves({ ...mockWarehouse, isActive: false })
      };
      
      sandbox.stub(Warehouse, 'findById').resolves(warehouse);

      const result = await warehouseService.toggleWarehouseStatus('5f8d0f3d8e4a4d0a3c8b4567');
      
      expect(result.isActive).to.be.false;
      expect(warehouse.save.calledOnce).to.be.true;
    });
  });
});
