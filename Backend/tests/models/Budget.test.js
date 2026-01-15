// Create a test user
user = await User.create({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'admin'
});
    });

describe('Budget Creation', () => {
    it('should create a budget with valid data', async () => {
        const budget = await Budget.create({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 100000,
            allocatedBy: user._id
        });

        expect(budget.dimension).toBe('PROJECT-001');
        expect(budget.period).toBe('2024-Q1');
        expect(budget.periodType).toBe('quarterly');
        expect(budget.budgetAmount).toBe(100000);
        expect(budget.isActive).toBe(true);
    });

    it('should require dimension field', async () => {
        const budget = new Budget({
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 100000,
            allocatedBy: user._id
        });

        await expect(budget.save()).rejects.toThrow('Dimension is required');
    });

    it('should require period field', async () => {
        const budget = new Budget({
            dimension: 'PROJECT-001',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 100000,
            allocatedBy: user._id
        });

        await expect(budget.save()).rejects.toThrow('Period is required');
    });

    it('should require periodType field', async () => {
        const budget = new Budget({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 100000,
            allocatedBy: user._id
        });

        await expect(budget.save()).rejects.toThrow('Period type is required');
    });

    it('should require startDate field', async () => {
        const budget = new Budget({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'quarterly',
            endDate: new Date('2024-03-31'),
            budgetAmount: 100000,
            allocatedBy: user._id
        });

        await expect(budget.save()).rejects.toThrow('Start date is required');
    });

    it('should require endDate field', async () => {
        const budget = new Budget({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            budgetAmount: 100000,
            allocatedBy: user._id
        });

        await expect(budget.save()).rejects.toThrow('End date is required');
    });

    it('should require budgetAmount field', async () => {
        const budget = new Budget({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            allocatedBy: user._id
        });

        await expect(budget.save()).rejects.toThrow('Budget amount is required');
    });

    it('should require allocatedBy field', async () => {
        const budget = new Budget({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 100000
        });

        await expect(budget.save()).rejects.toThrow('Allocated by user is required');
    });
});

describe('Dimension Validation', () => {
    it('should accept valid dimension formats', async () => {
        const validDimensions = [
            'PROJECT-001',
            'CC-123',
            'DEPT_A',
            'Cost-Center-1',
            'Project_2024_Q1'
        ];

        for (const dimension of validDimensions) {
            const budget = await Budget.create({
                dimension,
                period: `2024-${dimension}`,
                periodType: 'monthly',
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31'),
                budgetAmount: 50000,
                allocatedBy: user._id
            });

            expect(budget.dimension).toBe(dimension);
        }
    });

    it('should reject dimension with invalid characters', async () => {
        const budget = new Budget({
            dimension: 'PROJECT@001',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 100000,
            allocatedBy: user._id
        });

        await expect(budget.save()).rejects.toThrow('alphanumeric');
    });

    it('should enforce dimension max length of 100 characters', async () => {
        const longDimension = 'A'.repeat(101);
        const budget = new Budget({
            dimension: longDimension,
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 100000,
            allocatedBy: user._id
        });

        await expect(budget.save()).rejects.toThrow('Dimension cannot exceed 100 characters');
    });

    it('should trim whitespace from dimension', async () => {
        const budget = await Budget.create({
            dimension: '  PROJECT-001  ',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 100000,
            allocatedBy: user._id
        });

        expect(budget.dimension).toBe('PROJECT-001');
    });
});

describe('Period Type Validation', () => {
    it('should accept monthly period type', async () => {
        const budget = await Budget.create({
            dimension: 'PROJECT-001',
            period: '2024-01',
            periodType: 'monthly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-31'),
            budgetAmount: 25000,
            allocatedBy: user._id
        });

        expect(budget.periodType).toBe('monthly');
    });

    it('should accept quarterly period type', async () => {
        const budget = await Budget.create({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 75000,
            allocatedBy: user._id
        });

        expect(budget.periodType).toBe('quarterly');
    });

    it('should accept yearly period type', async () => {
        const budget = await Budget.create({
            dimension: 'PROJECT-001',
            period: '2024',
            periodType: 'yearly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-12-31'),
            budgetAmount: 300000,
            allocatedBy: user._id
        });

        expect(budget.periodType).toBe('yearly');
    });

    it('should reject invalid period type', async () => {
        const budget = new Budget({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'weekly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 100000,
            allocatedBy: user._id
        });

        await expect(budget.save()).rejects.toThrow('Period type must be one of: monthly, quarterly, yearly');
    });
});

describe('Date Validation', () => {
    it('should validate endDate is after startDate', async () => {
        const budget = new Budget({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-03-31'),
            endDate: new Date('2024-01-01'),
            budgetAmount: 100000,
            allocatedBy: user._id
        });

        await expect(budget.save()).rejects.toThrow('End date must be after start date');
    });

    it('should accept valid date range', async () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-03-31');

        const budget = await Budget.create({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate,
            endDate,
            budgetAmount: 100000,
            allocatedBy: user._id
        });

        expect(budget.startDate).toEqual(startDate);
        expect(budget.endDate).toEqual(endDate);
    });
});

describe('Budget Amount Validation', () => {
    it('should reject negative budget amount', async () => {
        const budget = new Budget({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: -1000,
            allocatedBy: user._id
        });

        await expect(budget.save()).rejects.toThrow('Budget amount cannot be negative');
    });

    it('should accept zero budget amount', async () => {
        const budget = await Budget.create({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 0,
            allocatedBy: user._id
        });

        expect(budget.budgetAmount).toBe(0);
    });

    it('should accept large budget amounts', async () => {
        const budget = await Budget.create({
            dimension: 'PROJECT-001',
            period: '2024',
            periodType: 'yearly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-12-31'),
            budgetAmount: 10000000,
            allocatedBy: user._id
        });

        expect(budget.budgetAmount).toBe(10000000);
    });
});

describe('Optional Fields', () => {
    it('should store notes field', async () => {
        const budget = await Budget.create({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 100000,
            allocatedBy: user._id,
            notes: 'Q1 budget allocation for Project 001'
        });

        expect(budget.notes).toBe('Q1 budget allocation for Project 001');
    });

    it('should enforce notes max length', async () => {
        const longNotes = 'A'.repeat(501);
        const budget = new Budget({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 100000,
            allocatedBy: user._id,
            notes: longNotes
        });

        await expect(budget.save()).rejects.toThrow('Notes cannot exceed 500 characters');
    });

    it('should default isActive to true', async () => {
        const budget = await Budget.create({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 100000,
            allocatedBy: user._id
        });

        expect(budget.isActive).toBe(true);
    });

    it('should allow setting isActive to false', async () => {
        const budget = await Budget.create({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 100000,
            allocatedBy: user._id,
            isActive: false
        });

        expect(budget.isActive).toBe(false);
    });
});

describe('Unique Constraint', () => {
    it('should enforce unique dimension and period combination', async () => {
        await Budget.create({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 100000,
            allocatedBy: user._id
        });

        const duplicateBudget = new Budget({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 150000,
            allocatedBy: user._id
        });

        await expect(duplicateBudget.save()).rejects.toThrow();
    });

    it('should allow same dimension with different periods', async () => {
        await Budget.create({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 100000,
            allocatedBy: user._id
        });

        const budget2 = await Budget.create({
            dimension: 'PROJECT-001',
            period: '2024-Q2',
            periodType: 'quarterly',
            startDate: new Date('2024-04-01'),
            endDate: new Date('2024-06-30'),
            budgetAmount: 120000,
            allocatedBy: user._id
        });

        expect(budget2.period).toBe('2024-Q2');
    });

    it('should allow different dimensions with same period', async () => {
        await Budget.create({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 100000,
            allocatedBy: user._id
        });

        const budget2 = await Budget.create({
            dimension: 'PROJECT-002',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 80000,
            allocatedBy: user._id
        });

        expect(budget2.dimension).toBe('PROJECT-002');
    });
});

describe('Timestamps', () => {
    it('should automatically set createdAt and updatedAt', async () => {
        const budget = await Budget.create({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 100000,
            allocatedBy: user._id
        });

        expect(budget.createdAt).toBeDefined();
        expect(budget.updatedAt).toBeDefined();
    });

    it('should update updatedAt on save', async () => {
        const budget = await Budget.create({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 100000,
            allocatedBy: user._id
        });

        const originalUpdatedAt = budget.updatedAt;

        // Wait a bit to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 10));

        budget.budgetAmount = 150000;
        await budget.save();

        expect(budget.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
});

describe('Virtual Fields', () => {
    it('should calculate periodDays virtual field', async () => {
        const budget = await Budget.create({
            dimension: 'PROJECT-001',
            period: '2024-Q1',
            periodType: 'quarterly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-03-31'),
            budgetAmount: 100000,
            allocatedBy: user._id
        });

        expect(budget.periodDays).toBeGreaterThan(0);
        expect(budget.periodDays).toBeLessThanOrEqual(91); // Q1 has 90-91 days
    });
});
});
