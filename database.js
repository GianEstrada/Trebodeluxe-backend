const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    const dbPath = path.join(__dirname, 'treboluxe.db');
    
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
      } else {
        console.log('✅ Connected to SQLite database');
        this.createTables();
      }
    });
  }

  createTables() {
    // Tabla de usuarios
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        city TEXT,
        postalCode TEXT,
        country TEXT DEFAULT 'España',
        role TEXT DEFAULT 'customer',
        isVerified BOOLEAN DEFAULT 0,
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Tabla de sesiones/tokens
    const createTokensTable = `
      CREATE TABLE IF NOT EXISTS user_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        token TEXT NOT NULL,
        type TEXT NOT NULL, -- 'auth', 'refresh', 'reset'
        expiresAt DATETIME NOT NULL,
        isUsed BOOLEAN DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
      )
    `;

    // Tabla de carritos de compras
    const createCartsTable = `
      CREATE TABLE IF NOT EXISTS shopping_carts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        size TEXT,
        color TEXT,
        price DECIMAL(10,2) NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
      )
    `;

    // Tabla de pedidos
    const createOrdersTable = `
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        orderNumber TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'pending', -- pending, processing, shipped, delivered, cancelled
        totalAmount DECIMAL(10,2) NOT NULL,
        shippingAddress TEXT NOT NULL,
        billingAddress TEXT,
        paymentMethod TEXT,
        paymentStatus TEXT DEFAULT 'pending',
        notes TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
      )
    `;

    // Tabla de items de pedidos
    const createOrderItemsTable = `
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        productName TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        size TEXT,
        color TEXT,
        unitPrice DECIMAL(10,2) NOT NULL,
        totalPrice DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (orderId) REFERENCES orders (id) ON DELETE CASCADE
      )
    `;

    // Crear las tablas
    this.db.serialize(() => {
      this.db.run(createUsersTable, (err) => {
        if (err) console.error('Error creating users table:', err);
        else console.log('✅ Users table ready');
      });

      this.db.run(createTokensTable, (err) => {
        if (err) console.error('Error creating tokens table:', err);
        else console.log('✅ Tokens table ready');
      });

      this.db.run(createCartsTable, (err) => {
        if (err) console.error('Error creating carts table:', err);
        else console.log('✅ Shopping carts table ready');
      });

      this.db.run(createOrdersTable, (err) => {
        if (err) console.error('Error creating orders table:', err);
        else console.log('✅ Orders table ready');
      });

      this.db.run(createOrderItemsTable, (err) => {
        if (err) console.error('Error creating order items table:', err);
        else console.log('✅ Order items table ready');
      });

      // Crear usuario admin por defecto
      this.createDefaultAdmin();
    });
  }

  createDefaultAdmin() {
    const bcrypt = require('bcryptjs');
    
    const checkAdminQuery = 'SELECT id FROM users WHERE email = ? AND role = ?';
    this.db.get(checkAdminQuery, ['admin@treboluxe.com', 'admin'], (err, row) => {
      if (err) {
        console.error('Error checking admin user:', err);
        return;
      }

      if (!row) {
        // Crear usuario admin por defecto
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        const insertAdminQuery = `
          INSERT INTO users (email, password, firstName, lastName, role, isVerified, isActive)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        this.db.run(insertAdminQuery, [
          'admin@treboluxe.com',
          hashedPassword,
          'Admin',
          'Treboluxe',
          'admin',
          1,
          1
        ], (err) => {
          if (err) {
            console.error('Error creating admin user:', err);
          } else {
            console.log('✅ Default admin user created (admin@treboluxe.com / admin123)');
          }
        });
      }
    });
  }

  // Métodos helper para usuarios
  async getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE email = ? AND isActive = 1';
      this.db.get(query, [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async getUserById(id) {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM users WHERE id = ? AND isActive = 1';
      this.db.get(query, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async createUser(userData) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO users (email, password, firstName, lastName, phone, address, city, postalCode, country)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(query, [
        userData.email,
        userData.password,
        userData.firstName,
        userData.lastName,
        userData.phone || null,
        userData.address || null,
        userData.city || null,
        userData.postalCode || null,
        userData.country || 'España'
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...userData });
      });
    });
  }

  async updateUser(id, userData) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      Object.keys(userData).forEach(key => {
        if (userData[key] !== undefined && key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(userData[key]);
        }
      });
      
      values.push(id);
      
      const query = `UPDATE users SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
      
      this.db.run(query, values, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  // Métodos para tokens
  async saveToken(userId, token, type, expiresAt) {
    return new Promise((resolve, reject) => {
      const query = 'INSERT INTO user_tokens (userId, token, type, expiresAt) VALUES (?, ?, ?, ?)';
      this.db.run(query, [userId, token, type, expiresAt], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    });
  }

  async getValidToken(token, type) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM user_tokens 
        WHERE token = ? AND type = ? AND expiresAt > CURRENT_TIMESTAMP AND isUsed = 0
      `;
      this.db.get(query, [token, type], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async markTokenAsUsed(tokenId) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE user_tokens SET isUsed = 1 WHERE id = ?';
      this.db.run(query, [tokenId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  // Cerrar conexión
  close() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('Database connection closed');
        }
        resolve();
      });
    });
  }
}

module.exports = Database;
