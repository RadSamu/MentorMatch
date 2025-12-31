$(document).ready(function() {
    const BASE_URL = ApiService.BASE_URL;
    const token = localStorage.getItem('token');
    const futureBookingsList = $('#future-bookings-list');
    const pastBookingsList = $('#past-bookings-list');
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
        futureBookingsList.empty();
        pastBookingsList.empty();

        const now = new Date();
        const futureBookings = bookings.filter(b => new Date(b.start_ts) > now && b.status !== 'canceled');
        const pastBookings = bookings.filter(b => new Date(b.start_ts) <= now || b.status === 'canceled');

        if (futureBookings.length === 0) {
            futureBookingsList.html(`
                <div class="text-center py-5 bg-light rounded">
                    <i class="fas fa-calendar-plus fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">Nessuna prenotazione futura</h5>
                    <p class="text-muted">Prenota la tua prossima sessione per iniziare.</p>
                    <a href="/mentors.html" class="btn btn-outline-primary mt-2">Cerca Mentor</a>
                </div>
            `);
        }
        if (pastBookings.length === 0) {
            pastBookingsList.html(`
                <div class="text-center py-5 bg-light rounded">
                    <i class="fas fa-history fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">Nessuna prenotazione passata</h5>
                    <p class="text-muted">Qui troverai lo storico delle tue sessioni completate.</p>
                </div>
            `);
        }

        futureBookings.forEach(b => futureBookingsList.append(createBookingCard(b)));
        pastBookings.forEach(b => pastBookingsList.append(createBookingCard(b)));
    }

    function createBookingCard(booking) {
        const startTime = new Date(booking.start_ts).toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' });
        const isPast = new Date(booking.start_ts) <= new Date();
        const isCanceled = booking.status === 'canceled';

        let otherUserName, otherUserAvatar;

        if (currentUser.role === 'mentor') {
            otherUserName = `${booking.mentee_name} ${booking.mentee_surname}`;
            otherUserAvatar = booking.mentee_avatar ? `${BASE_URL}${booking.mentee_avatar}` : 'https://via.placeholder.com/80';
        } else {
            otherUserName = `${booking.mentor_name} ${booking.mentor_surname}`;
            otherUserAvatar = booking.mentor_avatar ? `${BASE_URL}${booking.mentor_avatar}` : 'https://via.placeholder.com/80';
        }

        let statusBadge, actionButton;
        if (isCanceled) {
            statusBadge = '<span class="badge bg-danger">Cancellata</span>';
            actionButton = '';
        } else if (isPast) {
            statusBadge = '<span class="badge bg-secondary">Completata</span>';
            if (currentUser.role === 'mentee' && !booking.has_review) {
                actionButton = `<button class="btn btn-sm btn-outline-success open-review-modal-btn" data-booking-id="${booking.id}">Lascia una recensione</button>`;
            } else {
                actionButton = '';
            }
        } else if (booking.status === 'pending') {
            statusBadge = `<span class="badge bg-warning text-dark">In Attesa di Pagamento</span>`;
            actionButton = `<button class="btn btn-sm btn-warning pay-now-btn me-2" 
                                data-bs-toggle="modal" 
                                data-bs-target="#paymentModal"
                                data-booking-id="${booking.id}"
                                data-price="${booking.price}">
                                Paga Ora (${booking.price}€)
                             </button>`;
            const cancelButton = `<button class="btn btn-sm btn-outline-danger cancel-booking-btn" data-booking-id="${booking.id}">Annulla</button>`;
            actionButton += cancelButton;
        } else {
            statusBadge = `<span class="badge bg-primary">Confermata</span>`;
            let meetingButton = '';
            if (booking.meeting_link) {
                meetingButton = `<a href="${booking.meeting_link}" target="_blank" class="btn btn-sm btn-success me-2">Partecipa</a>`;
            }
            const cancelButton = `<button class="btn btn-sm btn-outline-danger cancel-booking-btn" data-booking-id="${booking.id}">Annulla</button>`;
            actionButton = meetingButton + cancelButton;
        }

        return `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex align-items-center">
                        <img src="${otherUserAvatar}" alt="Avatar" class="rounded-circle me-3" width="60" height="60" style="object-fit: cover;">
                        <div class="flex-grow-1">
                            <h5 class="card-title mb-1">Sessione con ${otherUserName}</h5>
                            <p class="card-text text-muted mb-2">${startTime}</p>
                            ${statusBadge}
                        </div>
                        <div class="ms-auto">
                            ${actionButton}
                        </div>
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