const { Pool, Client } = require('pg');
const bcrypt = require('bcryptjs');

class PostgresDatabase {
  constructor() {
    this.pool = new Pool({
      host: 'dpg-d1rk123e5dus73bsib8g-a.ohio-postgres.render.com',
      port: 5432,
      database: 'trebolux_db', // Nombre correcto de la base de datos
      user: 'trebolux_usr',
      password: 'nP1vR4SmhzgRoEEoRrRuRjZIWpoSs1FR',
      ssl: {
        rejectUnauthorized: false
      },
      max: 20,
      connectionTimeoutMillis: 2000,
      idleTimeoutMillis: 30000
    });
    
    this.isConnected = false;
    this.client = null;
  }

  async connect() {
    try {
      this.client = await this.pool.connect();
      this.isConnected = true;
      console.log('✅ Connected to PostgreSQL database: trebolux_db');
      await this.createTables();
      await this.createDefaultAdmin();
      await this.createDefaultSizeSystems();
      return true;
    } catch (err) {
      console.error('❌ Error connecting to PostgreSQL:', err.message);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        this.client.release();
        this.client = null;
      }
      await this.pool.end();
      this.isConnected = false;
      console.log('✅ Disconnected from PostgreSQL database');
    } catch (err) {
      console.error('Error disconnecting from PostgreSQL:', err.message);
    }
  }

  async query(text, params = []) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    
    try {
      const result = await this.client.query(text, params);
      return result;
    } catch (err) {
      console.error('Database query error:', err.message);
      throw err;
    }
  }

  async createTables() {
    console.log('📋 Creating database tables...');
    
    try {
      // Tabla de usuarios
      await this.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          city VARCHAR(100),
          country VARCHAR(100),
          role VARCHAR(20) DEFAULT 'customer',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de tokens de autenticación
      await this.query(`
        CREATE TABLE IF NOT EXISTS auth_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(500) NOT NULL,
          token_type VARCHAR(20) NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          is_used BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de sistemas de tallas
      await this.query(`
        CREATE TABLE IF NOT EXISTS size_systems (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          sizes TEXT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de carritos de compra
      await this.query(`
        CREATE TABLE IF NOT EXISTS carts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          products TEXT,
          total_amount DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de pedidos
      await this.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          products TEXT NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          shipping_address TEXT,
          payment_method VARCHAR(50),
          payment_status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Índices para optimizar consultas
      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON auth_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
        CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      `);

      console.log('✅ Database tables created successfully');
    } catch (err) {
      console.error('❌ Error creating tables:', err.message);
      throw err;
    }
  }

  async createDefaultAdmin() {
    try {
      // Verificar si ya existe el admin
      const existingAdmin = await this.query(
        'SELECT id FROM users WHERE email = $1',
        ['admin@treboluxe.com']
      );

      if (existingAdmin.rows.length > 0) {
        console.log('ℹ️  Admin user already exists');
        return;
      }

      // Crear usuario admin por defecto
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await this.query(`
        INSERT INTO users (first_name, last_name, email, password_hash, role, phone, city, country)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'Admin',
        'Treboluxe',
        'admin@treboluxe.com',
        hashedPassword,
        'admin',
        '+34 900 000 000',
        'Madrid',
        'España'
      ]);

      console.log('✅ Default admin user created');
    } catch (err) {
      console.error('❌ Error creating default admin:', err.message);
    }
  }

  async createDefaultSizeSystems() {
    try {
      // Verificar si ya existen sistemas de tallas
      const existingSizes = await this.query('SELECT id FROM size_systems LIMIT 1');
      
      if (existingSizes.rows.length > 0) {
        console.log('ℹ️  Size systems already exist');
        return;
      }

      // Crear sistemas de tallas por defecto
      const sizeSystems = [
        {
          name: 'Ropa Masculina',
          description: 'Tallas estándar para ropa de hombre',
          sizes: JSON.stringify(['XS', 'S', 'M', 'L', 'XL', 'XXL'])
        },
        {
          name: 'Ropa Femenina',
          description: 'Tallas estándar para ropa de mujer',
          sizes: JSON.stringify(['XS', 'S', 'M', 'L', 'XL', 'XXL'])
        },
        {
          name: 'Calzado',
          description: 'Tallas de calzado europeo',
          sizes: JSON.stringify(['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'])
        }
      ];

      for (const sizeSystem of sizeSystems) {
        await this.query(`
          INSERT INTO size_systems (name, description, sizes)
          VALUES ($1, $2, $3)
        `, [sizeSystem.name, sizeSystem.description, sizeSystem.sizes]);
      }

      console.log('✅ Default size systems created');
    } catch (err) {
      console.error('❌ Error creating default size systems:', err.message);
    }
  }

  // Métodos de usuarios
  async getUserByEmail(email) {
    try {
      const result = await this.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email]
      );
      return result.rows[0] || null;
    } catch (err) {
      console.error('Error getting user by email:', err.message);
      throw err;
    }
  }

  async getUserById(id) {
    try {
      const result = await this.query(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [id]
      );
      return result.rows[0] || null;
    } catch (err) {
      console.error('Error getting user by ID:', err.message);
      throw err;
    }
  }

  async createUser(userData) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const result = await this.query(`
        INSERT INTO users (first_name, last_name, email, password_hash, phone, city, country)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, first_name, last_name, email, phone, city, country, role, created_at
      `, [
        userData.firstName,
        userData.lastName,
        userData.email,
        hashedPassword,
        userData.phone,
        userData.city,
        userData.country
      ]);

      return result.rows[0];
    } catch (err) {
      if (err.code === '23505') { // Unique constraint violation
        throw new Error('Email already exists');
      }
      console.error('Error creating user:', err.message);
      throw err;
    }
  }

  async updateUser(id, userData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(userData).forEach(key => {
        if (key !== 'id' && userData[key] !== undefined) {
          if (key === 'password') {
            fields.push(`password_hash = $${paramCount}`);
            values.push(bcrypt.hashSync(userData[key], 10));
          } else {
            const dbField = key === 'firstName' ? 'first_name' : 
                           key === 'lastName' ? 'last_name' : key;
            fields.push(`${dbField} = $${paramCount}`);
            values.push(userData[key]);
          }
          paramCount++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const result = await this.query(`
        UPDATE users 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, first_name, last_name, email, phone, city, country, role, updated_at
      `, values);

      return result.rows[0];
    } catch (err) {
      console.error('Error updating user:', err.message);
      throw err;
    }
  }

  // Métodos de tokens
  async saveToken(userId, token, type, expiresAt) {
    try {
      await this.query(`
        INSERT INTO auth_tokens (user_id, token, token_type, expires_at)
        VALUES ($1, $2, $3, $4)
      `, [userId, token, type, expiresAt]);
    } catch (err) {
      console.error('Error saving token:', err.message);
      throw err;
    }
  }

  async getValidToken(token, type) {
    try {
      const result = await this.query(`
        SELECT at.*, u.id as user_id, u.email, u.role
        FROM auth_tokens at
        JOIN users u ON at.user_id = u.id
        WHERE at.token = $1 AND at.token_type = $2 
        AND at.expires_at > CURRENT_TIMESTAMP 
        AND at.is_used = false
        AND u.is_active = true
      `, [token, type]);
      
      return result.rows[0] || null;
    } catch (err) {
      console.error('Error getting valid token:', err.message);
      throw err;
    }
  }

  async markTokenAsUsed(tokenId) {
    try {
      await this.query(
        'UPDATE auth_tokens SET is_used = true WHERE id = $1',
        [tokenId]
      );
    } catch (err) {
      console.error('Error marking token as used:', err.message);
      throw err;
    }
  }

  async cleanExpiredTokens() {
    try {
      await this.query(
        'DELETE FROM auth_tokens WHERE expires_at < CURRENT_TIMESTAMP'
      );
    } catch (err) {
      console.error('Error cleaning expired tokens:', err.message);
      throw err;
    }
  }

  // Métodos de sistemas de tallas
  async getSizeSystems() {
    try {
      const result = await this.query(
        'SELECT * FROM size_systems WHERE is_active = true ORDER BY name'
      );
      return result.rows.map(row => ({
        ...row,
        sizes: JSON.parse(row.sizes)
      }));
    } catch (err) {
      console.error('Error getting size systems:', err.message);
      throw err;
    }
  }

  async createSizeSystem(name, description, sizes) {
    try {
      const result = await this.query(`
        INSERT INTO size_systems (name, description, sizes)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [name, description, JSON.stringify(sizes)]);
      
      const sizeSystem = result.rows[0];
      return {
        ...sizeSystem,
        sizes: JSON.parse(sizeSystem.sizes)
      };
    } catch (err) {
      if (err.code === '23505') {
        throw new Error('Size system name already exists');
      }
      console.error('Error creating size system:', err.message);
      throw err;
    }
  }

  async updateSizeSystem(id, name, description, sizes) {
    try {
      const result = await this.query(`
        UPDATE size_systems 
        SET name = $2, description = $3, sizes = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND is_active = true
        RETURNING *
      `, [id, name, description, JSON.stringify(sizes)]);
      
      if (result.rows.length === 0) {
        throw new Error('Size system not found');
      }
      
      const sizeSystem = result.rows[0];
      return {
        ...sizeSystem,
        sizes: JSON.parse(sizeSystem.sizes)
      };
    } catch (err) {
      console.error('Error updating size system:', err.message);
      throw err;
    }
  }

  async deleteSizeSystem(id) {
    try {
      const result = await this.query(
        'UPDATE size_systems SET is_active = false WHERE id = $1 RETURNING id',
        [id]
      );
      
      return result.rows.length > 0;
    } catch (err) {
      console.error('Error deleting size system:', err.message);
      throw err;
    }
  }

  // Métodos adicionales para el servidor
  async isHealthy() {
    try {
      if (!this.isConnected) {
        return false;
      }
      
      // Hacer una consulta simple para verificar la conexión
      await this.query('SELECT 1');
      return true;
    } catch (err) {
      console.error('Health check failed:', err.message);
      return false;
    }
  }

  async close() {
    return this.disconnect();
  }
}

module.exports = PostgresDatabase;
