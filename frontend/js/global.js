// --- Costante Avatar Default (SVG Base64 per evitare errori di rete) ---
window.DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cccccc'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

// --- Servizio API Centralizzato ---
window.ApiService = {
    API_URL: '/api',
    BASE_URL: '',

    getToken() {
        return localStorage.getItem('token');
    },

    getPayload() {
        const token = this.getToken();
        if (!token) return null;
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    },

    getRole() {
        const payload = this.getPayload();
        return payload ? payload.role : null;
    },

    getHeaders() {
        const headers = {};
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    request(endpoint, method, data = null, isFileUpload = false) {
        const options = {
            url: `${this.API_URL}${endpoint}`,
            type: method,
            headers: this.getHeaders(),
        };

        if (isFileUpload) {
            options.data = data;
            options.processData = false;
            options.contentType = false;
        } else {
            options.contentType = 'application/json';
            if (data) {
                options.data = JSON.stringify(data);
            }
        }

        return $.ajax(options);
    },

    get(endpoint) { return this.request(endpoint, 'GET'); },
    post(endpoint, data) { return this.request(endpoint, 'POST', data); },
    put(endpoint, data) { return this.request(endpoint, 'PUT', data); },
    delete(endpoint) { return this.request(endpoint, 'DELETE'); },
    upload(endpoint, formData) { return this.request(endpoint, 'POST', formData, true); }
};

// --- Utility per Loading Buttons ---
window.Loading = {
    start: function(btnSelector) {
        const btn = $(btnSelector);
        // Salva il testo originale se non è già salvato
        if (!btn.data('original-text')) btn.data('original-text', btn.html());
        btn.prop('disabled', true);
        btn.html('<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Attendi...');
    },
    stop: function(btnSelector) {
        const btn = $(btnSelector);
        btn.prop('disabled', false);
        btn.html(btn.data('original-text'));
    }
};

$(document).ready(function() {
    // Carica la navbar nel placeholder
    $('#navbar-placeholder').load('/components/navbar.html', function() {
        // Carica anche il footer se presente il placeholder
        $('#footer-placeholder').load('/components/footer.html', function() {
            updateFooterLinks();
        });

        // Questa funzione viene eseguita DOPO che la navbar è stata caricata
        
        // Aggiungi FontAwesome per l'icona della campanella
        $('head').append('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">');

        // Gestione del click sul pulsante di logout
        $(document).on('click', '#logout-button', function(e) {
            e.preventDefault();
            localStorage.removeItem('token'); // Rimuovi il token
            window.location.href = '/'; // Reindirizza alla homepage
        });

        const token = localStorage.getItem('token');

        if (token) {
            // L'utente è loggato: mostra i link della dashboard/logout e nascondi login/register
            $('#nav-login').hide();
            $('#nav-register').hide();
            $('#nav-notifications').css('display', 'block'); // Mostra la campanella
            loadNotifications(token); // Carica le notifiche

            // Carica i dati utente per la navbar
            ApiService.get('/auth/me').done(function(user) {
                const avatarUrl = user.avatar_url ? `${ApiService.BASE_URL}${user.avatar_url}` : window.DEFAULT_AVATAR;
                $('#nav-user-name').text(user.name);
                $('#nav-user-email').text(user.email);
                $('#nav-user-avatar').attr('src', avatarUrl);
                
                $('#nav-user-dropdown').show(); // Mostra il dropdown utente
            });
        } else {
            // L'utente non è loggato: stato di default (login/register visibili)
            $('#nav-notifications').hide();
            $('#nav-login').show();
            $('#nav-register').show();
            $('#nav-user-dropdown').hide();
        }



        // --- Logica per le Notifiche ---

        // Funzione per formattare il messaggio della notifica
        function formatNotification(notification) {
            const { type, payload } = notification;
            let message = 'Nuova notifica';
            let link = '#';

            switch (type) {
                case 'booking_confirmed':
                    message = `Hai una nuova prenotazione da <strong>${payload.menteeName}</strong>.`;
                    link = '/my-bookings.html';
                    break;
                case 'booking_canceled_by_mentee':
                    message = `<strong>${payload.menteeName}</strong> ha cancellato la sua prenotazione.`;
                    link = '/my-bookings.html';
                    break;
                case 'booking_canceled_by_mentor':
                    message = `La tua sessione con <strong>${payload.mentorName}</strong> è stata cancellata.`;
                    link = '/my-bookings.html';
                    break;
                case 'new_message':
                    message = `Hai un nuovo messaggio da <strong>${payload.fromUserName}</strong>.`;
                    link = `/messages.html?with=${payload.fromUserId}`;
                    break;
            }
            return { message, link };
        }


        function loadNotifications(token) {
            const notificationCountBadge = $('#notification-count');
            const notificationList = $('#notification-list');

            ApiService.get('/notifications').done(function(notifications) {
                    notificationList.empty();
                    const unreadCount = notifications.filter(n => !n.is_read).length;

                    if (unreadCount > 0) {
                        // Aggiungi classe pulse-badge se ci sono notifiche
                        notificationCountBadge.text(unreadCount).show().addClass('pulse-badge');
                    } else {
                        notificationCountBadge.hide().removeClass('pulse-badge');
                    }

                    if (notifications.length === 0) {
                        notificationList.append('<li><p class="dropdown-item text-muted text-center my-2">Nessuna notifica.</p></li>');
                        return;
                    }

                    notifications.forEach(n => {
                        const { message, link } = formatNotification(n);
                        const isUnreadClass = n.is_read ? '' : 'bg-light';
                        const itemHtml = `
                            <li class="${isUnreadClass}">
                                <a class="dropdown-item notification-item" href="${link}" data-id="${n.id}">
                                    <small>${message}</small>
                                </a>
                            </li>
                        `;
                        notificationList.append(itemHtml);
                    });

                    if (unreadCount > 0) {
                        notificationList.append('<li><hr class="dropdown-divider m-0"></li>');
                        notificationList.append('<li><a class="dropdown-item text-center text-primary" id="mark-all-read-btn" href="#">Segna tutte come lette</a></li>');
                    }
            });
        }

        // Gestione click su una notifica
        $(document).on('click', '.notification-item', function(e) {
            e.preventDefault();
            const notificationId = $(this).data('id');
            const link = $(this).attr('href');

            ApiService.put(`/notifications/${notificationId}/read`).done(function() {
                    window.location.href = link; // Reindirizza solo dopo aver segnato come letta
            });
        });

        // Gestione click su "Segna tutte come lette"
        $(document).on('click', '#mark-all-read-btn', function(e) {
            e.preventDefault();
            e.stopPropagation(); // Evita che il dropdown si chiuda
            ApiService.put('/notifications/read-all').done(() => loadNotifications(token));
        });
    });

    // Funzione per aggiornare i link del footer in base allo stato di login
    function updateFooterLinks() {
        const token = localStorage.getItem('token');
        const linksContainer = $('#footer-quick-links');
        
        if (linksContainer.length === 0) return;

        linksContainer.empty();

        if (token) {
            // Utente loggato: Mostra link funzionali
            linksContainer.append('<li class="mb-2"><a href="/dashboard.html" class="text-white-50 text-decoration-none">Dashboard</a></li>');
            linksContainer.append('<li class="mb-2"><a href="/profile.html" class="text-white-50 text-decoration-none">Il mio Profilo</a></li>');
            linksContainer.append('<li class="mb-2"><a href="/my-bookings.html" class="text-white-50 text-decoration-none">Le mie Prenotazioni</a></li>');
        } else {
            // Utente non loggato: Mostra link di accesso (default)
            linksContainer.append('<li class="mb-2"><a href="/" class="text-white-50 text-decoration-none">Home</a></li>');
            linksContainer.append('<li class="mb-2"><a href="/login.html" class="text-white-50 text-decoration-none">Accedi</a></li>');
            linksContainer.append('<li class="mb-2"><a href="/register.html" class="text-white-50 text-decoration-none">Registrati</a></li>');
        }
    }

    // --- Scroll Reveal Logic ---
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Anima solo una volta
            }
        });
    }, observerOptions);

    // Funzione globale per inizializzare gli elementi scroll-reveal (utile per contenuti dinamici)
    window.initScrollReveal = function() {
        $('.scroll-reveal').each(function() { observer.observe(this); });
    };
    
    // Avvia subito
    window.initScrollReveal();

    // --- Number Counter Animation ---
    window.initCounters = function() {
        const counters = document.querySelectorAll('.counter');
        const speed = 200; // Minore è più veloce

        const counterObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counter = entry.target;
                    const target = +counter.getAttribute('data-target');
                    const inc = target / speed;

                    const updateCount = () => {
                        const count = +counter.innerText.replace('+', ''); // Rimuovi + se presente
                        if (count < target) {
                            counter.innerText = Math.ceil(count + inc) + (counter.getAttribute('data-suffix') || '');
                            setTimeout(updateCount, 20);
                        } else {
                            counter.innerText = target + (counter.getAttribute('data-suffix') || '');
                        }
                    };
                    updateCount();
                    observer.unobserve(counter);
                }
            });
        });

        counters.forEach(counter => counterObserver.observe(counter));
    };
    window.initCounters();

    // --- Success Checkmark Overlay Utility ---
    window.showSuccessAnimation = function(message = 'Operazione completata!') {
        const overlay = $(`
            <div class="success-overlay">
                <div class="checkmark-circle mb-4"><div class="checkmark-draw"></div></div>
                <h3 class="text-white fw-bold">${message}</h3>
            </div>
        `).appendTo('body');
        
        setTimeout(() => { overlay.fadeOut(500, () => overlay.remove()); }, 2000);
    };

    // --- Back to Top Button Logic ---
    // Aggiunge il pulsante al body
    $('body').append('<div id="back-to-top" class="back-to-top"><i class="fas fa-arrow-up"></i></div>');
    
    const backToTopBtn = $('#back-to-top');
    
    $(window).scroll(function() {
        if ($(window).scrollTop() > 300) {
            backToTopBtn.addClass('visible');
        } else {
            backToTopBtn.removeClass('visible');
        }
    });

    backToTopBtn.on('click', function(e) {
        e.preventDefault();
        window.scrollTo({top: 0, behavior: 'smooth'});
    });
});