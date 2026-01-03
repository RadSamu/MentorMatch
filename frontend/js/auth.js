// Eseguito quando il documento HTML è completamente caricato
$(document).ready(function() {
    // Gestione del form di registrazione
    $('#register-form').on('submit', function(event) {
        event.preventDefault(); // Impedisce il ricaricamento della pagina

        const submitBtn = $(this).find('button[type="submit"]');
        Loading.start(submitBtn);

        const userData = {
            name: $('#name').val(),
            surname: $('#surname').val(),
            email: $('#email').val(),
            password: $('#password').val(),
            gender: $('#gender').val(),
            role: $('input[name="role"]:checked').val()
        };

        ApiService.post('/auth/register', userData)
            .done(function(response) {
                showAlert('Registrazione avvenuta con successo! Reindirizzamento al login...', 'success');
                // Svuota il form dopo il successo
                $('#register-form')[0].reset();

                // Reindirizza alla pagina di login dopo 2 secondi (2000 ms)
                setTimeout(function() {
                    window.location.href = '/login.html';
                }, 2000);
            })
            .fail(function(xhr) {
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.msg : 'Errore durante la registrazione.';
                showAlert(errorMsg, 'danger');
                // Effetto Shake sulla card
                $('#register-form').closest('.card').addClass('shake').on('animationend', function() { $(this).removeClass('shake'); });
            })
            .always(function() {
                Loading.stop(submitBtn);
            });
    });

    // Gestione del form di login
    $('#login-form').on('submit', function(event) {
        event.preventDefault();

        const submitBtn = $(this).find('button[type="submit"]');
        Loading.start(submitBtn);

        const credentials = {
            email: $('#email').val(),
            password: $('#password').val()
        };

        ApiService.post('/auth/login', credentials)
            .done(function(response) {
                // Salva il token JWT nel localStorage del browser
                localStorage.setItem('token', response.token);
                // Reindirizza immediatamente alla dashboard
                window.location.href = '/dashboard.html';
            })
            .fail(function(xhr) {
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.msg : 'Errore durante il login.';
                showAlert(errorMsg, 'danger');
                // Effetto Shake sulla card
                $('#login-form').closest('.card').addClass('shake').on('animationend', function() { $(this).removeClass('shake'); });
            })
            .always(function() {
                Loading.stop(submitBtn);
            });
    });

    // Funzione helper per mostrare un alert di Bootstrap
    function showAlert(message, type) {
        const alertPlaceholder = $('#alert-placeholder');
        const wrapper = $('<div>')
            .addClass(`alert alert-${type} alert-dismissible fade show`)
            .attr('role', 'alert')
            .html(message);
        
        const button = $('<button>').addClass('btn-close').attr('type', 'button').attr('data-bs-dismiss', 'alert');
        wrapper.append(button);
        alertPlaceholder.html(wrapper);
    }
});