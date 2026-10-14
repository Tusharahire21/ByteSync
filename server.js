const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const db = require("./db");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ USER REGISTRATION (SIGN UP)
app.post("/register", async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }
    try {
        db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
            if (err) return res.status(500).json({ error: "Database error" });
            if (result.length > 0) return res.status(400).json({ error: "Email already registered" });
            const hashedPassword = await bcrypt.hash(password, 10);
            db.query("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                [username, email, hashedPassword],
                (err, result) => {
                    if (err) return res.status(500).json({ error: "Database error" });
                    res.status(201).json({ message: "User registered successfully", user_id: result.insertId });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ USER LOGIN
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    db.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (result.length === 0) return res.status(401).json({ error: "Invalid email or password" });
        const user = result[0];
        bcrypt.compare(password, user.password_hash, (err, isMatch) => {
            if (err) return res.status(500).json({ error: "Internal server error" });
            if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });
            res.json({ message: "Login successful", user_id: user.id });
        });
    });
});

// ✅ WEBSOCKET LOGIC
const rooms = {}; // Store room data
const codeStorage = {}; // Store the latest code per room
const typingUsers = {}; // Track users who are typing

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("joinRoom", ({ roomId, username }) => {
        socket.join(roomId);
        
        if (!rooms[roomId]) {
            rooms[roomId] = {};
            codeStorage[roomId] = ""; // Initialize empty code for new rooms
            typingUsers[roomId] = {}; // Initialize typing tracker for new rooms
        }

        rooms[roomId][socket.id] = username;
        console.log(`${username} joined room ${roomId}`);

        // Send updated user list
        io.to(roomId).emit("updateUsers", { users: Object.values(rooms[roomId]) });

        // Send current code to the new user
        socket.emit("codeUpdate", { code: codeStorage[roomId] });
    });

    socket.on("codeChange", ({ roomId, code }) => {
        codeStorage[roomId] = code; // Save latest code
        socket.to(roomId).emit("codeUpdate", { code });
    });

    let typingTimeouts = {}; // Store timeouts for typing events

    socket.on("typing", ({ roomId, username }) => {
        if (!typingUsers[roomId]) typingUsers[roomId] = {};

        // Add user to typing list
        typingUsers[roomId][username] = true;

        // Send typing event only to others in the room
        socket.to(roomId).emit("userTyping", { username });

        // Clear previous timeout if exists
        if (typingTimeouts[socket.id]) clearTimeout(typingTimeouts[socket.id]);

        // Remove typing status after 3 seconds
        typingTimeouts[socket.id] = setTimeout(() => {
            delete typingUsers[roomId][username];
            io.to(roomId).emit("userStoppedTyping", { username });
        }, 3000);
    });

    socket.on("disconnect", () => {
        for (const roomId in rooms) {
            if (rooms[roomId][socket.id]) {
                const username = rooms[roomId][socket.id];
                delete rooms[roomId][socket.id];

                // Send updated user list
                io.to(roomId).emit("updateUsers", { users: Object.values(rooms[roomId]) });

                // Notify other users
                io.to(roomId).emit("userLeft", { username });

                // Remove user from typing list
                if (typingUsers[roomId]) {
                    delete typingUsers[roomId][username];
                }
            }
        }
        console.log("User disconnected:", socket.id);
    });
});

// ✅ START SERVER
server.listen(5000, () => {
    console.log("Server running on port 5000");
});