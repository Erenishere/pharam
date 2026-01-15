// Create test user and get token
user = await User.create({
    username: 'testadmin',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin'
});

const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
        email: 'admin@test.com',
        password: 'password123'
    });

token = loginRes.body.token;
    });

describe('GET /api/reports/dimension/:dimension', () => {
    it('should return dimension report', async () => {
        await Invoice.create({
            type: 'purchase',
            dimension: 'PROJECT-A',
            invoiceDate: new Date(),
            totals: { grandTotal: 1000 },
            status: 'confirmed',
            createdBy: user._id
        });

        const res = await request(app)
            .get('/api/reports/dimension/PROJECT-A')
            .query({
                startDate: '2024-01-01',
                endDate: '2024-12-31'
            })
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.dimension).toBe('PROJECT-A');
        expect(res.body.data.summary.totalAmount).toBe(1000);
    });

    it('should validate required parameters', async () => {
        const res = await request(app)
            .get('/api/reports/dimension/PROJECT-A')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
});

describe('GET /api/reports/dimension-expenses', () => {
    it('should return expense analysis', async () => {
        await Invoice.create([
            {
                type: 'purchase',
                dimension: 'DEPT-1',
                invoiceDate: new Date(),
                totals: { grandTotal: 1000 },
                status: 'confirmed',
                createdBy: user._id
            },
            {
                type: 'purchase',
                dimension: 'DEPT-2',
                invoiceDate: new Date(),
                totals: { grandTotal: 2000 },
                status: 'confirmed',
                createdBy: user._id
            }
        ]);

        const res = await request(app)
            .get('/api/reports/dimension-expenses')
            .query({
                startDate: '2024-01-01',
                endDate: '2024-12-31'
            })
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.summary.totalDimensions).toBe(2);
        expect(res.body.data.summary.totalExpenses).toBe(3000);
    });
});

describe('GET /api/reports/dimension-budget/:dimension', () => {
    it('should return budget comparison', async () => {
        await Budget.create({
            dimension: 'PROJECT-X',
            period: '2024',
            periodType: 'yearly',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-12-31'),
            budgetAmount: 10000,
            allocatedBy: user._id
        });

        await Invoice.create({
            type: 'purchase',
            dimension: 'PROJECT-X',
            invoiceDate: new Date(),
            totals: { grandTotal: 5000 },
            status: 'confirmed',
            createdBy: user._id
        });

        const res = await request(app)
            .get('/api/reports/dimension-budget/PROJECT-X')
            .query({
                startDate: '2024-01-01',
                endDate: '2024-12-31'
            })
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.budget.amount).toBe(10000);
        expect(res.body.data.actuals.amount).toBe(5000);
        expect(res.body.data.comparison.utilizationPercent).toBe(50);
    });
});
});
