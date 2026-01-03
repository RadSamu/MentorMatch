$(document).ready(function() {
    const BASE_URL = ApiService.BASE_URL;
    const token = localStorage.getItem('token');
    const heroContent = $('#hero-profile-content');
    const bioContent = $('#mentor-bio-content');
    const skillsContent = $('#mentor-skills-content');
    const priceDisplay = $('#mentor-price-display');
    const slotsContainer = $('#availability-slots');
    let currentUserId;

    // 1. Leggi l'ID del mentor dalla URL (es. ...?id=123)
    const urlParams = new URLSearchParams(window.location.search);
    const mentorId = urlParams.get('id');

    if (!mentorId) {
        $('.container').html('<p class="alert alert-danger">ID del mentor non specificato.</p>');
        return;
    }

    // Funzione per controllare se il mentor è tra i preferiti
    function checkFavoriteStatus() {
        if (!token) return;
        ApiService.get('/favorites/ids').done(function(ids) {
                if (ids.includes(parseInt(mentorId, 10))) {
                    $('.favorite-btn').removeClass('far').addClass('fas favorited');
                }
        });
    }


    // 2. Chiama l'API per ottenere i dati del mentor specifico
    ApiService.get(`/mentors/${mentorId}`)
        .done(function(mentor) {
            // 3. Popola la pagina con i dati ricevuti
            const headline = mentor.sector || 'Nessuna specializzazione indicata';
            const bio = mentor.bio || 'Nessuna biografia disponibile.';
            const rating = parseFloat(mentor.rating_avg).toFixed(1);
            const ratingCount = mentor.rating_count;
            const avatarUrl = mentor.avatar_url ? `${BASE_URL}${mentor.avatar_url}` : 'https://via.placeholder.com/150';
            const price = mentor.hourly_rate ? parseFloat(mentor.hourly_rate).toFixed(0) : '0';

            // L'icona parte sempre come cuore vuoto ('far'), poi viene aggiornata se è un preferito
            const heartIcon = token ? `<i class="far fa-heart favorite-btn fs-3 ms-3 text-white" data-mentor-id="${mentor.id}" style="cursor: pointer;"></i>` : '';

            // 1. Popola Hero Section
            const heroHtml = `
                <div class="profile-hero-avatar-container">
                    <img src="${avatarUrl}" alt="Avatar di ${mentor.name}">
                </div>
                <h1 class="fw-bold mb-1 d-flex justify-content-center align-items-center">
                    ${mentor.name} ${mentor.surname} ${heartIcon}
                </h1>
                <p class="lead opacity-75 mb-2">${headline}</p>
                <div class="d-flex justify-content-center gap-3">
                    <span class="badge bg-white text-primary rounded-pill px-3 py-2"><i class="fas fa-star text-warning me-1"></i> ${rating} (${ratingCount} recensioni)</span>
                    <span class="badge bg-white text-dark rounded-pill px-3 py-2"><i class="fas fa-map-marker-alt text-danger me-1"></i> Online</span>
                </div>
            `;
            heroContent.html(heroHtml);

            // 2. Popola Bio
            bioContent.text(bio); // Usa .text() per sicurezza XSS, poi CSS gestisce i newlines

            // 3. Popola Skills e Lingue
            let skillsHtml = `<div class="mb-3"><span class="badge bg-light text-dark border me-2 p-2">${headline}</span></div>`;
            if (mentor.languages && mentor.languages.length > 0) {
                skillsHtml += `<div><strong class="text-muted small text-uppercase me-2">Lingue:</strong>`;
                mentor.languages.forEach(lang => {
                    skillsHtml += `<span class="badge bg-secondary bg-opacity-10 text-dark me-1">${lang}</span>`;
                });
                skillsHtml += `</div>`;
            }
            skillsContent.html(skillsHtml);

            // 4. Popola Prezzo Sticky
            priceDisplay.text(`${price}€`);

            // Dopo aver renderizzato il profilo, carichiamo le disponibilità
            loadMentorAvailabilities(mentorId);
            // E carichiamo anche le recensioni
            loadMentorReviews(mentorId, 1);
            // Controlla lo stato del preferito
            checkFavoriteStatus();
        })
        .fail(function(xhr) {
            const errorMsg = xhr.status === 404 
                ? 'Mentor non trovato.' 
                : 'Impossibile caricare il profilo del mentor.';
            $('.container').html(`<p class="alert alert-danger">${errorMsg}</p>`);
        });

    // Ottieni l'ID dell'utente corrente e, se presente, mostra il pulsante per inviare messaggi
    if (token) {
        ApiService.get('/auth/me')
            .done(function(user) {
                currentUserId = user.id;
                // Mostra il pulsante "Invia Messaggio" solo se l'utente loggato non è il mentor stesso
                if (currentUserId !== parseInt(mentorId, 10)) {
                    $('#send-message-btn')
                        .attr('href', `/messages.html?with=${mentorId}`)
                        .show();
                }
            });
    }

    // Funzione per caricare e mostrare le disponibilità del mentor
    function loadMentorAvailabilities(mentorId) {
        ApiService.get(`/availability/mentor/${mentorId}`)
            .done(function(slots) {
                slotsContainer.empty();
                if (slots.length === 0) {
                    slotsContainer.html('<p class="text-muted small text-center col-12">Nessuna disponibilità al momento.</p>');
                    return;
                }

                const slotsHtml = slots.map(slot => {
                    const dateObj = new Date(slot.start_ts);
                    const day = dateObj.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                    const time = dateObj.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                    return `<a href="#" class="slot-btn book-slot-btn" data-slot-id="${slot.id}" title="${day} alle ${time}">
                                <div class="fw-bold">${day}</div>
                                <div>${time}</div>
                            </a>`;
                }).join('');

                slotsContainer.html(slotsHtml);
            })
            .fail(function() {
                slotsContainer.html('<p class="text-danger small text-center col-12">Errore caricamento.</p>');
            });
    }

    // Funzione per caricare e mostrare le recensioni
    function loadMentorReviews(mentorId, page = 1) {
        const reviewsSection = $('#reviews-section');
        const reviewsList = $('#reviews-list');

        ApiService.get(`/reviews/mentor/${mentorId}?page=${page}&limit=5`)
            .done(function(response) {
                const reviews = response.data;
                reviewsList.empty();

                if (reviews.length === 0) {
                    reviewsList.html('<p>Questo mentor non ha ancora ricevuto recensioni.</p>');
                    renderReviewsPagination(null); // Nasconde la paginazione
                } else {
                    reviews.forEach(review => {
                        const reviewDate = new Date(review.created_at).toLocaleDateString('it-IT');
                        const reviewCard = `
                            <div class="card mb-3 border-0 border-bottom rounded-0 stagger-item">
                                <div class="card-body px-0">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <h6 class="fw-bold mb-0">${review.mentee_name}</h6>
                                        <small class="text-muted">${reviewDate}</small>
                                    </div>
                                    <div class="text-warning mb-2 small">${'⭐'.repeat(review.rating)}</div>
                                    <p class="card-text text-muted">"${review.comment || 'Nessun commento.'}"</p>
                                </div>
                            </div>
                        `;
                        reviewsList.append(reviewCard);
                    });
                    renderReviewsPagination(response.pagination);
                }
                reviewsSection.show();
            });
    }

    // Funzione per renderizzare i controlli di paginazione delle recensioni
    function renderReviewsPagination(pagination) {
        const paginationControls = $('#reviews-pagination-controls');
        paginationControls.empty();

        if (!pagination || pagination.totalPages <= 1) {
            return; // Non mostrare la paginazione se c'è solo una pagina o nessuna
        }

        const { currentPage, totalPages } = pagination;

        // Pulsante "Precedente"
        let prevClass = currentPage === 1 ? 'disabled' : '';
        paginationControls.append(`<li class="page-item ${prevClass}"><a class="page-link review-page-link" href="#" data-page="${currentPage - 1}">Precedente</a></li>`);

        // Link delle pagine
        for (let i = 1; i <= totalPages; i++) {
            let activeClass = i === currentPage ? 'active' : '';
            paginationControls.append(`<li class="page-item ${activeClass}"><a class="page-link review-page-link" href="#" data-page="${i}">${i}</a></li>`);
        }

        // Pulsante "Successivo"
        let nextClass = currentPage === totalPages ? 'disabled' : '';
        paginationControls.append(`<li class="page-item ${nextClass}"><a class="page-link review-page-link" href="#" data-page="${currentPage + 1}">Successivo</a></li>`);
    }

    // Gestione dei click sulla paginazione delle recensioni (con event delegation)
    $(document).on('click', '.review-page-link', function(e) {
        e.preventDefault();
        const page = $(this).data('page');
        if (page) {
            loadMentorReviews(mentorId, page);
        }
    });

    // Gestione del click sul pulsante "preferito" nella pagina di dettaglio
    $(document).on('click', '.favorite-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!token) return;

        const mentorId = $(this).data('mentor-id');
        const isFavorited = $(this).hasClass('favorited');
        const url = `/favorites/${mentorId}`;
        const request = isFavorited ? ApiService.delete(url) : ApiService.post(url);

        request.done(() => {
                $(this).toggleClass('fas far favorited'); // Alterna le classi per forma e colore
            }).fail(function() {
                showAlert('Errore nell\'aggiornare i preferiti.', 'danger');
            });
    });

    // Gestione del click sul pulsante di prenotazione (con event delegation)
    $(document).on('click', '.book-slot-btn', function(event) {
        event.preventDefault();

        const token = localStorage.getItem('token');
        if (!token) {
            showAlert('Devi effettuare il login come mentee per poter prenotare.', 'warning');
            // Opzionale: reindirizzare al login dopo un breve ritardo
            setTimeout(() => { window.location.href = '/login.html'; }, 2000);
            return;
        }

        const slotId = $(this).data('slot-id');
        const slotText = $(this).text();

        if (confirm(`Sei sicuro di voler prenotare la sessione di ${slotText}?`)) {
            ApiService.post('/bookings', { availability_id: slotId })
                .done(function(booking) {
                    showAlert('Prenotazione effettuata con successo!', 'success');
                    // Ricarica le disponibilità per aggiornare la lista
                    loadMentorAvailabilities(mentorId);
                })
                .fail(function(xhr) {
                    const errorMsg = xhr.responseJSON ? xhr.responseJSON.msg : 'Errore durante la prenotazione.';
                    showAlert(errorMsg, 'danger');
                });
        }
    });

    // Funzione helper per mostrare alert
    function showAlert(message, type) {
        const alertPlaceholder = $('#alert-placeholder');
        // Svuota eventuali alert precedenti
        alertPlaceholder.empty();
        const wrapper = $(`<div class="alert alert-${type} alert-dismissible fade show" role="alert">
                            ${message}
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                          </div>`);
        alertPlaceholder.html(wrapper);
    }
});