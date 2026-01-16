/* =========================================
   1. DYNAMIC HERO SLIDER LOGIC
   ========================================= */
let heroMovies = []; 
let currentSlide = 0;

async function initHero() {
    try {
        const response = await fetch('http://localhost:3000/movies/library?limit=5&sort=rating_desc');
        const movies = await response.json();

        heroMovies = movies.map(movie => ({
            id: movie.ID,
            title: movie['Movie Name'],
            imdbId: movie.imdb_id || "", 
            rating: movie.Rating,
            year: movie.Year || movie.release_date?.split('-')[0] || "N/A",
            runtime: movie.Runtime || "-- min",
            plot: movie.Plot || "No plot summary available for this title.",
            stars: movie.Stars || "",
            searchName: movie['Movie Name']
        }));

        if (heroMovies.length > 0) {
            updateHero();
            updateDots();
        }
    } catch (err) {
        console.error("Hero Init Error:", err);
    }
}

async function updateHero() {
    if (heroMovies.length === 0) return;
    const movie = heroMovies[currentSlide];
    
    const content = document.querySelector('.hero-content');
    if (content) content.style.opacity = '0'; 

    // 1. Fetch the trailer first
    if (window.fetchYTId) {
        const tId = await window.fetchYTId(movie.title);
        movie.currentTrailerId = tId;

        const iframe = document.getElementById('heroTrailerFrame');
        if (iframe && tId) {
            // Set background trailer
            iframe.src = `https://www.youtube.com/embed/${tId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${tId}`;
        }
    }

    setTimeout(() => {
        const titleEl = document.getElementById('heroTitle');
        const ratingEl = document.getElementById('statRating'); 
        const dateEl = document.getElementById('statDate');     
        const runtimeEl = document.getElementById('statRuntime'); 
        const descEl = document.getElementById('heroDesc');     

        if (titleEl) titleEl.innerText = movie.title;
        if (ratingEl) ratingEl.innerText = movie.rating || "--";
        if (dateEl) dateEl.innerText = movie.year || "----";
        if (runtimeEl) runtimeEl.innerText = movie.runtime || "-- min";
        if (descEl) descEl.innerText = movie.plot;
        
        // IMPORTANT: Reveal the content
        if (content) content.style.opacity = '1';
        updateDots();
    }, 300);
}
// ARROW LOGIC (Fixed global scope)
window.nextSlide = function() {
    currentSlide = (currentSlide + 1) % heroMovies.length;
    updateHero();
};

window.prevSlide = function() {
    currentSlide = (currentSlide - 1 + heroMovies.length) % heroMovies.length;
    updateHero();
};

window.goToSlide = function(index) {
    currentSlide = index;
    updateHero();
};

function updateDots() {
    const dotsContainer = document.getElementById('sliderDots');
    if(dotsContainer) {
        dotsContainer.innerHTML = heroMovies.map((_, i) => 
            `<span class="dot ${i === currentSlide ? 'active' : ''}" onclick="goToSlide(${i})"></span>`
        ).join('');
    }
}

/* =========================================
   2. MOVIE OVERLAY & PLAY LOGIC
   ========================================= */
async function updateHero() {
    if (heroMovies.length === 0) return;
    const movie = heroMovies[currentSlide];
    
    const content = document.querySelector('.hero-content');
    if (content) content.style.opacity = '0';

    if (window.fetchYTId) {
        const tId = await window.fetchYTId(movie.title);
        movie.currentTrailerId = tId; 

        const heroFrame = document.getElementById('heroTrailerFrame');
        if (heroFrame && tId) {
            heroFrame.src = `https://www.youtube.com/embed/${tId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${tId}&rel=0`;
        }
    }

    // 2. UPDATE TEXT: Matching your HTML IDs exactly
    setTimeout(() => {
        if (document.getElementById('heroTitle')) document.getElementById('heroTitle').innerText = movie.title;
        if (document.getElementById('statRating')) document.getElementById('statRating').innerText = movie.rating || "--";
        if (document.getElementById('statDate')) document.getElementById('statDate').innerText = movie.year || "----";
        if (document.getElementById('statRuntime')) document.getElementById('statRuntime').innerText = movie.runtime || "-- min";
        if (document.getElementById('heroDesc')) document.getElementById('heroDesc').innerText = movie.plot;

        if (content) content.style.opacity = '1';
        updateDots();
    }, 300);
}
window.openMovie = async function() {
    const movie = heroMovies[currentSlide];
    const overlay = document.getElementById('movieOverlay');
    if(!overlay || !movie) return;
    // text setter
    document.getElementById('statTitle').innerText = movie.title;
    document.getElementById('statRatingOverlay').innerText = movie.rating || "--";
    document.getElementById('statDateOverlay').innerText = movie.year || "----";
    document.getElementById('statRuntimeOverlay').innerText = movie.runtime || "-- min";
    document.getElementById('statPlot').innerText = movie.plot;

    const castList = document.getElementById('castListOverlay');
    if (castList && movie.stars) {
        const cleanedStars = String(movie.stars).replace(/[\[\]']/g, ""); 
        const actors = cleanedStars.split(',').slice(0, 4); 
        castList.innerHTML = actors.map(name => `
            <li> <p>${name.trim()}</p></li>
        `).join('');
    }

    const maxTrailer = document.getElementById('maxTrailer');
    if (maxTrailer) {
        maxTrailer.src = ""; // Clear old video 
        
        // If the ID isn't saved yet, fetch it live
        if (!movie.currentTrailerId && window.fetchYTId) {
            movie.currentTrailerId = await window.fetchYTId(movie.title);
        }

        if (movie.currentTrailerId) {
            maxTrailer.src = `https://www.youtube.com/embed/${movie.currentTrailerId}?autoplay=1&rel=0&enablejsapi=1`;
        }
    }

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
};

window.triggerPlay = function() {
    openMovie();
    // Teleport to Plot
    setTimeout(() => {
        const plot = document.getElementById('statPlot');
        if(plot) plot.scrollIntoView({ behavior: 'auto', block: 'center' });
    }, 100);
};

window.closeMovie = function() {
    document.getElementById('movieOverlay').classList.remove('active');
    document.getElementById('maxTrailer').src = "";
    document.body.style.overflow = 'auto';
};

/* =========================================
   3. REDIRECT & TRAILER FETCH
   ========================================= */
window.openRedirectModal = function() {
    document.getElementById('redirectModal').classList.add('active');
};

window.closeRedirectModal = function() {
    document.getElementById('redirectModal').classList.remove('active');
};

window.proceedToIMDb = function() {
    const movie = heroMovies[currentSlide];
    // If no imdbId, search IMDb for the title
    const url = movie.imdbId 
        ? `https://www.imdb.com/title/${movie.imdbId}/` 
        : `https://www.imdb.com/find?q=${encodeURIComponent(movie.title)}`;
    window.open(url, "_blank");
    closeRedirectModal();
};
 

// Ensure initHero runs when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initHero();
});

document.addEventListener('DOMContentLoaded', async () => {
    
    initSlider();

    // 2. PLAY BUTTON LOGIC
    const playBtn = document.querySelector('.btn-play');
    if(playBtn) playBtn.onclick = triggerPlay;

    // ===============================================================
    // SEARCH BAR LOGIC (Navbar)
    // ===============================================================
    const searchInput = document.querySelector('.search-box input');
    const searchBox = document.querySelector('.search-box');
    
    if (searchInput && searchBox) {
        let resultsMenu = document.getElementById('searchResults');
        if (!resultsMenu) {
            resultsMenu = document.createElement('div');
            resultsMenu.id = 'searchResults';
            resultsMenu.className = 'search-results-menu';
            searchBox.appendChild(resultsMenu);
        }

        // Expansion
        searchInput.addEventListener('focus', () => searchBox.classList.add('expanded'));
        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                searchBox.classList.remove('expanded');
                resultsMenu.classList.remove('active');
            }, 250);
        });

        // Dropdown Search
        searchInput.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            if (query.length > 0) {
                resultsMenu.classList.add('active');
                try {
                    const response = await fetch(`http://localhost:3000/search?q=${encodeURIComponent(query)}`);
                    const movies = await response.json();
                    renderSearchResults(movies, resultsMenu);
                } catch (err) {
                    console.error("Backend error:", err);
                    resultsMenu.innerHTML = '<div style="padding:15px; color:red">Backend offline</div>';
                }
            } else {
                resultsMenu.classList.remove('active');
            }
        });

        // Enter Key Redirect
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                if (query.length > 0) {
                    // --- SEARCH COUNTER LOGIC ---
                    let searches = parseInt(localStorage.getItem('searchCount')) || 0;
                    let tier = localStorage.getItem('userTier') || "Free";
                    
                    // 1. Determine limit based on tier
                    let limit = (tier === 'Gold') ? Infinity : (tier === 'Premium' ? 50 : 5);

                    // 2. Check if the user is blocked
                    if (searches >= limit) {
                        showLimitToast("🚀 Limit reached! Upgrade to Gold for more searches.");
                        e.preventDefault();
                        return;
                    }

                    // 3. Increment and Save
                    searches++;
                    localStorage.setItem('searchCount', searches);
                    console.log(`Search registered! Total: ${searches}/${limit === Infinity ? '∞' : limit}`);

                    // 4. Update the UI ID 'statSearch' if it's currently visible
                    const statElem = document.getElementById('statSearch');
                    if (statElem) {
                        statElem.innerText = `${searches} / ${limit === Infinity ? '∞' : limit}`;
                    }
                    // Proceed to results page
                    window.location.href = `searchQueryResult.html?q=${encodeURIComponent(query)}`;
                }
            }
        });
    }

    // ===============================================================
    // RESULTS PAGE LOGIC (Search Grid with Overlays)
    // ===============================================================
    const fullResultsGrid = document.getElementById('fullResultsGrid');
    
    if (fullResultsGrid) {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        
        if (query) {
            const display = document.getElementById('queryDisplay');
            if(display) display.innerText = query;
            
            try {
                const response = await fetch(`http://localhost:3000/search?q=${encodeURIComponent(query)}`);
                const movies = await response.json();
                
                // --- GENERATE HTML ---
                fullResultsGrid.innerHTML = movies.map(movie => `
                    <div class="movie-card" onclick="window.location.href='movieInfo.html?id=${movie.ID}'">                        
                        <div style="position: relative; width: 100%; height: 270px;">
                            <img src="${movie.poster_full_url}" 
                                    alt="${movie['Movie Name']}" 
                                    style="width:100%; height:100%; object-fit:cover;"
                                    onerror="this.src='/img/placeholder.jpg'">
                            
                            <div class="card-overlay">
                                <svg class="play-icon-svg" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/> 
                                </svg>
                            </div>
                        </div>

                        <div class="movie-card-info">
                            <h3>${movie['Movie Name']}</h3>
                            <p>${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'} • ⭐ ${movie.imdb_rating}</p>
                        </div>
                    </div>
                `).join('');
                
            } catch (err) {
                console.error("Failed to load results:", err);
                fullResultsGrid.innerHTML = '<p style="color:red; text-align:center;">Could not connect to database.</p>';
            }
        }
    }
});

// Helper Functions
function renderSearchResults(movies, container) {
    if (movies.length === 0) {
        container.innerHTML = '<div style="padding:20px; color:#888; text-align:center;">No results found.</div>';
        return;
    }

    container.innerHTML = movies.map(movie => `
        <div class="search-item" onclick="window.location.href='movieInfo.html?id=${movie.ID}'">
            <img src="${movie.poster_full_url}" alt="poster" onerror="this.src='../img/placeholder.jpg'">
            <div class="search-info">
                <h5>${movie['Movie Name']}</h5>
                <p>${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'} • ⭐ ${movie.imdb_rating || 'N/A'} IMDb</p>
            </div>
        </div>
    `).join('');
}

function initSlider() {
    const dotsContainer = document.getElementById('sliderDots');
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';
    heroMovies.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        if (index === 0) dot.classList.add('active');
        dot.onclick = () => goToSlide(index);
        dotsContainer.appendChild(dot);
    });
}
// hero updater
function updateHeroUI() {
    if (isAnimating) return;
    isAnimating = true;
    const textSection = document.querySelector('.hero-content');
    const trailerSection = document.querySelector('.hero-trailer-side');
    if (textSection && trailerSection) {
        textSection.classList.add('content-hidden');
        trailerSection.classList.add('content-hidden');
    }
    setTimeout(() => {
        const movie = heroMovies[currentSlide];
        document.getElementById('heroTitle').innerText = movie.title;
        document.getElementById('statRating').innerText = movie.rating;
        document.getElementById('statDate').innerText = movie.year;
        document.getElementById('statRuntime').innerText = movie.runtime;
        document.getElementById('heroDesc').innerText = movie.plot;
        const trailerFrame = document.getElementById('heroTrailerFrame');
        if (trailerFrame) {
            trailerFrame.src = `https://www.youtube.com/embed/${movie.trailerId}?start=15&autoplay=1&mute=1&controls=0&loop=1&playlist=${movie.trailerId}`;
        }
        const dots = document.querySelectorAll('.dot');
        dots.forEach(d => d.classList.remove('active'));
        if(dots[currentSlide]) dots[currentSlide].classList.add('active');
        if (textSection && trailerSection) {
            textSection.classList.remove('content-hidden');
            trailerSection.classList.remove('content-hidden');
        }
        isAnimating = false;
    }, 400); 
}
function nextSlide() {
    if (isAnimating) return;
    currentSlide = (currentSlide + 1) % heroMovies.length;
    updateHeroUI();
}
function prevSlide() {
    if (isAnimating) return;
    currentSlide = (currentSlide - 1 + heroMovies.length) % heroMovies.length;
    updateHeroUI();
}
function goToSlide(index) {
    if (isAnimating || index === currentSlide) return;
    currentSlide = index;
    updateHeroUI();
}
 
function closeMovie() {
    const overlay = document.getElementById('movieOverlay');
    if(overlay) overlay.classList.remove('active');
    setTimeout(() => {
        const trailer = document.getElementById('maxTrailer');
        if(trailer) trailer.src = "";
    }, 400);
}
window.onclick = function(event) {
    let overlay = document.getElementById('movieOverlay');
    if (event.target == overlay) {
        closeMovie();
    }
}
function triggerPlay() {
    openMovie();

    // "Teleport" to the Plot Text
    setTimeout(() => {
        const plotElement = document.getElementById('statPlot');
        if (plotElement) {
            plotElement.scrollIntoView({ behavior: 'auto', block: 'center' });
            
            plotElement.style.transition = "color 0.2s";
            const oldColor = plotElement.style.color;
            plotElement.style.color = "#f96d00";
            
            setTimeout(() => {
                plotElement.style.color = oldColor || "#ccc";
            }, 800);
        }
    }, 50); 
}
function openRedirectModal() {
    const modal = document.getElementById('redirectModal');
    if(modal) {
        modal.classList.add('active'); 
    }
}

// This is the method that offs the menu
function closeRedirectModal() {
    const modal = document.getElementById('redirectModal');
    if(modal) {
        modal.classList.remove('active');
    }
}

// This handles the actual navigation
function proceedToIMDb() {
    const currentMovie = heroMovies[currentSlide];
    
    if (currentMovie && currentMovie.imdbId) {
        // Open the dynamic link
        window.open(`https://www.imdb.com/title/${currentMovie.imdbId}/`, "_blank");
        closeRedirectModal();
    } else {
        alert("IMDb link not available for this title.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchRow('rowTrending', 'rating_desc');
    fetchRow('rowGrossing', 'success_desc');
    fetchRow('rowNewest', 'date_desc');
    fetchRow('rowLongest', 'duration_desc');
    

    fetchRow('rowKazakh', 'rating_desc'); 

    setupMarquee();
});

async function fetchRow(containerId, sortType) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        // Fetch top 20  
        const res = await fetch(`http://localhost:3000/movies/library?sort=${sortType}&limit=20`);
        const movies = await res.json();

        container.innerHTML = movies.map(movie => createCard(movie)).join('');
    } catch (err) {
        console.error("Error fetching row:", err);
    }
}

function createCard(movie) {
    const plusIconSVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6v-2z" fill="currentColor"/></svg>`;

    return `
        <div class="grid-card">
            <img src="${movie.poster_full_url}" onclick="window.location.href='movieInfo.html?id=${movie.ID}'" onerror="this.src='/img/placeholder.jpg'">
            <div class="card-hover-info">
                <div class="hover-btns">
                    <button class="hover-play" onclick="window.location.href='movieInfo.html?id=${movie.ID}'">▶</button>

                </div>
                <div class="info-text">
                    <h4>${movie['Movie Name']}</h4>
                    <span class="match-score">⭐ ${movie.Rating}</span>
                </div>
            </div>
        </div>
    `;
}

// --- MARQUEE LOGIC ---
async function setupMarquee() {
    const marquee = document.getElementById('promoMarquee');
    if (!marquee) return;

    // Fetch random assortment for the background
    const res = await fetch(`http://localhost:3000/movies/library?limit=20`);
    const movies = await res.json();

    // Duplicate list for inf to ensure smooth inf loop
    const combined = [...movies, ...movies]; 

    marquee.innerHTML = combined.map(m => `
        <div class="marquee-card">
            <img src="${m.poster_full_url}" alt="Poster">
        </div>
    `).join('');
}
// --- SIGNUP MODAL LOGIC ---
// --- ON PAGE LOAD: CHECK FOR USER ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Check if pro0mpt should be hidden
    if (localStorage.getItem('username')) {
        const promo = document.querySelector('.promo-section');
        if (promo) promo.style.display = 'none';
    }

    const user = localStorage.getItem('username');
    if (user && !sessionStorage.getItem('greeted')) {
        setTimeout(() => {
            const toast = document.getElementById('notification-toast');
            if (toast) {
                toast.innerText = `Hello again, ${user}!`;
                toast.classList.remove('toast-hidden');
                setTimeout(() => toast.classList.add('toast-hidden'), 3000);
            }
        }, 1000);
        sessionStorage.setItem('greeted', 'true');
    }
});

// --- MODAL CONTROLS ---
function openSignupModal() {
    const modal = document.getElementById('signupModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Stop bg scrolling
    }
}

function closeSignupModal() {
    const modal = document.getElementById('signupModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto'; // Re-enable scrolol
    }
}

// Close if clicking outside the box
const signupModal = document.getElementById('signupModal');
if (signupModal) {
    signupModal.addEventListener('click', (e) => {
        if (e.target.id === 'signupModal') closeSignupModal();
    });
}

// --- SIGNUP LOGIC  ---
function handleSignup(e) {
    e.preventDefault(); 
    
    // 1. GET VALUES FROM INPUTS
    const usernameInput = document.getElementById('signupUser');
    const emailInput = document.getElementById('signupEmail');
    const tierInput = document.getElementById('signupTier'); 
    
    // Fallback values if inputs are missing
    const username = usernameInput ? usernameInput.value : "Guest";
    const email = emailInput ? emailInput.value : "email@example.com";
    const tier = tierInput ? tierInput.value : "Free"; 
    
    const btn = document.querySelector('.btn-signup');
    const originalText = btn ? btn.innerText : "Create Account";
    
    // UI Loading State
    if (btn) {
        btn.innerText = "Creating Account...";
        btn.style.opacity = "0.7";
        btn.disabled = true;
    }
    
    setTimeout(() => {
        // SAVE DATA TO LOCAL  
        localStorage.setItem('username', username);
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userTier', tier); 
        
        // Initialize usage counters as strings for subscription logic
        localStorage.setItem('searchCount', '0');
        localStorage.setItem('viewCount', '0');

        closeSignupModal();
        
        // 3. SHOW SUCCESS MESSAGE
        const toast = document.getElementById('notification-toast');
        if(toast) {
            toast.innerText = `Welcome ${username}! You are now a ${tier} member.`;
            toast.classList.remove('toast-hidden');
            setTimeout(() => toast.classList.add('toast-hidden'), 4000);
        } else {
            alert(`Welcome ${username}! Your ${tier} account is ready.`);
        }
        
        // CLEANUP UI
        if (btn) {
            btn.innerText = originalText;
            btn.style.opacity = "1";
            btn.disabled = false;
        }
        
        const promo = document.querySelector('.promo-section');
        if(promo) {
            promo.style.display = 'none';
        }
        
        sessionStorage.setItem('greeted', 'true');

        location.reload(); 
        
    }, 1500);
}
window.navigateToMovie = function(movieId) {
    window.location.href = `movieInfo.html?id=${movieId}`;
};

 
function checkUsageLimit(type) {
    const tier = localStorage.getItem('userTier') || 'Free';
    const searches = parseInt(localStorage.getItem('searchCount') || '0');
    const views = parseInt(localStorage.getItem('viewCount') || '0');

    if (tier === 'Gold') return true; // Unlimited for Gold members

    if (type === 'search') {
        const limit = tier === 'Premium' ? 50 : 5;
        if (searches >= limit) {
            alert("Search limit reached! Upgrade to Premium or Gold for more.");
            return false;
        }
        localStorage.setItem('searchCount', (searches + 1).toString());
    }

    if (type === 'view') {
        const limit = tier === 'Premium' ? 20 : 3;
        if (views >= limit) {
            alert("Movie view limit reached!");
            return false;
        }
        localStorage.setItem('viewCount', (views + 1).toString());
    }
    return true;
}

 document.addEventListener('DOMContentLoaded', () => {
    // Use a small break to ensure the movie data and button have loaded from the DB
    setTimeout(() => {
        const watchBtn = document.querySelector('.btn-watch');
        if (watchBtn) {
            watchBtn.onclick = async () => {
                // THE ONLY PLACE views are counted
                if (typeof window.checkAndIncrement === "function") {
                    const canWatch = window.checkAndIncrement('view');
                    if (!canWatch) return; // Stop if limit reached
                }

                const modal = document.getElementById('trailerModal');
                if (modal) modal.classList.add('show');
            };
        }
    }, 500); 
});
// This function handles opening AND closing the sidebar
console.log("✅ MAIN PAGE CONTROLS LOADED");

window.toggleAccountMenu = function() {
    console.log("🎯 CLICK DETECTED: Running toggleAccountMenu...");

    // MATCH YOUR SNIPPET ID: accountDropdown
    const dropdown = document.getElementById('accountDropdown');
    
    if (!dropdown) {
        console.error("❌ ERROR: Could not find id='accountDropdown'.");
        return;
    }

    // Toggle visibility
    dropdown.classList.toggle('active');

    if (dropdown.classList.contains('active')) {
        const username = localStorage.getItem('username');
        const tier = localStorage.getItem('userTier') || "Free";
        const searches = parseInt(localStorage.getItem('searchCount')) || 0;
        const views = parseInt(localStorage.getItem('viewCount')) || 0;

        // --- AUTH CHECK: Disable/Enable Settings and Logout ---
        const settingsLink = dropdown.querySelector('a[onclick="openSettings()"]');
        const logoutLink = dropdown.querySelector('a[onclick="logout()"]');
        const isSignedIn = !!username;

        if (!isSignedIn) {
            if (settingsLink) settingsLink.classList.add('link-disabled');
            if (logoutLink) logoutLink.classList.add('link-disabled');
            if (document.getElementById('navUsername')) document.getElementById('navUsername').innerText = "Guest";
        } else {
            if (settingsLink) settingsLink.classList.remove('link-disabled');
            if (logoutLink) logoutLink.classList.remove('link-disabled');
            if (document.getElementById('navUsername')) document.getElementById('navUsername').innerText = username;
        }

        // --- UPDATE STATS (Using IDs from your snippet) ---
        const sLimit = tier === 'Premium' ? 50 : (tier === 'Gold' ? '∞' : 5);
        const vLimit = tier === 'Premium' ? 20 : (tier === 'Gold' ? '∞' : 3);

        if (document.getElementById('dropTier')) document.getElementById('dropTier').innerText = tier + " Tier";
        if (document.getElementById('statSearch')) document.getElementById('statSearch').innerText = `${searches}/${sLimit}`;
        if (document.getElementById('statView')) document.getElementById('statView').innerText = `${views}/${vLimit}`;
    }
};

// Create an alias so the "X" button (toggleSidebar) also works
window.toggleSidebar = window.toggleAccountMenu;

window.logout = function() {
    localStorage.clear();
    location.reload();
};
// Stop the menu from closing itself when you click inside it
document.addEventListener('DOMContentLoaded', () => {
    const dropdown = document.getElementById('accountDropdown');
    if (dropdown) {
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation(); 
        });
    }
});
function showLimitToast(message) {
    // Prevent multiple toasts from stacking and looking weird
    const existing = document.querySelector('.limit-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'limit-toast';
    toast.innerHTML = `
        <span>${message}</span>
        <div class="toast-progress"></div>
    `;

    document.body.appendChild(toast);

    // Animate the progress bar  
    const progressBar = toast.querySelector('.toast-progress');
    progressBar.style.animation = 'progressShrink 3s linear forwards';

    // Remove the toast after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = '0.5s';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}
// THE UPLOAD HANDLER (auto resize too)
window.handlePFPUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Create a canvas to resize the image
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 150; 
            const scaleSize = MAX_WIDTH / img.width;
            
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Convert to a compressed Base64 string (JPEG quality 0.7)
            const smallBase64 = canvas.toDataURL('image/jpeg', 0.7);
            
            localStorage.setItem('userPFP', smallBase64);
            
            // Update UI
            applyPFPToUI(smallBase64);
            
            console.log("Image resized and saved!");
        };
        img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
};

// Function to apply the image to all PFP icons on the page
function applyPFPToUI(imagePath) {
    if (!imagePath) return;

    // Target the navbar icon and the sidebar icon
    const navPFP = document.querySelector('.grey-profile-pic');
    const sidebarPFP = document.getElementById('sidebarPFP');

    if (navPFP) navPFP.style.backgroundImage = `url(${imagePath})`;
    if (sidebarPFP) sidebarPFP.style.backgroundImage = `url(${imagePath})`;
}

// Initialize PFP on page load
document.addEventListener('DOMContentLoaded', () => {
    // 1. Grab data from storage
    const savedName = localStorage.getItem('username');

    // 2. If a name exists, apply it to the Navbar and Sidebar immediately
    if (savedName) {
        if (document.getElementById('navUsername')) {
            document.getElementById('navUsername').innerText = savedName;
        }
        if (document.getElementById('sideUsername')) {
            document.getElementById('sideUsername').innerText = savedName;
        }
    }


   
});


// PEN THE SETTINGS MODAL
window.openSettings = function() {
    if (!localStorage.getItem('username')) {
        showLimitToast("⚠️ Sign in to access settings!");
        return;
    }
    document.getElementById('settingsModal').classList.add('active');
};

window.logout = function() {
    if (!localStorage.getItem('username')) return; 
    localStorage.clear();
    location.reload();
};
//CLOSE THE SETTINGS MODAL
window.closeSettings = function() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.remove('active');
};

//SAVE ACCOUNT CHANGES
window.saveSettings = function() {
    const newName = document.getElementById('settingsUsername').value;

    if (newName.trim() !== "") {
        localStorage.setItem('username', newName);
        
        // Force update 
        const navName = document.getElementById('navUsername');
        const sideName = document.getElementById('sideUsername');
        
        if (navName) navName.innerText = newName;
        if (sideName) sideName.innerText = newName;
        
        console.log("Username updated to:", newName);
    }

    closeSettings();
    showLimitToast("✅ Settings Saved!");
};
// --- REVIEWS LOGIC ---

async function loadReviews() {
    const container = document.getElementById('reviewsGrid');
    if (!container) return;

    try {
        const res = await fetch('http://localhost:3000/reviews');
        const reviews = await res.json();

        // 1. Create the "Add Review" Card 
        const addCardHTML = `
            <div class="review-card add-card" onclick="openReviewModal()">
                <div class="plus-icon">+</div>
                <h3>Write a Review</h3>
            </div>
        `;

        // 2. Generate the actual Reviews HTML
        const reviewsHTML = reviews.map(r => `
            <div class="review-card">
                <div class="review-header">
                    <div class="review-pfp" 
                         style="width:40px; height:40px; border-radius:50%; background-color:#444; background-size:cover; background-position:center; ${r.pfp ? `background-image: url('${r.pfp}')` : ''}">
                    </div>
                    <div class="review-info">
                        <h4>${r.user}</h4>
                        <span class="stars">${"⭐".repeat(r.stars)}</span>
                    </div>
                </div>
                <div class="review-body">
                    <p>"${r.text}"</p>
                    <small>Watching: ${r.movie}</small>
                </div>
            </div>
        `).join('');

        //Combine 
        container.innerHTML = addCardHTML + reviewsHTML;
        
    } catch (err) {
        console.error("Failed to load reviews:", err);
    }
}

document.addEventListener('DOMContentLoaded', loadReviews);
window.openReviewModal = () => document.getElementById('reviewModal').classList.add('active');
window.closeReviewModal = () => document.getElementById('reviewModal').classList.remove('active');

// --- PFP LOGIC: Targeting Classes properly ---
 
 window.handlePFPUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onloadend = function() {
        const base64Image = reader.result;
        
        // Save to localStorage 
        localStorage.setItem('userPFP', base64Image);
        
        // Update the display asap
        applyPFPToUI(base64Image);
        
        if (typeof showLimitToast === "function") {
            showLimitToast("✅ Profile Picture Updated!");
        }
    };
    
    reader.readAsDataURL(file);
};
/* =========================================
   CUSTOM TOAST HELPER
   ========================================= */


// Define the helper function so it's always available
function applyPFPToUI(imagePath) {
    if (!imagePath) return;

    const icons = document.querySelectorAll('.grey-profile-pic, .large-profile-icon');
    
    icons.forEach(icon => {
        icon.style.backgroundImage = `url('${imagePath}')`;
        icon.style.backgroundSize = 'cover';
        icon.style.backgroundPosition = 'center';
        icon.style.backgroundColor = 'transparent'; 
    });
}

// The Main 'Listener'
document.addEventListener('DOMContentLoaded', () => {
    console.log("🔄 App Initializing..."); 

    // 1. Restore Profile Picture
    const savedPFP = localStorage.getItem('userPFP');
    if (savedPFP) {
        console.log("✅ Restoring PFP from storage");
        applyPFPToUI(savedPFP);
    } else {
        console.log("ℹ️ No PFP found in storage");
    }

    // 2. Restore Username
    const savedName = localStorage.getItem('username');
    const navName = document.getElementById('navUsername');
    if (savedName && navName) {
        navName.innerText = savedName;
    }
    
    // 3. Load other components if they exist
    if (typeof initHero === 'function') initHero();
    if (typeof loadReviews === 'function') loadReviews();
});

//  ssAVE SETTINGS BUTTON LOGIC
window.saveSettings = function() {
    // --- 1. Save Username ---
    const nameInput = document.getElementById('settingsUsername');
    if (nameInput) {
        const newName = nameInput.value;
        if (newName.trim() !== "") {
            localStorage.setItem('username', newName);
            
            // Update Navbar Text asap
            const navName = document.getElementById('navUsername');
            if (navName) navName.innerText = newName;
        }
    }

    // --- 2. Save Password (if have) ---
    const passInput = document.getElementById('settingsPassword');
    if (passInput && passInput.value !== "") {
        localStorage.setItem('password', passInput.value);
    }

    // --- 3. CLOSE THE SETTINGS MODAL ---
    const settingsModal = document.getElementById('settingsModal') 
                       || document.querySelector('.settings-modal-overlay.active');
    
    if (settingsModal) {
        settingsModal.classList.remove('active');
    }

    console.log("Settings Saved & Closed");
};
/* =========================================
   PUSH FORCEFULLY PFP SYNC FUNCTION
   ========================================= */
function syncProfilePic() {
    // 1. Get the raw text data from storage
    const savedPFP = localStorage.getItem('userPFP');
    
    // 2. If nothing is saved, dont proceed
    if (!savedPFP) {
        console.log("No PFP found in storage.");
        return; 
    }

    // 3. Find empty  pfps
    const allProfileIcons = document.querySelectorAll('.grey-profile-pic, .large-profile-icon');

    // 4. push the background image onto them
    allProfileIcons.forEach(icon => {
        icon.style.backgroundImage = `url('${savedPFP}')`;
        icon.style.backgroundSize = 'cover';       
        icon.style.backgroundPosition = 'center';   
        icon.style.backgroundColor = 'transparent';  
    });
    
    console.log("✅ PFP Force Synced!");
}

// CALL IT: Run immediately  
syncProfilePic();

document.addEventListener('DOMContentLoaded', syncProfilePic);
/* =========================================
   UNIVERSAL TOAST NOTIFICATION (Self-Repairing)
========================================= */

// 1. Force-Inject the CSS  
(function injectToastStyles() {
    const styleId = 'toast-style-injection';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .custom-toast-popup {
                position: fixed;
                top: -100px;
                left: 50%;
                transform: translateX(-50%);
                background-color: #f96d00; /* Netflix Red */
                color: white;
                padding: 16px 32px;
                border-radius: 4px;
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                font-size: 16px;
                font-weight: bold;
                box-shadow: 0 4px 20px rgba(0,0,0,0.8);
                z-index: 2147483647; /* MAX POSSIBLE Z-INDEX (On top of everything) */
                transition: top 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 300px;
                justify-content: center;
            }
            .custom-toast-popup.active {
                top: 40px;
            }
        `;
        document.head.appendChild(style);
        console.log("✅ Toast Styles Injected");
    }
})();

// 2. The Toast Function
window.showToast = function(message, isError = false) {
    // 1. Remove any existing toast so they don't stack and look messy
    const existing = document.querySelector('.custom-toast-popup');
    if (existing) existing.remove();

    // 2. Create the element
    const toast = document.createElement('div');
    toast.className = 'custom-toast-popup';
    
    // 3. Logic for Icons and Colors
    const icon = isError ? '❌' : '✅';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    
    if (isError) {
        toast.style.borderLeft = "5px solid #ff4444"; // Red accent for errors
        toast.style.backgroundColor = "#1a1a1a";     // Darker background
    } else {
        toast.style.borderLeft = "5px solid #f96d00"; // Your signature Orange
    }

    document.body.appendChild(toast);

    // 4. Animation: Slide In
    setTimeout(() => {
        toast.classList.add('active');
    }, 10);

    // 5. Animation: Slide Out after 3.5 seconds
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 500); // Wait for transition to finish
    }, 3500);
};
// review submission logic
window.submitReview = async function() {
    const user = localStorage.getItem('username') || "Guest";
    const userPFP = localStorage.getItem('userPFP');
    
    const movieVal = document.getElementById('revMovie').value;
    const textVal = document.getElementById('revText').value;

    if (!movieVal || !textVal) {
        showToast("Please fill out all fields!", true);
        return;
    }

    const data = { 
        user: user, 
        pfp: userPFP,
        movie: movieVal,
        stars: document.getElementById('revStars').value,
        text: textVal 
    };

    try {
        const res = await fetch('http://localhost:3000/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            // Close modal first
            if (typeof closeReviewModal === 'function') closeReviewModal();
            else {
                 // back if function missing
                 document.getElementById('reviewModal').classList.remove('active');
            }

            // Show success message
            showToast("Review Posted Successfully!");
            
            // Refresh reviews
            if(window.loadReviews) window.loadReviews(); 
        } else {
            showToast("Error posting review.", true);
        }
    } catch (err) {
        console.error(err);
        showToast("Server connection failed.", true);
    }
};
// MOBILE MENU TOGGLE(hbamburger)
 window.toggleMobileMenu = function() {
    const nav = document.getElementById('navLinks');
    const burger = document.querySelector('.hamburger');
    
    nav.classList.toggle('active');
    

    burger.classList.toggle('toggle-burger');
};