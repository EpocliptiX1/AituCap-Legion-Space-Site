let currentPage = 0;
const limit = 50;
let isLoading = false;

// Store current filters
let activeFilters = {
    sort: 'rating_desc',
    year: 1930,
    genre: '',
    actor: '',
    director: ''
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Toggle Panel
    const toggleBtn = document.getElementById('filterToggle');
    if (toggleBtn) {
        toggleBtn.onclick = () => {
            document.getElementById('filterPanel').classList.toggle('open');
        };
    }

    // 2. Year Slider Update
    const yearSlider = document.getElementById('yearSlider');
    const yearDisplay = document.getElementById('yearValue');
    if (yearSlider) {
        yearSlider.oninput = () => yearDisplay.innerText = yearSlider.value;
    }

    // 3. Apply Button Logic
    const applyBtn = document.getElementById('applyFilters');
    if (applyBtn) {
        applyBtn.onclick = () => {
            console.log("Applying filters..."); // check if its working
            
            // Clear current list
            document.getElementById('libraryGrid').innerHTML = '';
            currentPage = 0;
            
            // Update filter values
            activeFilters.sort = document.getElementById('sortBy').value;
            activeFilters.year = document.getElementById('yearSlider').value;
            activeFilters.genre = document.getElementById('genreInput').value;
            activeFilters.actor = document.getElementById('actorInput').value.trim();
            activeFilters.director = document.getElementById('directorInput').value.trim();

            loadMovies();
        };
    }

    // 4. Initial Load
    loadMovies();

    // 5. Infinite Scroll
    window.onscroll = function() {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            if (!isLoading) loadMovies();
        }
    };
});

async function loadMovies() {
    isLoading = true;
    const grid = document.getElementById('libraryGrid');

    // Build URL Params
    const params = new URLSearchParams({
        offset: currentPage * limit,
        limit: limit,
        sort: activeFilters.sort,
        year: activeFilters.year,
        genre: activeFilters.genre,
        actor: activeFilters.actor,
        director: activeFilters.director
    });

    try {
        console.log("Fetching:", `http://localhost:3000/movies/library?${params}`); // DEBUG URL
        const response = await fetch(`http://localhost:3000/movies/library?${params}`);
        
        if (!response.ok) throw new Error("Server Error"); // if server crashes
        
        const movies = await response.json();

        // Handle empty results
        if (movies.length === 0) {
            if (currentPage === 0) {
                grid.innerHTML = '<p style="text-align:center; width:100%; padding:40px; color:#888;">No movies match these filters.</p>';
            }
            isLoading = false;
            return;
        }

        movies.forEach(movie => {
            const card = document.createElement('div');
            card.className = 'grid-card';
            
            const plusIconSVG = `
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6v-2z" fill="currentColor"/> 
                </svg>`;

            card.innerHTML = `
                <img src="${movie.poster_full_url}" onclick="window.location.href='movieInfo.html?id=${movie.ID}'">
                
                <div class="card-hover-info">
                    <div class="hover-btns">
                        <button class="hover-play" onclick="window.location.href='movieInfo.html?id=${movie.ID}'">▶</button>
                        <button class="hover-add" onclick="toggleMyList('${movie.ID}', '${movie['Movie Name'].replace(/'/g, "\\'")}')">
                            ${plusIconSVG}
                        </button>
                    </div>

                    <div class="info-text">
                        <h4>${movie['Movie Name']}</h4>
                        <span class="match-score">⭐ ${movie.Rating}</span>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        currentPage++;
        isLoading = false;
    } catch (err) { 
        console.error("Library failed to load:", err); 
        isLoading = false; 
    }
}

// --- MY LIST LOGIC ---
window.toggleMyList = function(id, name) {
    let list = JSON.parse(localStorage.getItem('myList')) || [];
    let message = "";

    // Convert id to string to ensure matching works
    id = String(id);

    if (list.includes(id)) {
        list = list.filter(item => item !== id);
        message = `Removed ${name}`;
    } else {
        list.push(id);
        message = `Added ${name} to My List`;
    }
    
    localStorage.setItem('myList', JSON.stringify(list));
    showToast(message); // make sure showToast is also global  
    
    // Update the button UI if we are on the info page
    if (typeof updateInfoButtonUI === "function") updateInfoButtonUI(id);
}
