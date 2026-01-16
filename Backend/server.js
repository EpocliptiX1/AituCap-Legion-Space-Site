const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const YT_API_KEY = 'AIzaSyB6Gco_FfC6l4AH5xLnEU2To8jaUwH2fqak';

// --- 1. MIDDLEWARE ---
app.use(cors());
app.use(express.json()); // Essential for POST requests (Reviews & My List)

// --- 2. DATABASE SETUP ---
// Connect to the SQLite database
const db = new sqlite3.Database('../datasets/movies.db', (err) => {
    if (err) console.error("Database error:", err.message);
    else console.log("✅ Connected to movies database");
});

// --- 3. REVIEWS FILE SETUP ---
// This ensures the /backend/ folder and reviews.json exist before we try to use them
const reviewsDir = path.join(__dirname, 'backend');
const reviewsPath = path.join(reviewsDir, 'reviews.json');

// Create folder if it doesn't exist
if (!fs.existsSync(reviewsDir)) {
    fs.mkdirSync(reviewsDir);
}
// Create file if it doesn't exist
if (!fs.existsSync(reviewsPath)) {
    fs.writeFileSync(reviewsPath, JSON.stringify([])); // Start with an empty list []
}

// =========================================
//  4. MOVIE READ ROUTES
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

// C. The "Super" Library Filter (Kept the complex version)
app.get('/movies/library', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    // Extract Filters from URL
    const sortMode = req.query.sort || 'rating_desc';
    const minYear = parseInt(req.query.year) || 1900;
    const genre = req.query.genre || '';
    const actor = req.query.actor || '';
    const director = req.query.director || '';

    // Start building the query
    let sql = `SELECT * FROM movies WHERE 1=1`;
    let params = [];

    // 1. Filter by Year (Released after X)
    sql += ` AND CAST(SUBSTR(release_date, -4) AS INTEGER) >= ?`;
    params.push(minYear);

    // 2. Filter by Genre
    if (genre) {
        sql += ` AND Genre LIKE ?`;
        params.push(`%${genre}%`);
    }

    // 3. Filter by Actor
    if (actor) {
        sql += ` AND Stars LIKE ?`;
        params.push(`%${actor}%`);
    }

    // 4. Filter by Director
    if (director) {
        sql += ` AND Directors LIKE ?`;
        params.push(`%${director}%`);
    }

    // 5. Apply Sorting
    let orderBy = `CAST(Rating AS FLOAT) DESC`; // Default

    if (sortMode === 'date_desc') {
        orderBy = `CAST(SUBSTR(release_date, -4) AS INTEGER) DESC`;
    } 
    else if (sortMode === 'duration_desc') {
        orderBy = `CAST(REPLACE(Runtime, ' min', '') AS INTEGER) DESC`;
    } 
    else if (sortMode === 'success_desc') {
        orderBy = `((CAST(revenue AS FLOAT) - CAST(budget AS FLOAT)) / NULLIF(CAST(budget AS FLOAT), 0)) DESC`;
    } 
    else if (sortMode === 'success_asc') {
        orderBy = `((CAST(revenue AS FLOAT) - CAST(budget AS FLOAT)) / NULLIF(CAST(budget AS FLOAT), 0)) ASC`;
    }

    // Combine everything
    sql += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows || []);
    });
});

// =========================================
//  5. RECOMMENDATION ROUTES
// =========================================

app.get('/recommend/genre', (req, res) => {
    const { genre, exclude } = req.query;
    if (!genre) return res.json([]);
    const firstGenre = genre.split(',')[0].trim(); 
    // Smart Score Calculation
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
//  6. "MY LIST" ROUTE
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
//  7. YOUTUBE TRAILER SEARCH (API)
// =========================================
app.get('/youtube/search', async (req, res) => {
    const movieName = req.query.name;
    if (!movieName) return res.status(400).json({ error: "Movie name required" });
    
    try {
        const query = encodeURIComponent(movieName + " official trailer");
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&maxResults=1&type=video&key=${YT_API_KEY}`;
        console.log(`[YouTube] Searching: ${movieName}`);
        const response = await fetch(url);
        const data = await response.json();
        
        // Log full response for debugging
        if (!response.ok || data.error) {
            console.error(`[YouTube] API Error:`, data);
            return res.status(response.status || 500).json({ error: data.error || "YouTube API error" });
        }
        
        const videoId = data.items?.[0]?.id?.videoId || "";
        console.log(`[YouTube] Found video: ${videoId || "None"}`);
        res.json({ videoId });
    } catch (err) {
        console.error("[YouTube] Network error:", err);
        res.status(500).json({ error: "Could not fetch trailer" });
    }
});

// =========================================
//  8. REVIEW ROUTES (JSON File)
// =========================================

// Get all reviews
app.get('/reviews', (req, res) => {
    try {
        const data = fs.readFileSync(reviewsPath, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        console.error("Error reading reviews:", err);
        res.status(500).json({ error: "Could not read reviews" });
    }
});

// Post a new review
app.post('/reviews', (req, res) => {
    try {
        // 1. Read existing
        const data = fs.readFileSync(reviewsPath, 'utf8');
        const reviews = JSON.parse(data);
        
        // 2. Add new review to the top
        reviews.unshift(req.body); 
        
        // 3. Write back
        fs.writeFileSync(reviewsPath, JSON.stringify(reviews, null, 2));
        res.status(200).json({ message: "Review saved!" });
    } catch (err) {
        console.error("Error saving review:", err);
        res.status(500).json({ error: "Could not save review" });
    }
});

// =========================================
//  9. START SERVER
// =========================================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Server is running at http://localhost:${PORT}`);
    console.log(`📂 Reviews file location: ${reviewsPath}`);
});