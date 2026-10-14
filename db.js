const mysql = require("mysql");

// Database Configuration
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "test"
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error("Database connection failed: " + err.stack);
        return;
    }
    console.log("Connected to MySQL database");
});

module.exports = db;
