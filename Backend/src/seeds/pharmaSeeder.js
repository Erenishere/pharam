const Item = require('../models/Item');

const pharmaItems = [
    // --- PAIN RELIEF ---
    {
        code: 'PHARMA001',
        name: 'Panadol 500mg Tablets',
        description: 'Effective for pain relief and fever',
        category: 'Medicine',
        unit: 'pack',
        pricing: { costPrice: 450, salePrice: 550, currency: 'PKR' },
        tax: { gstRate: 0, whtRate: 0, taxCategory: 'exempt' },
        inventory: {
            currentStock: 120, // Increased total
            minimumStock: 20,
            maximumStock: 500,
            batches: [
                { batchNumber: 'BATCH-001', expiryDate: new Date('2026-12-31'), stock: 50, costPrice: 450, salePrice: 550 },
                { batchNumber: 'BATCH-002', expiryDate: new Date('2025-06-30'), stock: 50, costPrice: 460, salePrice: 550 },
                { batchNumber: 'BATCH-NEAR-EXP', expiryDate: new Date('2024-03-01'), stock: 20, costPrice: 400, salePrice: 500 } // Near expiry
            ]
        },
        packSize: 200, manufacturer: 'GSK', isActive: true,
    },
    // ... Brufen, Disprin, Voltaren omitted for brevity but remain unchanged mostly ...
    {
        code: 'PHARMA003',
        name: 'Brufen 400mg Tablets',
        description: 'Anti-inflammatory pain killer',
        category: 'Medicine',
        unit: 'pack',
        pricing: { costPrice: 200, salePrice: 250, currency: 'PKR' },
        tax: { gstRate: 0, whtRate: 0, taxCategory: 'exempt' },
        inventory: {
            currentStock: 150,
            minimumStock: 50,
            maximumStock: 1000,
            batches: [
                { batchNumber: 'BRF-101', expiryDate: new Date('2027-01-01'), stock: 100, costPrice: 200, salePrice: 250 },
                { batchNumber: 'BRF-102-EXP', expiryDate: new Date('2026-02-15'), stock: 50, costPrice: 190, salePrice: 250 }
            ]
        },
        packSize: 50, manufacturer: 'Abbott', isActive: true,
    },
    {
        code: 'PHARMA004',
        name: 'Disprin 300mg Tablets',
        description: 'Soluble aspirin for pain and heart health',
        category: 'Medicine',
        unit: 'box',
        pricing: { costPrice: 50, salePrice: 70, currency: 'PKR' },
        tax: { gstRate: 0, whtRate: 0, taxCategory: 'exempt' },
        inventory: {
            currentStock: 500,
            minimumStock: 100,
            maximumStock: 2000,
            batches: [
                { batchNumber: 'DIS-A1', expiryDate: new Date('2028-01-01'), stock: 500, costPrice: 50, salePrice: 70 }
            ]
        },
        packSize: 100, manufacturer: 'Reckitt', isActive: true,
    },
    {
        code: 'PHARMA005',
        name: 'Voltaren 50mg Tablets',
        description: 'Diclofenac sodium for joint pain',
        category: 'Medicine',
        unit: 'pack',
        pricing: { costPrice: 600, salePrice: 750, currency: 'PKR' },
        tax: { gstRate: 0, whtRate: 0, taxCategory: 'exempt' },
        inventory: {
            currentStock: 80,
            minimumStock: 20,
            maximumStock: 300,
            batches: [
                { batchNumber: 'VLT-99', expiryDate: new Date('2026-11-20'), stock: 80, costPrice: 600, salePrice: 750 }
            ]
        },
        packSize: 20, manufacturer: 'Novartis', isActive: true,
    },

    // --- ANTIBIOTICS (18% GST) ---
    {
        code: 'PHARMA002',
        name: 'Amoxicillin 500mg Capsules',
        description: 'Antibiotic for bacterial infections',
        category: 'Medicine',
        unit: 'box',
        pricing: { costPrice: 800, salePrice: 1000, currency: 'PKR' },
        tax: { gstRate: 18, whtRate: 0, taxCategory: 'standard' },
        inventory: {
            currentStock: 60,
            minimumStock: 10,
            maximumStock: 200,
            batches: [
                { batchNumber: 'AMX-2024-A', expiryDate: new Date('2026-05-15'), stock: 30, costPrice: 800, salePrice: 1000 },
                { batchNumber: 'AMX-2024-B', expiryDate: new Date('2026-08-20'), stock: 30, costPrice: 800, salePrice: 1000 }
            ]
        },
        packSize: 100, manufacturer: 'Local Pharma', isActive: true,
    },
    {
        code: 'PHARMA006',
        name: 'Augmentin 625mg Tablets',
        description: 'Broad spectrum antibiotic',
        category: 'Medicine',
        unit: 'pack',
        pricing: { costPrice: 350, salePrice: 420, currency: 'PKR' },
        tax: { gstRate: 18, whtRate: 0, taxCategory: 'standard' },
        inventory: {
            currentStock: 40,
            minimumStock: 10,
            maximumStock: 100,
            batches: [
                { batchNumber: 'AUG-X1', expiryDate: new Date('2025-12-10'), stock: 40, costPrice: 350, salePrice: 420 }
            ]
        },
        packSize: 6, manufacturer: 'GSK', isActive: true,
    },
    {
        code: 'PHARMA007',
        name: 'Ciproxin 500mg Tablets',
        description: 'Ciprofloxacin antibiotic',
        category: 'Medicine',
        unit: 'pack',
        pricing: { costPrice: 600, salePrice: 720, currency: 'PKR' },
        tax: { gstRate: 18, whtRate: 0, taxCategory: 'standard' },
        inventory: {
            currentStock: 120,
            minimumStock: 30,
            maximumStock: 400,
            batches: [
                { batchNumber: 'CIP-22', expiryDate: new Date('2027-03-15'), stock: 120, costPrice: 600, salePrice: 720 }
            ]
        },
        packSize: 10, manufacturer: 'Bayer', isActive: true,
    },
    // ... Flagyl ...
    {
        code: 'PHARMA008',
        name: 'Flagyl 400mg Tablets',
        description: 'Metronidazole for infections',
        category: 'Medicine',
        unit: 'pack',
        pricing: { costPrice: 150, salePrice: 180, currency: 'PKR' },
        tax: { gstRate: 0, whtRate: 0, taxCategory: 'exempt' },
        inventory: {
            currentStock: 300,
            minimumStock: 50,
            maximumStock: 800,
            batches: [
                { batchNumber: 'FLG-001', expiryDate: new Date('2026-09-01'), stock: 300, costPrice: 150, salePrice: 180 }
            ]
        },
        packSize: 200, manufacturer: 'Sanofi', isActive: true,
    },

    // --- VITAMINS & SUPPLEMENTS ---
    {
        code: 'PHARMA009',
        name: 'Cac-1000 Plus',
        description: 'Calcium supplement effervescent tablets',
        category: 'Medicine',
        unit: 'tube',
        pricing: { costPrice: 280, salePrice: 340, currency: 'PKR' },
        tax: { gstRate: 0, whtRate: 0, taxCategory: 'exempt' },
        inventory: {
            currentStock: 80,
            minimumStock: 20,
            maximumStock: 300,
            batches: [
                { batchNumber: 'CAC-LEMON', expiryDate: new Date('2026-11-30'), stock: 80, costPrice: 280, salePrice: 340 }
            ]
        },
        packSize: 10, manufacturer: 'GSK', isActive: true,
    },
    {
        code: 'PHARMA010',
        name: 'Surbex Z Tablets',
        description: 'High potency vitamin B complex with Zinc',
        category: 'Medicine',
        unit: 'bottle',
        pricing: { costPrice: 450, salePrice: 560, currency: 'PKR' },
        tax: { gstRate: 0, whtRate: 0, taxCategory: 'exempt' },
        inventory: {
            currentStock: 45,
            minimumStock: 10,
            maximumStock: 150,
            batches: [
                { batchNumber: 'SBX-99', expiryDate: new Date('2026-07-20'), stock: 45, costPrice: 450, salePrice: 560 }
            ]
        },
        packSize: 30, manufacturer: 'Abbott', isActive: true,
    },
    {
        code: 'PHARMA011',
        name: 'Sunny D 200,000 IU',
        description: 'Vitamin D3 Softgel',
        category: 'Medicine',
        unit: 'pack',
        pricing: { costPrice: 200, salePrice: 250, currency: 'PKR' },
        tax: { gstRate: 10, whtRate: 0, taxCategory: 'reduced' }, // 10% GST
        inventory: {
            currentStock: 200,
            minimumStock: 50,
            maximumStock: 500,
            batches: [
                { batchNumber: 'SUN-1', expiryDate: new Date('2025-10-10'), stock: 200, costPrice: 200, salePrice: 250 }
            ]
        },
        packSize: 1, manufacturer: 'Getz', isActive: true,
    },

    // --- CHRONIC CARE ---
    {
        code: 'PHARMA012',
        name: 'Glucophage 500mg',
        description: 'Metformin for Diabetes',
        category: 'Medicine',
        unit: 'pack',
        pricing: { costPrice: 220, salePrice: 280, currency: 'PKR' },
        tax: { gstRate: 0, whtRate: 0, taxCategory: 'exempt' },
        inventory: {
            currentStock: 400,
            minimumStock: 100,
            maximumStock: 1000,
            batches: [
                { batchNumber: 'GLU-500', expiryDate: new Date('2027-04-01'), stock: 400, costPrice: 220, salePrice: 280 }
            ]
        },
        packSize: 50, manufacturer: 'Merck', isActive: true,
    },
    {
        code: 'PHARMA013',
        name: 'Lipitor 10mg',
        description: 'Atorvastatin for Cholesterol',
        category: 'Medicine',
        unit: 'pack',
        pricing: { costPrice: 550, salePrice: 680, currency: 'PKR' },
        tax: { gstRate: 0, whtRate: 0, taxCategory: 'exempt' },
        inventory: {
            currentStock: 90,
            minimumStock: 20,
            maximumStock: 300,
            batches: [
                { batchNumber: 'LIP-10', expiryDate: new Date('2026-06-15'), stock: 90, costPrice: 550, salePrice: 680 }
            ]
        },
        packSize: 10, manufacturer: 'Pfizer', isActive: true,
    },
    {
        code: 'PHARMA014',
        name: 'Ascard 75mg',
        description: 'Blood thinner aspirin',
        category: 'Medicine',
        unit: 'pack',
        pricing: { costPrice: 80, salePrice: 100, currency: 'PKR' },
        tax: { gstRate: 0, whtRate: 0, taxCategory: 'exempt' },
        inventory: {
            currentStock: 500,
            minimumStock: 100,
            maximumStock: 2000,
            batches: [
                { batchNumber: 'ASC-75', expiryDate: new Date('2027-12-31'), stock: 500, costPrice: 80, salePrice: 100 }
            ]
        },
        packSize: 30, manufacturer: 'Atco', isActive: true,
    },

    // --- FIRST AID / OTHERS ---
    {
        code: 'PHARMA015',
        name: 'Pyodine Solution 60ml',
        description: 'Antiseptic solution',
        category: 'Medicine',
        unit: 'bottle',
        pricing: { costPrice: 120, salePrice: 150, currency: 'PKR' },
        tax: { gstRate: 0, whtRate: 0, taxCategory: 'exempt' },
        inventory: {
            currentStock: 40,
            minimumStock: 10,
            maximumStock: 100,
            batches: [
                { batchNumber: 'PYO-60', expiryDate: new Date('2026-08-01'), stock: 40, costPrice: 120, salePrice: 150 }
            ]
        },
        packSize: 1, manufacturer: 'Brooks', isActive: true,
    },
    {
        code: 'PHARMA016',
        name: 'Saniplast Bandage',
        description: 'Adhesive bandage strips',
        category: 'First Aid',
        unit: 'box',
        pricing: { costPrice: 200, salePrice: 250, currency: 'PKR' },
        tax: { gstRate: 0, whtRate: 0, taxCategory: 'exempt' },
        inventory: {
            currentStock: 100,
            minimumStock: 20,
            maximumStock: 500,
            batches: [
                { batchNumber: 'SANI-100', expiryDate: new Date('2029-01-01'), stock: 100, costPrice: 200, salePrice: 250 }
            ]
        },
        packSize: 100, manufacturer: 'Uniferoz', isActive: true,
    },
    {
        code: 'PHARMA017',
        name: 'Polyfax Skin Ointment',
        description: 'Antibiotic skin ointment',
        category: 'Medicine',
        unit: 'tube',
        pricing: { costPrice: 110, salePrice: 140, currency: 'PKR' },
        tax: { gstRate: 0, whtRate: 0, taxCategory: 'exempt' },
        inventory: {
            currentStock: 60,
            minimumStock: 15,
            maximumStock: 200,
            batches: [
                { batchNumber: 'POLY-SKIN', expiryDate: new Date('2026-03-30'), stock: 60, costPrice: 110, salePrice: 140 }
            ]
        },
        packSize: 1, manufacturer: 'GSK', isActive: true,
    },
    {
        code: 'PHARMA018',
        name: 'Ventolin Inhaler',
        description: 'Asthma relief inhaler',
        category: 'Medicine',
        unit: 'piece',
        pricing: { costPrice: 350, salePrice: 400, currency: 'PKR' },
        tax: { gstRate: 0, whtRate: 0, taxCategory: 'exempt' },
        inventory: {
            currentStock: 30,
            minimumStock: 5,
            maximumStock: 100,
            batches: [
                { batchNumber: 'VEN-INH', expiryDate: new Date('2026-02-28'), stock: 30, costPrice: 350, salePrice: 400 }
            ]
        },
        packSize: 1, manufacturer: 'GSK', isActive: true,
    },
    {
        code: 'PHARMA019',
        name: 'Gaviscon Syrup 120ml',
        description: 'Heartburn and indigestion relief',
        category: 'Medicine',
        unit: 'bottle',
        pricing: { costPrice: 180, salePrice: 220, currency: 'PKR' },
        tax: { gstRate: 0, whtRate: 0, taxCategory: 'exempt' },
        inventory: {
            currentStock: 50,
            minimumStock: 10,
            maximumStock: 150,
            batches: [
                { batchNumber: 'GAV-120', expiryDate: new Date('2026-10-15'), stock: 50, costPrice: 180, salePrice: 220 }
            ]
        },
        packSize: 1, manufacturer: 'Reckitt', isActive: true,
    },
    {
        code: 'PHARMA020',
        name: 'Arinac Tablets',
        description: 'Cold and flu relief',
        category: 'Medicine',
        unit: 'pack',
        pricing: { costPrice: 150, salePrice: 190, currency: 'PKR' },
        tax: { gstRate: 0, whtRate: 0, taxCategory: 'exempt' },
        inventory: {
            currentStock: 150,
            minimumStock: 30,
            maximumStock: 400,
            batches: [
                { batchNumber: 'ARI-COLD', expiryDate: new Date('2027-01-20'), stock: 150, costPrice: 150, salePrice: 190 }
            ]
        },
        packSize: 200, manufacturer: 'Abbott', isActive: true,
    }
];

module.exports = {
    async seed() {
        // Optionally delete existing items with these codes to avoid duplicates/errors if unique constraint exists
        const codes = pharmaItems.map(i => i.code);
        await Item.deleteMany({ code: { $in: codes } });

        await Item.insertMany(pharmaItems);
        console.log(`  - Created ${pharmaItems.length} pharma items with batches`);
    },

    async clear() {
        const codes = pharmaItems.map(i => i.code);
        await Item.deleteMany({ code: { $in: codes } });
        console.log('  - Pharma items cleared');
    },
};
