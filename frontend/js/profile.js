$(document).ready(function() {
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // 1. Carica i dati attuali del profilo
    ApiService.get('/users/me')
        .done(function(user) {
            // Popola i campi del form
            $('#profile-name').text(`${user.name} ${user.surname || ''}`);
            $('#headline').val(user.sector || '');
            $('#bio').val(user.bio || '');
            $('#languages').val(user.languages ? user.languages.join(', ') : '');
            $('#hourly_rate').val(user.hourly_rate || ''); // Popola il prezzo
            
            if (user.avatar_url) {
                // Usa BASE_URL se definito in global.js, altrimenti percorso relativo
                const baseUrl = ApiService.BASE_URL || '';
                $('#avatar-preview').attr('src', `${baseUrl}${user.avatar_url}`);
            }

            // Badge Ruolo
            const roleBadge = user.role === 'mentor' 
                ? '<span class="badge bg-primary rounded-pill px-3">Mentor</span>' 
                : '<span class="badge bg-secondary rounded-pill px-3">Mentee</span>';
            $('#profile-role-badge').html(roleBadge);

            if (user.role === 'mentor') {
                $('#mentor-rating-display').show();
                $('#rating-value').text(user.rating_avg || '0.0');
            } else {
                // Se è un mentee, nascondi i campi specifici del mentor
                $('#hourly-rate-container').hide();
                $('#skills-section-title').html('<i class="fas fa-language me-2"></i>Lingue');
            }
        })
        .fail(function(xhr) {
            console.error('Errore caricamento profilo:', xhr);
            showToast('Impossibile caricare i dati del profilo.', 'danger');
        });

    // 2. Gestione Upload Avatar (Immediato al cambio file)
    $('#avatar-file').on('change', function() {
        if (this.files && this.files[0]) {
            const formData = new FormData();
            formData.append('avatar', this.files[0]);
            
            // Feedback visivo immediato (opzionale: spinner o opacità)
            $('#avatar-preview').css('opacity', '0.5');

            ApiService.upload('/users/avatar', formData)
                .done(function(response) {
                    const baseUrl = ApiService.BASE_URL || '';
                    $('#avatar-preview').attr('src', `${baseUrl}${response.avatar_url}`);
                    showToast('Foto profilo aggiornata con successo!', 'success');
                })
                .fail(function() {
                    showToast('Errore durante il caricamento della foto.', 'danger');
                })
                .always(function() {
                    $('#avatar-preview').css('opacity', '1');
                });
        }
    });

    // 3. Gestione Salvataggio Profilo (incluso Prezzo)
    $('#profile-form').on('submit', function(e) {
        e.preventDefault();

        const submitBtn = $(this).find('button[type="submit"]');
        Loading.start(submitBtn); // Mostra spinner

        const data = {
            headline: $('#headline').val(),
            bio: $('#bio').val(),
            languages: $('#languages').val().split(',').map(l => l.trim()).filter(l => l), // Converte stringa in array
            hourly_rate: $('#hourly_rate').val() ? parseFloat($('#hourly_rate').val()) : null // Invia il prezzo come numero o null
        };

        ApiService.put('/users/profile', data)
            .done(function(response) {
                showToast('Profilo aggiornato con successo!', 'success');
                // Ritardiamo il reload per permettere all'utente di leggere la notifica
                setTimeout(() => window.location.reload(), 1500);
            })
            .fail(function(xhr) {
                showToast('Errore aggiornamento: ' + (xhr.responseJSON?.msg || 'Errore server'), 'danger');
            })
            .always(function() {
                Loading.stop(submitBtn); // Ripristina pulsante
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