
# 🎥 Legion Space: Technical Documentation & Architecture
### !IMPORTANT, USE THIS KEY IN ORDER TO SEE TRAILERS: AIzaSyB6Gco_FfC6l4AH5xLnEU2To8jaUwH2fqak (copy paste into movieLoading.js lines 6 and 12‼️‼️‼️
## 1. Project Overview

**Legion Space** is a full-stack, cinematography-focused movie database and streaming preview platform. Unlike generic movie sites, it focuses on technical presentation (aspect ratios, high-bitrate aesthetics) and a "Premium" user experience.

The system is built on a **decoupled architecture**: a Node.js/Express backend serving a REST API, and a Vanilla JavaScript frontend that consumes this API to render dynamic content.

---

## 2. Technology Stack

### **Backend & Database**

* **Runtime:** Node.js
* **Framework:** **Express.js** (Used for routing, API endpoint creation, and middleware management).
* **Database:** **SQLite3** (`movies.db`).
* *Source:* The dataset was originally sourced from **Kaggle** (IMDb/TMDB datasets), cleaned, and imported into a local SQLite relational database for zero-latency queries.


* **File System (FS):** Native Node.js `fs` module is used for handling JSON-based review storage (`reviews.json`), creating a lightweight NoSQL-style storage for user-generated content without needing a heavy database server.

### **Frontend**

* **Core:** HTML5, CSS3 (Custom), Vanilla JavaScript (ES6+).
* **No Frameworks:** React/Vue/Angular were intentionally avoided to ensure maximum performance, deeper control over the DOM, and zero build-step complexity.

### **External APIs**

* **YouTube Data API v3:** Used dynamically to fetch official trailers based on movie metadata (Year + Title) to ensure the correct trailer plays in the Hero Slider.

---

## 3. File Structure & Logic Breakdown

### **A. The Backend (`server.js`)**

This is the heart of the application. It establishes the `http://localhost:3000` server.

* **CORS Middleware:** Enabled to allow the frontend to fetch data from the API.
* **SQLite Connection:** Connects to `../datasets/movies.db`.
* **Advanced Routing:**
* `/movies/library`: Supports complex query params (`limit`, `sort`, `offset`, `genre`) for filtering.
* `/search`: Handles fuzzy search logic for finding movies.
* `/reviews`: Reads/Writes to the local JSON file for persistent user reviews.



### **B. Core Logic Scripts**

#### **1. `mainPageControls.js` (The "Brain")**

*This file manages the global UI state.*

* **Dynamic Hero Slider:** Fetches the top 5 rated movies, creates an auto-rotating carousel, and fetches YouTube trailers in real-time.
* **Client-Side Image Compression:** The `handlePFPUpload` function uses an HTML5 Canvas to resize user uploads to 150px before saving them as Base64 strings. This prevents LocalStorage overflow.
* **Self-Injecting CSS:** It contains an IIFE (`injectToastStyles`) that writes its own CSS into the document head at runtime.

#### **2. `movieLoading.js` (The Relational Engine)**

* **Metadata & Technical Mapping:** Evaluates the movie's release year to inject specific "Tech Badges" (e.g., "4K Ultra HD" for modern films vs. "Criterion Collection" for classics).
* **Relational Cross-Linking:**
* **Director Linking:** When a user opens a movie, the script fetches the director's name and immediately fires a secondary query (`/recommend/director`) to populate a "More from this Director" row.
* **Actor Filmography:** It parses the `Stars` string (e.g., "Leonardo DiCaprio, Brad Pitt"), splits it into an array, and creates clickable filters. Clicking an actor triggers a `/recommend/actors` fetch to display their other films in the database.


* **Smart Recommendations:** Uses a weighted tag-matching algorithm to find movies with similar genres or eras.

#### **3. `allMovies.js` (The Search & Sort Logic)**

* **Sorting Engine:** Handles the request logic for `sort=rating_desc`, `year_asc`, etc. It dynamically updates the grid without reloading the page.
* **Filter Chaining:** Allows users to combine filters (e.g., "Action" + "1990s" + "Sorted by Rating").

#### **4. `myList.js` & Security**

* **"The Bouncer" (IIFE):** Contains an Immediately Invoked Function Expression that runs before the page renders. If a user is not logged in, it instantly blurs the screen and throws an overlay, preventing access to the private list.

### **C. Styling (`style.css`)**

A massive, unified stylesheet containing over 500 lines of custom CSS.

* **Glassmorphism:** Heavy use of `backdrop-filter: blur()` for modals and overlays.
* **Responsive Design:** Contains a dedicated `@media` query section to re-flow grids from 4 columns (Desktop) down to 1 column (Mobile/300px width).

---

## 4. Cool Features Highlight

### **1. Relational Discovery Engine (The "Deep Dive")**

Most basic sites just show a movie. Legion Space creates a **web of connections**.

* **Director Spotlights:** If you are watching *Inception*, the system automatically queries the database for "Christopher Nolan" and builds a "Visionary Director" carousel at the bottom of the page.
* **Star Power:** The "Lead Ensemble" list is interactive. Clicking "Al Pacino" instantly re-queries the database to find every other film he is in, allowing users to explore an actor's entire career within the platform.

### **2. Client-Side Image Compression**

Instead of sending a massive image to a server, your code compresses profile pictures directly in the user's browser:

```javascript
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
// ... resizes image ...
const smallBase64 = canvas.toDataURL('image/jpeg', 0.7); // 70% Quality

```

*Why this is cool:* It creates a fast, app-like feel without costing you server bandwidth.

### **3. The "Cinematic" Metadata Engine**

The system intelligently maps data. It doesn't just print "1994." It sees "1994" + "High Rating" and dynamically appends a "Criterion Collection" or "Restored" badge to the UI, simulating a premium streaming service experience.

### **4. Sorting & Filter Logic**

The search bar isn't just text matching. It supports **Multi-Layered Sorting**:

* **Critics Choice:** Sort by `Rating (High to Low)`.
* **Modern Cinema:** Sort by `Year (Newest)`.
* **Golden Age:** Sort by `Year (Oldest)`.

---

## 5. Design Philosophy: Why No AI Chatbots?

In an era where every site is slapping a generic "Ask AI" button in the corner, Legion Space intentionally avoids this. Here is the rationale:

1. **Curation Over Hallucination:**
* AI Chatbots frequently "hallucinate" (invent) movie plots or cast members. Legion Space relies on **SQLite** and **Kaggle** data. This ensures that every piece of data shown is hard-coded fact, not a probabilistic guess.


2. **Performance & Latency:**
* AI queries require round-trips to external servers (OpenAI/Gemini), introducing lag. Your local SQLite queries run in milliseconds. A "Cinematography" site needs to feel snappy and visual, not text-heavy and slow.


3. **The "Human" Touch:**
* The "Cinematic Moods" filters (e.g., *Visually Intense*, *Neon Aesthetic*) were manually mapped. An AI categorization is often generic ("Action", "Sci-Fi"). Manual mapping proves the developer understands the *art* of film, not just the code.


4. **User Fatigue:**
* Modern users are developing "AI Blindness." They ignore chatbots because they feel impersonal. By building a robust **Search** and **Filter** system, you respect the user's intelligence, allowing them to find what they want via UI interaction rather than conversation.



---

## 6. How to Run This Project

1. **Initialize:**
Ensure you have Node.js installed. Open your terminal in the project folder.
```bash
npm install express sqlite3 cors

```


2. **Start the Backend:**
```bash
node server.js

```


*Console should read: "✅ Connected to movies database"*
3. **Launch Frontend:**
Open `html/indexMain.html` in your browser (or use VS Code Live Server).
4. **Verify:**
Open the Developer Console (`F12`). You should see:
> *✅ MAIN PAGE CONTROLS LOADED*
> *🔄 App Initializing...*
