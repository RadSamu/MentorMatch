$(document).ready(function() {
    const BASE_URL = ApiService.BASE_URL;
    const token = localStorage.getItem('token');

    let currentPage = 1;
    let currentSearchTerm = '';
    let currentSector = '';
    let currentLanguage = '';
    let currentRating = '';
    let currentMinPrice = '';
    let currentMaxPrice = '';
    let favoriteMentorIds = [];
    let lastSearchRequestId = 0; // ID per tracciare l'ultima richiesta di ricerca

    // Funzione per caricare gli ID dei mentor preferiti
    function loadFavoriteIds() {
        if (!token) {
            return $.Deferred().resolve().promise(); // Se non loggato, non fare nulla
        }
        return ApiService.get('/favorites/ids')
            .done(function(ids) {
                favoriteMentorIds = ids;
            })
            .fail(function() {
                console.error('Impossibile caricare i preferiti.');
            });
    }

    // Funzione per caricare e mostrare i mentor
    function loadMentors(searchTerm = '', sector = '', language = '', rating = '', minPrice = '', maxPrice = '', page = 1) {
        currentSearchTerm = searchTerm;
        currentSector = sector;
        currentLanguage = language;
        currentRating = rating;
        currentMinPrice = minPrice;
        currentMaxPrice = maxPrice;
        currentPage = page;

        let url = `/mentors?page=${page}&limit=9`;
        if (searchTerm) {
            url += `&search=${encodeURIComponent(searchTerm)}`;
        }
        if (sector) {
            url += `&sector=${encodeURIComponent(sector)}`;
        }
        if (language) {
            url += `&language=${encodeURIComponent(language)}`;
        }
        if (rating) {
            url += `&min_rating=${rating}`;
        }
        if (minPrice) {
            url += `&min_price=${minPrice}`;
        }
        if (maxPrice) {
            url += `&max_price=${maxPrice}`;
        }

        // Incrementa l'ID della richiesta corrente
        const requestId = ++lastSearchRequestId;

        // --- Skeleton Loading (Mostra card finte durante il caricamento) ---
        const mentorsList = $('#mentors-list');
        let skeletonHtml = '';
        for(let i=0; i<6; i++) {
            skeletonHtml += `
                <div class="col-md-6 col-xl-4">
                    <div class="card mentor-card h-100 border-0 shadow-sm">
                        <div class="mentor-card-header skeleton" style="height: 100px;"></div>
                        <div class="mentor-card-body p-4">
                            <div class="skeleton w-75 mb-2" style="height: 20px;"></div>
                            <div class="skeleton w-50 mb-3" style="height: 15px;"></div>
                            <div class="skeleton w-100 mb-4" style="height: 60px;"></div>
                            <div class="skeleton w-100" style="height: 40px; border-radius: 20px;"></div>
                        </div>
                    </div>
                </div>`;
        }
        mentorsList.html(skeletonHtml);

        ApiService.get(url)
            .done(function(response) {
                // FIX: Se questa richiesta è vecchia (ne è partita un'altra dopo), ignorala
                if (requestId !== lastSearchRequestId) return;

                const mentors = response.data;
                mentorsList.empty(); // Svuota il messaggio di caricamento

                if (mentors.length === 0) {
                    mentorsList.html(`
                        <div class="col-12 text-center py-5">
                            <i class="fas fa-search fa-3x text-muted mb-3 opacity-50"></i>
                            <h5 class="text-muted">Nessun mentor trovato</h5>
                            <p class="text-muted small">Prova a modificare i filtri di ricerca.</p>
                        </div>
                    `);
                    renderPagination(null); // Nasconde la paginazione
                    return;
                }

                mentors.forEach(mentor => {
                    // Prepariamo i testi, con un messaggio di fallback se non sono stati inseriti
                    const avatarUrl = window.getAvatarUrl(mentor.avatar_url);
                    const headline = mentor.sector || 'Nessuna specializzazione indicata';
                    const bioSnippet = mentor.bio ? mentor.bio.substring(0, 100) + '...' : 'Nessuna biografia disponibile.';

                    const isFavorite = favoriteMentorIds.includes(mentor.id);
                    const heartClass = isFavorite ? 'fas favorited' : 'far'; // 'fas' per pieno, 'far' per vuoto
                    const heartIcon = token ? `<i class="${heartClass} fa-heart favorite-btn" data-mentor-id="${mentor.id}"></i>` : '';
                    
                    // Badge prezzo
                    const priceBadge = mentor.hourly_rate 
                        ? `<div class="mentor-price-badge">${parseFloat(mentor.hourly_rate).toFixed(0)}€/h</div>` 
                        : `<div class="mentor-price-badge">Gratis</div>`;

                    // Rating
                    const ratingHtml = mentor.rating_avg 
                        ? `<span class="text-warning fw-bold"><i class="fas fa-star"></i> ${mentor.rating_avg}</span> <small class="text-muted">(${mentor.rating_count || 0})</small>`
                        : `<span class="text-muted small">Nuovo</span>`;

                    const mentorCard = `
                        <div class="col-md-6 col-xl-4 stagger-item">
                            <div class="card mentor-card h-100">
                                <div class="mentor-card-header">
                                    ${priceBadge}
                                    <div class="mentor-avatar-container">
                                        <img src="${avatarUrl}" alt="${mentor.name}">
                                    </div>
                                </div>
                                <div class="mentor-card-body">
                                    <div class="d-flex justify-content-between align-items-start mb-2">
                                        <h5 class="fw-bold mb-0">${mentor.name} ${mentor.surname}</h5>
                                        <div class="fs-5 text-danger" style="cursor:pointer;">${heartIcon}</div>
                                    </div>
                                    <p class="text-primary small mb-2 fw-bold text-uppercase">${headline}</p>
                                    <div class="mb-3">${ratingHtml}</div>
                                    <p class="card-text text-muted small mb-4" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${bioSnippet}</p>
                                    <a href="/mentor-detail.html?id=${mentor.id}" class="btn btn-outline-primary w-100 rounded-pill">Vedi Profilo</a>
                                </div>
                            </div>
                        </div>
                    `;
                    mentorsList.append(mentorCard);
                });

                renderPagination(response.pagination);
            })
            .fail(function(xhr) {
                // FIX: Ignora errori di richieste vecchie
                if (requestId !== lastSearchRequestId) return;

                $('#mentors-list').html('<div class="col"><p class="alert alert-danger">Impossibile caricare la lista dei mentor.</p></div>');
                console.error('Errore nel caricamento dei mentor:', xhr.responseJSON);
            });
    }

    function renderPagination(pagination) {
        const paginationControls = $('#pagination-controls');
        paginationControls.empty();

        if (!pagination || pagination.totalPages <= 1) {
            return; // Non mostrare la paginazione se c'è solo una pagina o nessuna
        }

        const { currentPage, totalPages } = pagination;

        // Pulsante "Precedente"
        let prevClass = currentPage === 1 ? 'disabled' : '';
        paginationControls.append(`<li class="page-item ${prevClass}"><a class="page-link" href="#" data-page="${currentPage - 1}">Precedente</a></li>`);

        // Link delle pagine
        for (let i = 1; i <= totalPages; i++) {
            let activeClass = i === currentPage ? 'active' : '';
            paginationControls.append(`<li class="page-item ${activeClass}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`);
        }

        // Pulsante "Successivo"
        let nextClass = currentPage === totalPages ? 'disabled' : '';
        paginationControls.append(`<li class="page-item ${nextClass}"><a class="page-link" href="#" data-page="${currentPage + 1}">Successivo</a></li>`);
    }

    // Funzione per caricare i settori nel dropdown
    function loadSectors() {
        ApiService.get('/mentors/sectors').done(function(sectors) {
                const sectorFilter = $('#sector-filter');
                sectors.forEach(sector => {
                    sectorFilter.append(`<option value="${sector}">${sector}</option>`);
                });
        });
    }

    // Funzione per caricare le lingue nel dropdown
    function loadLanguages() {
        ApiService.get('/mentors/languages').done(function(languages) {
                const languageFilter = $('#language-filter');
                languages.forEach(lang => {
                    if (lang) languageFilter.append(`<option value="${lang}">${lang}</option>`);
                });
        });
    }

    // Funzione per triggerare la ricerca
    function triggerSearch() {
        const searchTerm = $('#search-input').val();
        const sector = $('#sector-filter').val();
        const language = $('#language-filter').val();
        const rating = $('#rating-filter').val();
        const minPrice = $('#min-price').val();
        const maxPrice = $('#max-price').val();
        loadMentors(searchTerm, sector, language, rating, minPrice, maxPrice, 1); // Torna alla prima pagina
    }

    // Gestione del form di ricerca (sia per submit che per cambio filtri)
    $('#filter-form').on('submit', function(event) {
        event.preventDefault();
        triggerSearch();
    });

    // Ricarica i risultati quando si cambia il settore o si scrive nella barra di ricerca
    $('#sector-filter, #language-filter, #rating-filter, #min-price, #max-price').on('change', triggerSearch);
    
    // BUG FIX: Aggiunto Debounce per evitare troppe chiamate API mentre si scrive
    let searchTimeout;
    $('#search-input').on('keyup', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(triggerSearch, 500); // Aspetta 500ms dopo l'ultima digitazione
    });

    // Gestione dei click sulla paginazione
    $('#pagination-controls').on('click', '.page-link', function(event) {
        event.preventDefault();
        const page = $(this).data('page');
        if (page) {
            loadMentors(currentSearchTerm, currentSector, currentLanguage, currentRating, currentMinPrice, currentMaxPrice, page);
        }
    });

    // Gestione del click sul pulsante "preferito"
    $(document).on('click', '.favorite-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const mentorId = $(this).data('mentor-id');
        const isFavorited = $(this).hasClass('favorited');
        const url = `/favorites/${mentorId}`;
        const request = isFavorited ? ApiService.delete(url) : ApiService.post(url);

        request
            .done(() => {
                $(this).toggleClass('fas far favorited'); // Alterna le classi per forma e colore
                
                // --- Heart Pop Animation ---
                $(this).addClass('heart-pop');
                setTimeout(() => $(this).removeClass('heart-pop'), 300); // Rimuovi classe dopo animazione

                // Aggiorna l'array locale
                if (isFavorited) {
                    favoriteMentorIds = favoriteMentorIds.filter(id => id !== mentorId);
                } else {
                    favoriteMentorIds.push(mentorId);
                }
            });
    });

    // Carica prima i preferiti, poi i settori e infine i mentor
    loadFavoriteIds().always(() => {
        loadLanguages();
        loadSectors();
        loadMentors();
    });
});