const { Sequelize, DataTypes, Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const electron = require('electron');

// Get the correct database path based on environment
const getDbPath = () => {
    // Check if we're in development or production
    const isDev = process.env.ELECTRON_IS_DEV === 1 || !electron.app;
    
    let dbPath;
    if (isDev) {
        // Development path
        dbPath = path.join(__dirname, '..', 'database.sqlite');
    } else {
        // Production path
        dbPath = path.join(process.resourcesPath, 'database.sqlite');
    }
    
    console.log('Database Path:', dbPath);
    console.log('Environment:', isDev ? 'Development' : 'Production');
    return dbPath;
};

const dbPath = getDbPath();
console.log('Using database at:', dbPath);

// Create the database directory if it doesn't exist
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    console.log('Creating database directory:', dbDir);
    fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize Sequelize with better logging
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: (msg) => console.log('Sequelize:', msg),
    dialectOptions: {
        // SQLite specific options
        timeout: 30000, // 30 seconds
    }
});

// Model definitions
const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    }
});

const Customer = sequelize.define('Customer', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    mobile: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: false
    }
});

const Invoice = sequelize.define('Invoice', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    invoiceNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    }
});

const InvoiceItem = sequelize.define('InvoiceItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    }
});

// Define relationships
Invoice.belongsTo(Customer);
Customer.hasMany(Invoice);

Invoice.hasMany(InvoiceItem);
InvoiceItem.belongsTo(Invoice);

InvoiceItem.belongsTo(Product);
Product.hasMany(InvoiceItem);

// Enhanced database setup function with better error handling and logging
const setupDatabase = async () => {
    try {
        console.log('Starting database setup...');
        
        // Test database existence and permissions
        if (fs.existsSync(dbPath)) {
            console.log('Database file exists');
            try {
                // Test file permissions
                await fs.promises.access(dbPath, fs.constants.R_OK | fs.constants.W_OK);
                console.log('Database file is readable and writable');
            } catch (error) {
                console.error('Database file permission error:', error);
                throw new Error('Database file permission error');
            }
        } else {
            console.log('Database file does not exist, will be created');
        }

        // Test database connection
        await sequelize.authenticate();
        console.log('Database connection established successfully');

        // Sync database schema
        await sequelize.sync();
        console.log('Database synchronized successfully');

        // Check if we need to create sample data
        const customerCount = await Customer.count();
        console.log('Current customer count:', customerCount);

        return true;
    } catch (error) {
        console.error('Database setup error:', error);
        // Add more detailed error information
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
            path: dbPath,
            exists: fs.existsSync(dbPath)
        });
        throw error;
    }
};

// Export all necessary components
module.exports = {
    sequelize,
    Product,
    Customer,
    Invoice,
    InvoiceItem,
    setupDatabase,
    Op,
    dbPath // Export dbPath for debugging purposes
};