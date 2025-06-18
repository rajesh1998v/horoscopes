import mysql from "mysql2";
// import {env} from "./env.js";

// export const db =  await mysql.createConnection({
//     host: env.DATABASE_HOST,
//     user: env.DATABASE_USER,
//     password: env.DATABASE_PASSWORD,
//     database: env.DATABASE_NAME,
// })

// MySQL connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Kum@r1999',      
  database: 'astrology' 
});


connection.connect((err) => {
  if (err) {
    console.error('MySQL Connection Failed:', err);
  } else {
    console.log('Connected to MySQL!');
  }
});

export default connection;