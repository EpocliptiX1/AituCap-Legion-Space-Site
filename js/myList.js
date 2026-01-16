(function checkAccess() {
    const user = localStorage.getItem('username');
    
    if (!user) {
        // Create the UI block immediately
        const injectLock = () => {
            const overlay = document.createElement('div');
            overlay.className = 'locked-overlay';
            overlay.innerHTML = `
                <div class="locked-box">
                    <div class="lock-icon" style="font-size: 50px; margin-bottom: 20px;">🔒</div>
                    <h2>Private Collection</h2>
                    <p style="display: block;margin-bottom: 10px;">This list is only available to registered members.</p>
                    <a href="indexMain.html#promoMarquee">
                        <button class="btn-locked-signin">Sign In / Join</button>
                    </a>                    
                    <br><br>
                    <a href="indexMain.html" style="color: #666; font-size: 13px; text-decoration: none;">← Back to Home</a>
                </div>
            `;
            document.body.appendChild(overlay);
            document.body.style.overflow = 'hidden';

            const wrapper = document.querySelector('.list-wrapper');
            if (wrapper) wrapper.style.filter = 'blur(20px)';
        };

        // If body is ready, inject now. If not, wait for it.
        if (document.body) injectLock();
        else window.addEventListener('DOMContentLoaded', injectLock);
        
        // Stop any further execution of this script
        throw new Error("Access Denied: Redirecting to Login UI");
    }
})();


// -----------------------------above is the blocking mechanism, below loading movies goes-----------------------------\\
document.addEventListener('DOMContentLoaded', async () => {
    const username = localStorage.getItem('username');
    const titleElement = document.querySelector('.list-title');
    
    if (username && titleElement) {
        titleElement.innerText = `${username}'s List`;
    }

    const grid = document.getElementById('myListGrid');
    const savedIds = JSON.parse(localStorage.getItem('myList')) || [];

    // If list is empty, just make the suers see add btn
    if (savedIds.length === 0) return; 

    try {
        const response = await fetch('http://localhost:3000/movies/get-list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: savedIds })
        });
        const movies = await response.json();

        const movieHtml = movies.map(movie => `
            <div class="grid-card">
                <img src="${movie.poster_full_url}" onclick="window.location.href='movieInfo.html?id=${movie.ID}'">
                
                <div class="card-hover-info">
                    <div class="hover-btns">
                        <button class="hover-play" onclick="window.location.href='movieInfo.html?id=${movie.ID}'">▶</button>
                        
                        <button class="hover-remove" style="padding-top: 3px;" onclick="removeFromList('${movie.ID}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="25px" height="25px" viewBox="0 0 24 24" fill="#f96d00">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L12 10.5858L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 6.31658 18.7071 6.70711L13.4142 12L18.7071 17.2929C19.0976 17.6834 19.0976 18.3166 18.7071 18.7071C18.3166 19.0976 17.6834 19.0976 17.2929 18.7071L12 13.4142L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071C4.90237 18.3166 4.90237 17.6834 5.29289 17.2929L10.5858 12L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z" fill="#f96d00"/>
                          
                            </svg>
                        </button>
                    </div>

                    <div class="info-text">
                        <h4>${movie['Movie Name']}</h4>
                        <span class="match-score">⭐ ${movie.Rating}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Insert movies BEFORE the add card not after
        grid.insertAdjacentHTML('afterbegin', movieHtml);
        
    } catch (err) { console.error(err); }
});

// ---   GLOBAL REMOVE FUNCTION ---
window.removeFromList = function(id) {
    let list = JSON.parse(localStorage.getItem('myList')) || [];
    
    //   Convert both to String
    list = list.filter(item => String(item) !== String(id));
    
    localStorage.setItem('myList', JSON.stringify(list));
    
    // Refresh page 
    location.reload(); 
};