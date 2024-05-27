const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ritesh',
    password: '280909', // Leave blank if not set
    port: 5432,
});

module.exports = pool;