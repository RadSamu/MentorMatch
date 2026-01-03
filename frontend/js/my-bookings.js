$(document).ready(function() {
    const BASE_URL = ApiService.BASE_URL;
    const token = localStorage.getItem('token');
    const upcomingList = $('#pills-upcoming');
    const completedList = $('#pills-completed');
    const canceledList = $('#pills-canceled');
    let currentUser; // Per memorizzare i dati dell'utente loggato

    // Protezione della pagina
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    
    // 1. Ottieni i dati dell'utente per conoscere il ruolo
    ApiService.get('/auth/me')
        .done(function(user) {
            currentUser = user;
            loadBookings(); // 2. Carica le prenotazioni
        })
        .fail(function() {
            showToast('Impossibile caricare i dati utente.', 'danger');
        });

    function loadBookings() {
        ApiService.get('/bookings/me')
            .done(function(bookings) {
                renderBookings(bookings);
            })
            .fail(function() {
                showToast('Impossibile caricare le prenotazioni.', 'danger');
            });
    }

    function renderBookings(bookings) {
        upcomingList.empty();
        completedList.empty();
        canceledList.empty();

        const now = new Date();
        
        // Filtra le prenotazioni
        const upcoming = bookings.filter(b => new Date(b.start_ts) > now && b.status !== 'canceled');
        const completed = bookings.filter(b => new Date(b.start_ts) <= now && b.status !== 'canceled');
        const canceled = bookings.filter(b => b.status === 'canceled');

        // Renderizza In Arrivo
        if (upcoming.length === 0) {
            if (currentUser.role === 'mentor') {
                upcomingList.html(`
                    <div class="text-center py-5">
                        <i class="fas fa-calendar-alt fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">Nessuna prenotazione in arrivo</h5>
                        <p class="text-muted">Non hai ancora ricevuto prenotazioni. Assicurati di aver inserito le tue disponibilità.</p>
                        <a href="/availability.html" class="btn btn-primary rounded-pill px-4 mt-2">Gestisci Disponibilità</a>
                    </div>
                `);
            } else {
                upcomingList.html(`
                    <div class="text-center py-5">
                        <i class="fas fa-calendar-plus fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">Nessuna prenotazione futura</h5>
                        <p class="text-muted">Prenota la tua prossima sessione per iniziare.</p>
                        <a href="/mentors.html" class="btn btn-primary rounded-pill px-4 mt-2">Cerca Mentor</a>
                    </div>
                `);
            }
        } else {
            upcoming.forEach(b => upcomingList.append(createBookingCard(b)));
        }

        // Renderizza Completate
        if (completed.length === 0) {
            completedList.html(`
                <div class="text-center py-5">
                    <i class="fas fa-history fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">Nessuna prenotazione passata</h5>
                    <p class="text-muted">Qui troverai lo storico delle tue sessioni completate.</p>
                </div>
            `);
        } else {
            completed.forEach(b => completedList.append(createBookingCard(b)));
        }

        // Renderizza Cancellate
        if (canceled.length === 0) {
            canceledList.html(`
                <div class="text-center py-5">
                    <i class="fas fa-ban fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">Nessuna prenotazione cancellata</h5>
                </div>
            `);
        } else {
            canceled.forEach(b => canceledList.append(createBookingCard(b)));
        }
    }

    function createBookingCard(booking) {
        const dateObj = new Date(booking.start_ts);
        const day = dateObj.getDate();
        const month = dateObj.toLocaleString('it-IT', { month: 'short' }).toUpperCase();
        const time = dateObj.toLocaleString('it-IT', { hour: '2-digit', minute: '2-digit' });
        
        const isPast = new Date(booking.start_ts) <= new Date();
        const isCanceled = booking.status === 'canceled';

        let otherUserName, otherUserAvatar;

        if (currentUser.role === 'mentor') {
            otherUserName = `${window.escapeHtml(booking.mentee_name)} ${window.escapeHtml(booking.mentee_surname)}`;
            otherUserAvatar = window.getAvatarUrl(booking.mentee_avatar);
        } else {
            otherUserName = `${window.escapeHtml(booking.mentor_name)} ${window.escapeHtml(booking.mentor_surname)}`;
            otherUserAvatar = window.getAvatarUrl(booking.mentor_avatar);
        }

        let statusBadge, actionButton;
        if (isCanceled) {
            statusBadge = '<span class="badge bg-danger rounded-pill">Cancellata</span>';
            actionButton = '';
        } else if (isPast) {
            statusBadge = '<span class="badge bg-secondary rounded-pill">Completata</span>';
            if (currentUser.role === 'mentee' && !booking.has_review) {
                actionButton = `<button class="btn btn-sm btn-outline-warning rounded-pill open-review-modal-btn" data-booking-id="${booking.id}"><i class="fas fa-star me-1"></i> Recensisci</button>`;
            } else {
                actionButton = '';
            }
        } else if (booking.status === 'pending') {
            statusBadge = `<span class="badge bg-warning text-dark rounded-pill">In Attesa di Pagamento</span>`;
            if (currentUser.role === 'mentee') {
                actionButton = `<button class="btn btn-sm btn-warning rounded-pill pay-now-btn me-2" 
                                    data-bs-toggle="modal" 
                                    data-bs-target="#paymentModal"
                                    data-booking-id="${booking.id}"
                                    data-price="${booking.price}">
                                    Paga Ora (${booking.price}€)
                                 </button>`;
            } else {
                actionButton = '';
            }
            const cancelButton = `<button class="btn btn-sm btn-outline-danger rounded-pill cancel-booking-btn" data-booking-id="${booking.id}">Annulla</button>`;
            actionButton += cancelButton;
        } else {
            statusBadge = `<span class="badge bg-primary rounded-pill">Confermata</span>`;
            let meetingButton = '';
            // Controllo di sicurezza: il link deve iniziare con http o https
            if (booking.meeting_link && (booking.meeting_link.startsWith('http://') || booking.meeting_link.startsWith('https://'))) {
                meetingButton = `<a href="${window.escapeHtml(booking.meeting_link)}" target="_blank" class="btn btn-sm btn-success rounded-pill me-2"><i class="fas fa-video me-1"></i> Partecipa</a>`;
            }
            const cancelButton = `<button class="btn btn-sm btn-outline-danger rounded-pill cancel-booking-btn" data-booking-id="${booking.id}">Annulla</button>`;
            actionButton = meetingButton + cancelButton;
        }

        return `
            <div class="card border-0 shadow-sm mb-3 rounded-4 overflow-hidden">
                <div class="card-body p-4 d-flex align-items-center flex-wrap gap-3">
                    <!-- Data Box -->
                    <div class="booking-date-box rounded-3 p-2 text-center text-primary">
                        <h3 class="fw-bold mb-0">${day}</h3>
                        <small class="fw-bold text-uppercase">${month}</small>
                        <div class="small text-muted mt-1 border-top pt-1">${time}</div>
                    </div>

                    <!-- Avatar & Info -->
                    <img src="${otherUserAvatar}" alt="Avatar" class="rounded-circle border" width="60" height="60" style="object-fit: cover;">
                    <div class="flex-grow-1">
                        <h5 class="fw-bold mb-1">${otherUserName}</h5>
                        <div class="mb-2">${statusBadge}</div>
                    </div>

                    <!-- Azioni -->
                    <div class="ms-auto text-end">
                        ${actionButton}
                    </div>
                </div>
            </div>`;
    }

    // Gestione cancellazione
    $(document).on('click', '.cancel-booking-btn', function() {
        const bookingId = $(this).data('booking-id');
        if (confirm('Sei sicuro di voler annullare questa prenotazione? Lo slot tornerà disponibile.')) {
            ApiService.put(`/bookings/${bookingId}/cancel`)
                .done(function(response) {
                    showToast(response.msg, 'success');
                    loadBookings(); // Ricarica la lista per aggiornare lo stato
                })
                .fail(function(xhr) {
                    const errorMsg = xhr.responseJSON ? xhr.responseJSON.msg : 'Errore durante la cancellazione.';
                    showToast(errorMsg, 'danger');
                });
        }
    });

    // Gestione apertura modal recensione
    $(document).on('click', '.open-review-modal-btn', function() {
        const bookingId = $(this).data('booking-id');
        $('#review-booking-id').val(bookingId);
        resetStars(); // Resetta le stelle ogni volta che il modal si apre
        $('#reviewModal').modal('show');
    });

    // Gestione invio form recensione
    $('#review-form').on('submit', function(event) {
        event.preventDefault();
        const submitBtn = $(this).find('button[type="submit"]');
        Loading.start(submitBtn);

        const reviewData = {
            booking_id: $('#review-booking-id').val(),
            rating: $('#rating').val(), // Il valore viene impostato dalla logica delle stelle
            comment: $('#comment').val()
        };

        ApiService.post('/reviews', reviewData)
            .done(function() {
                $('#reviewModal').modal('hide');
                showToast('Recensione inviata con successo!', 'success');
                loadBookings();
            })
            .fail(function(xhr) {
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.msg : 'Errore.';
                showToast(`Errore: ${errorMsg}`, 'danger');
            })
            .always(function() {
                Loading.stop(submitBtn);
            });
    });

    // --- Logica per le stelle ---
    const stars = $('.star-rating .star');

    // Effetto hover
    stars.on('mouseover', function() {
        const hoverValue = $(this).data('value');
        stars.each(function() {
            if ($(this).data('value') <= hoverValue) {
                $(this).addClass('hovered').text('★');
            } else {
                $(this).removeClass('hovered').text('☆');
            }
        });
    }).on('mouseout', function() {
        stars.removeClass('hovered');
        updateStars(); // Ripristina lo stato selezionato
    });

    // Click per selezionare
    stars.on('click', function() {
        const selectedValue = $(this).data('value');
        $('#rating').val(selectedValue); // Imposta il valore nel campo nascosto
        updateStars();
    });

    function updateStars() {
        const selectedValue = $('#rating').val();
        stars.each(function() {
            $(this).toggleClass('selected', $(this).data('value') <= selectedValue);
            $(this).text($(this).data('value') <= selectedValue ? '★' : '☆');
        });
    }

    function resetStars() {
        $('#rating').val(''); // Svuota il valore
        updateStars();
    }

    function showToast(message, type = 'success') {
        const toastEl = document.getElementById('liveToast');
        const toastBody = toastEl.querySelector('.toast-body');
        
        // Imposta il colore (verde per successo, rosso per errore)
        toastEl.className = `toast align-items-center border-0 text-bg-${type}`;
        toastBody.textContent = message;

        const toast = new bootstrap.Toast(toastEl);
        toast.show();
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
                loadBookings(); // Ricarica la lista per aggiornare lo stato
            })
            .fail(function(xhr) {
                showToast(`Errore pagamento: ${xhr.responseJSON?.msg || 'Riprova più tardi.'}`, 'danger');
            })
            .always(function() {
                payButton.prop('disabled', false).html('Paga Ora'); // Riabilita il pulsante
            });
    });
});