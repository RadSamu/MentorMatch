$(document).ready(function() {
    const BASE_URL = ApiService.BASE_URL;
    const token = localStorage.getItem('token');

    let currentPage = 1;
    let currentSearchTerm = '';
    let currentSector = '';
    let currentLanguage = '';
    let currentRating = '';
    let favoriteMentorIds = [];

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
    function loadMentors(searchTerm = '', sector = '', language = '', rating = '', page = 1) {
        currentSearchTerm = searchTerm;
        currentSector = sector;
        currentLanguage = language;
        currentRating = rating;
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

        ApiService.get(url)
            .done(function(response) {
                const mentors = response.data;
                const mentorsList = $('#mentors-list');
                mentorsList.empty(); // Svuota il messaggio di caricamento

                if (mentors.length === 0) {
                    mentorsList.html('<div class="col"><p class="alert alert-info">Nessun mentor trovato con i criteri di ricerca specificati.</p></div>');
                    renderPagination(null); // Nasconde la paginazione
                    return;
                }

                mentors.forEach(mentor => {
                    // Prepariamo i testi, con un messaggio di fallback se non sono stati inseriti
                    const avatarUrl = mentor.avatar_url ? `${BASE_URL}${mentor.avatar_url}` : 'https://via.placeholder.com/150';
                    const headline = mentor.sector || 'Nessuna specializzazione indicata';
                    const bioSnippet = mentor.bio ? mentor.bio.substring(0, 100) + '...' : 'Nessuna biografia disponibile.';

                    const isFavorite = favoriteMentorIds.includes(mentor.id);
                    const heartClass = isFavorite ? 'fas favorited' : 'far'; // 'fas' per pieno, 'far' per vuoto
                    const heartIcon = token ? `<i class="${heartClass} fa-heart favorite-btn" data-mentor-id="${mentor.id}"></i>` : '';

                    const mentorCard = `
                        <div class="col-md-4 mb-4">
                            <div class="card h-100 position-relative">
                                <img src="${avatarUrl}" class="card-img-top" alt="Avatar di ${mentor.name}">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <h5 class="card-title">${mentor.name} ${mentor.surname}</h5>
                                        ${heartIcon}
                                    </div>
                                    <h6 class="card-subtitle mb-2 text-muted">${headline}</h6>
                                    <p class="card-text">${bioSnippet}</p>
                                    <a href="/mentor-detail.html?id=${mentor.id}" class="btn btn-primary">Vedi Profilo Completo</a>
                                </div>
                            </div>
                        </div>
                    `;
                    mentorsList.append(mentorCard);
                });

                renderPagination(response.pagination);
            })
            .fail(function(xhr) {
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
        loadMentors(searchTerm, sector, language, rating, 1); // Torna alla prima pagina quando si applica un filtro
    }

    // Gestione del form di ricerca (sia per submit che per cambio filtri)
    $('#filter-form').on('submit', function(event) {
        event.preventDefault();
        triggerSearch();
    });

    // Ricarica i risultati quando si cambia il settore o si scrive nella barra di ricerca
    $('#sector-filter, #language-filter, #rating-filter').on('change', triggerSearch);
    $('#search-input').on('keyup', triggerSearch);

    // Gestione dei click sulla paginazione
    $('#pagination-controls').on('click', '.page-link', function(event) {
        event.preventDefault();
        const page = $(this).data('page');
        if (page) {
            loadMentors(currentSearchTerm, currentSector, currentLanguage, currentRating, page);
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