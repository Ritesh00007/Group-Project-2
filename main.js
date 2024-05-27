const express = require('express');
const session = require('express-session');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const path = require('path');
const multer = require('multer');
require('./passport-setup');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(session({ secret: 'your_secret_key', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));

// For profile pic storage
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Prefixing the filename with a timestamp to avoid name conflicts
    }
});

const upload = multer({ storage: storage });
 
// routes
app.get('/login', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/');  // Redirect to dashboard if already logged in
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html')); 
    }
});

app.post('/login', passport.authenticate('local' , {

    successRedirect: '/',  
    failureRedirect: '/login',  
    failureFlash: true 
}));

app.post('/signup', async (req, res, next) => {
    const { username, password, email } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10); 

    try {
        const result = await pool.query('INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING id, username', [username, hashedPassword, email]);
        const newUser = result.rows[0];

        req.login(newUser, (err) => {
            if (err) {
                return next(err); 
            }
            res.redirect('/'); // Redirect to a page indicating successful signup and login
        });
    } catch (err) {
        console.error(err);
        res.status(400).send('Error creating user: ' + err.message); // Send an error response
    }
});

app.get('/', (req, res) => {
    const loggedIn = req.isAuthenticated();  // Check if user is authenticated
    res.render('index', { loggedIn });
});

// API endpoint to check if the user is logged in
app.get('/api/auth-status', (req, res) => {
    res.json({ isLoggedIn: req.isAuthenticated() });
});

app.get('/logout', (req, res) => {
    req.logout(function(err) {
        if (err) { 
            return next(err); 
        }
        req.session.destroy(() => {
            res.clearCookie('connect.sid'); // Clear the session cookie
            res.redirect('/'); // Redirect to the homepage or login page
        });
    });
});

// Get user info for profile pic 
app.get('/api/user-info', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(403).json({ error: "Not authenticated" });
    }

    pool.query('SELECT username, email, profile_pic FROM users WHERE id = $1', [req.user.id], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Database error" });
        }
        if (result.rows.length > 0) {
            const { username, email, profile_pic } = result.rows[0];
            res.json({ username, email, profile_pic: profile_pic || "image/default_profile.jpeg" });
        } else {
            res.status(404).json({ error: "User not found" });
        }
    });
    
});

// Post profile pic

app.post('/api/update-profile-pic', upload.single('profilePic'), (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(403).json({ error: "Not authenticated" });
    }
    const profilePicUrl = `/uploads/${req.file.filename}`;
    pool.query('UPDATE users SET profile_pic = $1 WHERE id = $2', [profilePicUrl, req.user.id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ message: "Profile updated successfully", imageUrl: profilePicUrl });
    });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
