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
            $('#headline').val(user.sector || '');
            $('#bio').val(user.bio || '');
            $('#languages').val(user.languages ? user.languages.join(', ') : '');
            $('#hourly_rate').val(user.hourly_rate || ''); // Popola il prezzo
            
            if (user.avatar_url) {
                $('#avatar-preview').attr('src', `http://localhost:3000${user.avatar_url}`);
            }
        })
        .fail(function(xhr) {
            console.error('Errore caricamento profilo:', xhr);
            showToast('Impossibile caricare i dati del profilo.', 'danger');
        });

    // 2. Gestione Upload Avatar
    $('#avatar-form').on('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        
        ApiService.upload('/users/avatar', formData)
            .done(function(response) {
                $('#avatar-preview').attr('src', `http://localhost:3000${response.avatar_url}`);
                showToast('Foto profilo aggiornata con successo!', 'success');
            })
            .fail(function() {
                showToast('Errore durante il caricamento della foto.', 'danger');
            });
    });

    // 3. Gestione Salvataggio Profilo (incluso Prezzo)
    $('#profile-form').on('submit', function(e) {
        e.preventDefault();

        const data = {
            headline: $('#headline').val(),
            bio: $('#bio').val(),
            languages: $('#languages').val().split(',').map(l => l.trim()).filter(l => l), // Converte stringa in array
            hourly_rate: $('#hourly_rate').val() // Invia il prezzo
        };

        ApiService.put('/users/profile', data)
            .done(function(response) {
                showToast('Profilo aggiornato con successo!', 'success');
                // Ritardiamo il reload per permettere all'utente di leggere la notifica
                setTimeout(() => window.location.reload(), 1500);
            })
            .fail(function(xhr) {
                showToast('Errore aggiornamento: ' + (xhr.responseJSON?.msg || 'Errore server'), 'danger');
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