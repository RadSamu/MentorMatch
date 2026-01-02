$(document).ready(function() {
    const BASE_URL = ApiService.BASE_URL;
    const token = localStorage.getItem('token');

    // --- 1. Protezione della Pagina (Route Guard) ---
    if (!token) {
        // Se non c'è un token, l'utente non è loggato.
        // Reindirizzalo alla pagina di login.
        window.location.href = '/login.html';
        return; // Interrompi l'esecuzione dello script
    }

    // --- 2. Caricamento dei Dati dell'Utente ---
    // Se il token esiste, facciamo una richiesta autenticata al backend
    // per ottenere i dati dell'utente.
    ApiService.get('/auth/me')
        .done(function(user) {
            // Se la richiesta ha successo, mostriamo un messaggio di benvenuto
            let greeting = 'Benvenuto';
            if (user.gender === 'female') {
                greeting = 'Benvenuta';
            } else if (user.gender === 'other') {
                greeting = 'Benvenuto/a';
            }
            
            $('#welcome-message').text(`${greeting}, ${user.name}!`);

            // Mostra il pannello corretto in base al ruolo dell'utente
            if (user.role === 'mentor') {
                loadMentorStats();
                populateMentorActions();
                $('#mentor-dashboard').show();
            } else if (user.role === 'mentee') {
                loadMenteeStats();
                populateMenteeActions();
                loadFavoriteMentors();
                $('#mentee-dashboard').show();
            }
        })
        .fail(function(xhr) {
            // Se c'è un errore (es. token scaduto), gestiscilo
            console.error('Errore nel caricare i dati utente:', xhr.responseJSON);
            // Per sicurezza, potremmo fare il logout e reindirizzare
            localStorage.removeItem('token');
            window.location.href = '/login.html';
        });

    // Funzione per creare una card della dashboard
    function createDashboardCard(href, iconClass, title, text) {
        return `
            <div class="col-lg-4 col-md-6 mb-4">
                <a href="${href}" class="text-decoration-none">
                    <div class="card dashboard-card h-100">
                        <div class="card-body text-center">
                            <div class="dashboard-card-icon mb-3">
                                <i class="fas ${iconClass} fa-2x text-primary"></i>
                            </div>
                            <h5 class="card-title">${title}</h5>
                            <p class="card-text text-muted">${text}</p>
                        </div>
                    </div>
                </a>
            </div>
        `;
    }

    // Funzione per popolare le azioni del MENTOR
    function populateMentorActions() {
        const mentorActions = $('#mentor-actions-row');
        mentorActions.empty();
        mentorActions.append(createDashboardCard('/profile.html', 'fa-user-edit', 'Modifica Profilo', 'Aggiorna la tua foto, biografia e competenze.'));
        mentorActions.append(createDashboardCard('/availability.html', 'fa-calendar-alt', 'Gestisci Disponibilità', 'Aggiungi o rimuovi gli slot di tempo.'));
        mentorActions.append(createDashboardCard('/my-bookings.html', 'fa-book-reader', 'Le mie Prenotazioni', 'Visualizza le sessioni prenotate dai tuoi mentee.'));
        mentorActions.append(createDashboardCard('/messages.html', 'fa-comments', 'Messaggi', 'Comunica con i tuoi mentee.'));
    }

    // Funzione per popolare le azioni del MENTEE
    function populateMenteeActions() {
        const menteeActions = $('#mentee-actions-row');
        menteeActions.empty();
        menteeActions.append(createDashboardCard('/mentors.html', 'fa-search', 'Trova un Mentor', 'Cerca il professionista perfetto per te.'));
        menteeActions.append(createDashboardCard('/my-bookings.html', 'fa-book-reader', 'Le mie Prenotazioni', 'Visualizza e gestisci le tue sessioni.'));
        menteeActions.append(createDashboardCard('/messages.html', 'fa-comments', 'Messaggi', 'Comunica con i tuoi mentor.'));
    }

    // Funzione per caricare e mostrare le statistiche del MENTOR
    function loadMentorStats() {
        ApiService.get('/dashboard/stats')
            .done(function(stats) {
                const statsRow = $('#mentor-stats-row');
                statsRow.empty();

                // Card 1: Prossime Sessioni
                statsRow.append(`
                    <div class="col-md-4 mb-4">
                        <div class="card text-center h-100">
                            <div class="card-body">
                                <h5 class="card-title">Prossime Sessioni</h5>
                                <p class="display-4 fw-bold">${stats.upcomingBookings}</p>
                            </div>
                        </div>
                    </div>
                `);

                // Card 2: Valutazione Media
                statsRow.append(`
                    <div class="col-md-4 mb-4">
                        <div class="card text-center h-100">
                            <div class="card-body">
                                <h5 class="card-title">Valutazione Media</h5>
                                <p class="display-4 fw-bold">⭐ ${stats.averageRating}</p>
                                <p class="card-text text-muted">basata su ${stats.ratingCount} recensioni</p>
                            </div>
                        </div>
                    </div>
                `);

                // Card 3: Ultime Recensioni
                let reviewsHtml = `
                    <div class="text-center py-3">
                        <i class="fas fa-comment-slash fa-2x text-muted mb-2"></i>
                        <p class="text-muted small mb-0">Nessuna recensione recente.</p>
                    </div>`;
                if (stats.recentReviews.length > 0) {
                    reviewsHtml = stats.recentReviews.map(r => 
                        `<div class="mb-2"><strong>${r.mentee_name}:</strong> "${r.comment || 'Nessun commento'}" (${'⭐'.repeat(r.rating)})</div>`
                    ).join('');
                }
                statsRow.append(`
                    <div class="col-md-4 mb-4">
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title">Ultime Recensioni</h5>
                                ${reviewsHtml}
                            </div>
                        </div>
                    </div>
                `);
            });
    }

    // Funzione per caricare e mostrare le statistiche del MENTEE
    function loadMenteeStats() {
        ApiService.get('/dashboard/stats')
            .done(function(stats) {
                const statsRow = $('#mentee-stats-row');
                statsRow.empty();

                if (stats.nextBooking) {
                    const bookingDate = new Date(stats.nextBooking.start_ts).toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' });
                    const avatarUrl = stats.nextBooking.mentor_avatar ? `${BASE_URL}${stats.nextBooking.mentor_avatar}` : 'https://via.placeholder.com/80';
                    statsRow.html(`
                        <div class="col-12">
                            <div class="card bg-primary text-white">
                                <div class="card-body d-flex align-items-center">
                                    <img src="${avatarUrl}" alt="Avatar" class="rounded-circle me-3" width="60" height="60">
                                    <div>
                                        <h5 class="card-title">La tua Prossima Sessione</h5>
                                        <p class="card-text mb-0">Con <strong>${stats.nextBooking.mentor_name}</strong> il ${bookingDate}.</p>
                                    </div>
                                    ${
                                        (stats.nextBooking.status === 'pending' && stats.nextBooking.price > 0)
                                        ? `<button class="btn btn-warning ms-auto pay-now-btn" 
                                                    data-bs-toggle="modal" 
                                                    data-bs-target="#paymentModal"
                                                    data-booking-id="${stats.nextBooking.id}"
                                                    data-price="${stats.nextBooking.price}">
                                                    Paga Ora (${stats.nextBooking.price}€)
                                           </button>`
                                        : `<a href="/my-bookings.html" class="btn btn-light ms-auto">Vedi Dettagli</a>`
                                    }
                                </div>
                            </div>
                        </div>
                    `);
                } else {
                    statsRow.html(`
                        <div class="col-12">
                            <div class="card border-0 bg-light">
                                <div class="card-body text-center py-4">
                                    <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                                    <h5 class="text-muted">Nessuna sessione in programma</h5>
                                    <p class="text-muted mb-3">Non hai ancora prenotato nessuna sessione. Inizia ora!</p>
                                    <a href="/mentors.html" class="btn btn-primary">Trova un Mentor</a>
                                </div>
                            </div>
                        </div>
                    `);
                }
            });
    }

    // Funzione per caricare e mostrare i mentor preferiti
    function loadFavoriteMentors() {
        ApiService.get('/favorites')
            .done(function(mentors) {
                const list = $('#favorite-mentors-list');
                const section = $('#favorite-mentors-section');
                list.empty();

                if (mentors.length > 0) {
                    section.show();
                    mentors.forEach(mentor => {
                        const avatarUrl = mentor.avatar_url ? `${BASE_URL}${mentor.avatar_url}` : 'https://via.placeholder.com/80';
                        const cardHtml = `
                            <div class="col-md-4 col-lg-3 mb-4">
                                <a href="/mentor-detail.html?id=${mentor.id}" class="text-decoration-none text-dark">
                                    <div class="card text-center h-100">
                                        <div class="card-body">
                                            <img src="${avatarUrl}" alt="Avatar di ${mentor.name}" class="rounded-circle mb-2" width="80" height="80" style="object-fit: cover;">
                                            <h6 class="card-title mb-1">${mentor.name} ${mentor.surname}</h6>
                                            <p class="card-text text-muted small">${mentor.sector || ''}</p>
                                        </div>
                                    </div>
                                </a>
                            </div>
                        `;
                        list.append(cardHtml);
                    });
                } else {
                    section.hide();
                }
            });
    }

    // --- Logica per il Pagamento Mock ---

    // 1. Quando il modale viene aperto, popola i dati
    $(document).on('click', '.pay-now-btn', function() {
        const bookingId = $(this).data('booking-id');
        const price = parseFloat($(this).data('price')).toFixed(2);

        $('#payment-booking-id').val(bookingId);
        $('#payment-amount').text(`${price}€`);
    });

    // 2. Quando l'utente clicca "Paga Ora" nel modale
    $('#confirm-payment-btn').on('click', function() {
        const bookingId = $('#payment-booking-id').val();
        const payButton = $(this);

        // Feedback visivo
        payButton.prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Pagamento...');

        ApiService.post('/payments/mock-pay', { bookingId: parseInt(bookingId) })
            .done(function(response) {
                showToast('Pagamento completato! La sessione è confermata.', 'success');
                $('#paymentModal').modal('hide'); // Chiudi il modale
                loadMenteeStats(); // Ricarica le statistiche per aggiornare la UI
            })
            .fail(function(xhr) {
                showToast(`Errore pagamento: ${xhr.responseJSON?.msg || 'Riprova più tardi.'}`, 'danger');
            })
            .always(function() {
                payButton.prop('disabled', false).html('Paga Ora'); // Riabilita il pulsante
            });
    });

    // Funzione helper per mostrare i Toast
    function showToast(message, type = 'success') {
        const toastEl = document.getElementById('liveToast');
        const toastBody = toastEl.querySelector('.toast-body');
        
        // Imposta il colore (verde per successo, rosso per errore)
        toastEl.className = `toast align-items-center border-0 text-bg-${type}`;
        toastBody.textContent = message;

        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }
});