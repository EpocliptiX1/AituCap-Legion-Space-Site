const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const path = require('path');
// const fetch = require('node-fetch');
const YT_API_KEY = 'AIzaSyB6Gco_FfC6l4AH5xLnEU2To8jaUwHfqak';
const app = express();

// --- 1. MIDDLEWARE ---
app.use(cors());
app.use(express.json()); // Essential for POST requests (Reviews & My List)

// --- 2. SERVE FRONTEND FILES ---
// This line is CRITICAL for Render. It tells the server to serve 
// your HTML, CSS, and JS files from the root folder.
app.use(express.static(path.join(__dirname, '..')));

// --- 3. DATABASE SETUP ---
// Using path.join ensures it finds the database one folder up from /Backend
const dbPath = path.join(__dirname, '..', 'datasets', 'movies.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Database error:", err.message);
    else console.log("✅ Connected to movies database");
});

// --- 4. REVIEWS FILE SETUP ---
const reviewsDir = path.join(__dirname, 'backend_data'); // Renamed to avoid confusion with folder name
const reviewsPath = path.join(reviewsDir, 'reviews.json');

if (!fs.existsSync(reviewsDir)) {
    fs.mkdirSync(reviewsDir);
}
if (!fs.existsSync(reviewsPath)) {
    fs.writeFileSync(reviewsPath, JSON.stringify([]));
}

// =========================================
//  5. MOVIE READ ROUTES
// =========================================

// A. Search by Name
app.get('/search', (req, res) => {
    const query = req.query.q;
    const sql = `SELECT * FROM movies WHERE "Movie Name" LIKE ? LIMIT 10`;
    db.all(sql, [`%${query}%`], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// B. Get Single Movie by ID
app.get('/movie/:id', (req, res) => {
    const id = req.params.id;
    const sql = `SELECT * FROM movies WHERE ID = ?`;
    db.get(sql, [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Movie not found" });
        res.json(row);
    });
});

// C. The "Super" Library Filter
app.get('/movies/library', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const sortMode = req.query.sort || 'rating_desc';
    const minYear = parseInt(req.query.year) || 1900;
    const genre = req.query.genre || '';
    const actor = req.query.actor || '';
    const director = req.query.director || '';

    let sql = `SELECT * FROM movies WHERE 1=1`;
    let params = [];

    sql += ` AND CAST(SUBSTR(release_date, -4) AS INTEGER) >= ?`;
    params.push(minYear);

    if (genre) {
        sql += ` AND Genre LIKE ?`;
        params.push(`%${genre}%`);
    }
    if (actor) {
        sql += ` AND Stars LIKE ?`;
        params.push(`%${actor}%`);
    }
    if (director) {
        sql += ` AND Directors LIKE ?`;
        params.push(`%${director}%`);
    }

    let orderBy = `CAST(Rating AS FLOAT) DESC`;
    if (sortMode === 'date_desc') orderBy = `CAST(SUBSTR(release_date, -4) AS INTEGER) DESC`;
    else if (sortMode === 'duration_desc') orderBy = `CAST(REPLACE(Runtime, ' min', '') AS INTEGER) DESC`;
    else if (sortMode === 'success_desc') orderBy = `((CAST(revenue AS FLOAT) - CAST(budget AS FLOAT)) / NULLIF(CAST(budget AS FLOAT), 0)) DESC`;
    else if (sortMode === 'success_asc') orderBy = `((CAST(revenue AS FLOAT) - CAST(budget AS FLOAT)) / NULLIF(CAST(budget AS FLOAT), 0)) ASC`;

    sql += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows || []);
    });
});

// =========================================
//  6. RECOMMENDATION ROUTES
// =========================================

app.get('/recommend/genre', (req, res) => {
    const { genre, exclude } = req.query;
    if (!genre) return res.json([]);
    const firstGenre = genre.split(',')[0].trim(); 
    const sql = `
        SELECT *, 
        ((CAST(revenue AS FLOAT)/CASE WHEN CAST(budget AS FLOAT)=0 THEN 1 ELSE CAST(budget AS FLOAT) END)*0.4 + (CAST(Votes AS FLOAT)/100000)*0.6)*Rating as smart_score
        FROM movies 
        WHERE Genre LIKE ? AND ID != ? 
        ORDER BY smart_score DESC LIMIT 20`;
    db.all(sql, [`%${firstGenre}%`, exclude], (err, rows) => res.json(rows || []));
});

app.get('/recommend/actors', (req, res) => {
    const { val, exclude } = req.query;
    const sql = `SELECT * FROM movies WHERE Stars LIKE ? AND ID != ? ORDER BY (CAST(Votes AS INTEGER) * Rating) DESC LIMIT 20`;
    db.all(sql, [`%${val}%`, exclude], (err, rows) => res.json(rows || []));
});

app.get('/recommend/director', (req, res) => {
    const { val, exclude } = req.query;
    const sql = `SELECT * FROM movies WHERE Directors LIKE ? AND ID != ? ORDER BY (CAST(Votes AS INTEGER) * Rating) DESC LIMIT 20`;
    db.all(sql, [`%${val}%`, exclude], (err, rows) => res.json(rows || []));
});

app.get('/recommend/timeline', (req, res) => {
    const targetYear = parseInt(req.query.year);
    const exclude = req.query.exclude;
    if (!targetYear) return res.json([]);
    const sql = `
        SELECT * FROM movies 
        WHERE CAST(SUBSTR(release_date, -4) AS INTEGER) BETWEEN ? AND ?
        AND ID != ? 
        ORDER BY (CAST(Votes AS INTEGER) * Rating) DESC 
        LIMIT 20
    `;
    db.all(sql, [targetYear - 5, targetYear + 5, exclude], (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows || []);
    });
});

// =========================================
//  7. "MY LIST" ROUTE
// =========================================
app.post('/movies/get-list', (req, res) => {
    const ids = req.body.ids; 
    if (!ids || ids.length === 0) return res.json([]);
    const placeholders = ids.map(() => '?').join(',');
    const sql = `SELECT * FROM movies WHERE ID IN (${placeholders})`;
    db.all(sql, ids, (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows || []);
    });
});

// =========================================
//  8. YOUTUBE TRAILER SEARCH
// =========================================
app.get('/youtube/search', async (req, res) => {
    const movieName = req.query.name;
    console.log(`[YouTube Proxy] Searching for: "${movieName}"`);

    if (!movieName || movieName === "undefined") {
        console.error("[YouTube Proxy] Error: No movie name provided!");
        return res.status(400).json({ error: "Movie name required" });
    }

    try {
        const query = encodeURIComponent(movieName + " official trailer");
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&maxResults=1&type=video&key=${YT_API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();

        // THIS IS THE MOST IMPORTANT PART:
        // It prints the REAL reason for the 400 error to your Render Logs
        if (!response.ok) {
            console.error("--- YOUTUBE API REJECTED REQUEST ---");
            console.error("Status:", response.status);
            console.error("Details:", JSON.stringify(data, null, 2));
            return res.status(response.status).json({ error: "YouTube API Error", details: data });
        }

        const videoId = data.items?.[0]?.id?.videoId || "";
        console.log(`[YouTube Proxy] Success! Found videoId: ${videoId}`);
        res.json({ videoId });

    } catch (err) {
        console.error("[YouTube Proxy] System Error:", err.message);
        res.status(500).json({ error: "Server crashed during fetch" });
    }
});
// =========================================
//  9. REVIEW ROUTES (JSON File)
// =========================================

app.get('/reviews', (req, res) => {
    try {
        const data = fs.readFileSync(reviewsPath, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: "Could not read reviews" });
    }
});

app.post('/reviews', (req, res) => {
    try {
        const data = fs.readFileSync(reviewsPath, 'utf8');
        const reviews = JSON.parse(data);
        reviews.unshift(req.body); 
        fs.writeFileSync(reviewsPath, JSON.stringify(reviews, null, 2));
        res.status(200).json({ message: "Review saved!" });
    } catch (err) {
        res.status(500).json({ error: "Could not save review" });
    }
});

// =========================================
//  10. START SERVER
// =========================================
// IMPORTANT: Render will provide the PORT via an environment variable
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📂 Serving frontend from: ${path.join(__dirname, '..')}`);
});