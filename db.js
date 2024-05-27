// const { Pool } = require('pg');
// const pool = new Pool({
//     user: 'postgres',
//     host: 'localhost',
//     database: 'ritesh',
//     password: '280909', // Leave blank if not set
//     port: 5432,
// });

// module.exports = pool;
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false  // Necessary for Heroku's PostgreSQL
  }
});

module.exports = pool;
