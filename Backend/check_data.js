require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Item = require('./src/models/Item');
const Customer = require('./src/models/Customer');
const database = require('./src/config/database');

async function checkData() {
    try {
        await database.connect();

        const items = await Item.find().limit(5);
        console.log('--- Items ---');
        items.forEach(i => console.log(`ID: ${i._id}, Name: ${i.name}, Code: ${i.code}`));

        const customers = await Customer.find().limit(5);
        console.log('\n--- Customers ---');
        customers.forEach(c => console.log(`ID: ${c._id}, Name: ${c.name}, Code: ${c.code}`));

        const users = await User.find({ role: 'sales' });
        console.log('\n--- Sales Users ---');
        users.forEach(u => console.log(`ID: ${u._id}, Username: ${u.username}`));

        await database.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkData();
