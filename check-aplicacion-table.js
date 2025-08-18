const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_Kq4QpnxbNgw7@ep-crimson-leaf-adg88n53-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'promocion_aplicacion' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    console.log('Columnas de promocion_aplicacion:');
    result.rows.forEach(row => console.log(`  ${row.column_name} (${row.data_type})`));
  } finally {
    client.release();
    await pool.end();
  }
})();
