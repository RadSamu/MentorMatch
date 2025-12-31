$(document).ready(function() {
    // Estrai il token dall'URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showAlert('Token di reset non trovato. Per favore, richiedi un nuovo link.', 'danger');
        $('#reset-password-form').hide();
        return;
    }

    $('#reset-password-form').on('submit', function(event) {
        event.preventDefault();
        const password = $('#password').val();
        const passwordConfirm = $('#password-confirm').val();

        if (password !== passwordConfirm) {
            return showAlert('Le password non coincidono.', 'danger');
        }

        ApiService.put(`/auth/reset-password/${token}`, { password: password })
            .done(function(response) {
                showAlert('Password aggiornata con successo! Ora puoi effettuare il login.', 'success');
                $('#reset-password-form').hide();
            })
            .fail(function(xhr) {
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.msg : 'Si è verificato un errore.';
                showAlert(errorMsg, 'danger');
            });
    });

    function showAlert(message, type) {
        const alertPlaceholder = $('#alert-placeholder');
        alertPlaceholder.html(`<div class="alert alert-${type}" role="alert">${message}</div>`);
    }
});