const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db;
let SQL;

const setupDatabase = async () => {
    try {
        console.log('Starting database setup...');
        SQL = await initSqlJs();
        
        // Create new database
        db = new SQL.Database();

        // Create tables with all necessary fields and constraints
        db.run(`
            CREATE TABLE IF NOT EXISTS Products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                rate DECIMAL(10,2) NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS Customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                mobile TEXT NOT NULL UNIQUE,
                address TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS Invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoiceNumber TEXT NOT NULL UNIQUE,
                date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                total DECIMAL(10,2) NOT NULL DEFAULT 0,
                CustomerId INTEGER,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (CustomerId) REFERENCES Customers(id)
            );

            CREATE TABLE IF NOT EXISTS InvoiceItems (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                InvoiceId INTEGER,
                ProductId INTEGER,
                quantity INTEGER NOT NULL,
                rate DECIMAL(10,2) NOT NULL,
                total DECIMAL(10,2) NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (InvoiceId) REFERENCES Invoices(id),
                FOREIGN KEY (ProductId) REFERENCES Products(id)
            );

            -- Create indexes for better performance
            CREATE INDEX IF NOT EXISTS idx_products_name ON Products(name);
            CREATE INDEX IF NOT EXISTS idx_customers_mobile ON Customers(mobile);
            CREATE INDEX IF NOT EXISTS idx_invoices_number ON Invoices(invoiceNumber);
            CREATE INDEX IF NOT EXISTS idx_invoices_date ON Invoices(date);
            CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON InvoiceItems(InvoiceId);
            CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON InvoiceItems(ProductId);
        `);

        console.log('Database tables and indexes created successfully');

        // Create triggers for updating timestamps
        db.run(`
            -- Products updatedAt trigger
            CREATE TRIGGER IF NOT EXISTS update_products_timestamp 
            AFTER UPDATE ON Products
            BEGIN
                UPDATE Products SET updatedAt = CURRENT_TIMESTAMP
                WHERE id = NEW.id;
            END;

            -- Customers updatedAt trigger
            CREATE TRIGGER IF NOT EXISTS update_customers_timestamp
            AFTER UPDATE ON Customers
            BEGIN
                UPDATE Customers SET updatedAt = CURRENT_TIMESTAMP
                WHERE id = NEW.id;
            END;

            -- Invoices updatedAt trigger
            CREATE TRIGGER IF NOT EXISTS update_invoices_timestamp
            AFTER UPDATE ON Invoices
            BEGIN
                UPDATE Invoices SET updatedAt = CURRENT_TIMESTAMP
                WHERE id = NEW.id;
            END;

            -- InvoiceItems updatedAt trigger
            CREATE TRIGGER IF NOT EXISTS update_invoice_items_timestamp
            AFTER UPDATE ON InvoiceItems
            BEGIN
                UPDATE InvoiceItems SET updatedAt = CURRENT_TIMESTAMP
                WHERE id = NEW.id;
            END;
        `);

        console.log('Database triggers created successfully');

        return db;
    } catch (error) {
        console.error('Database setup error:', error);
        throw error;
    }
};

const getDatabase = () => {
    if (!db) {
        throw new Error('Database not initialized. Call setupDatabase first.');
    }
    return db;
};

// Helper functions for common operations
const dbHelpers = {
    // Products
    getAllProducts: () => {
        const result = db.exec('SELECT * FROM Products ORDER BY name ASC');
        return result[0]?.values.map(row => ({
            id: row[0],
            name: row[1],
            rate: row[2],
            createdAt: row[3],
            updatedAt: row[4]
        })) || [];
    },

    // Customers
    getAllCustomers: () => {
        const result = db.exec('SELECT * FROM Customers ORDER BY name ASC');
        return result[0]?.values.map(row => ({
            id: row[0],
            name: row[1],
            mobile: row[2],
            address: row[3],
            createdAt: row[4],
            updatedAt: row[5]
        })) || [];
    },

    // Invoices with customer details
    getAllInvoices: () => {
        const query = `
            SELECT 
                i.*,
                c.name as customerName,
                c.mobile as customerMobile,
                c.address as customerAddress
            FROM Invoices i
            LEFT JOIN Customers c ON i.CustomerId = c.id
            ORDER BY i.date DESC
        `;
        const result = db.exec(query);
        return result[0]?.values.map(row => ({
            id: row[0],
            invoiceNumber: row[1],
            date: row[2],
            total: row[3],
            CustomerId: row[4],
            createdAt: row[5],
            updatedAt: row[6],
            customerDetails: {
                name: row[7],
                mobile: row[8],
                address: row[9]
            }
        })) || [];
    },

    // Invoice items with product details
    getInvoiceItems: (invoiceId) => {
        const query = `
            SELECT 
                ii.*,
                p.name as productName
            FROM InvoiceItems ii
            LEFT JOIN Products p ON ii.ProductId = p.id
            WHERE ii.InvoiceId = ?
        `;
        const result = db.exec(query, [invoiceId]);
        return result[0]?.values.map(row => ({
            id: row[0],
            InvoiceId: row[1],
            ProductId: row[2],
            quantity: row[3],
            rate: row[4],
            total: row[5],
            createdAt: row[6],
            updatedAt: row[7],
            productName: row[8]
        })) || [];
    }
};

// Export functions and helpers
module.exports = {
    setupDatabase,
    getDatabase,
    SQL,
    dbHelpers,
    // Export function to save database state if needed
    saveDatabase: () => {
        if (db) {
            const data = db.export();
            const buffer = Buffer.from(data);
            return buffer;
        }
        return null;
    },
    // Export function to load database state if needed
    loadDatabase: (buffer) => {
        if (buffer) {
            db = new SQL.Database(buffer);
            return true;
        }
        return false;
    }
};
