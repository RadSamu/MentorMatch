$(document).ready(function() {
    $('#forgot-password-form').on('submit', function(event) {
        event.preventDefault();
        const email = $('#email').val();
        const submitBtn = $(this).find('button[type="submit"]');
        if (window.Loading) Loading.start(submitBtn); // Feedback visivo

        ApiService.post('/auth/forgot-password', { email: email })
            .done(function(response) {
                showAlert('Se un account con questa email esiste, abbiamo inviato un link per il reset. Controlla la tua casella di posta (e lo spam).', 'success');
                $('#forgot-password-form')[0].reset();
            })
            .fail(function(xhr) {
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.msg : 'Si è verificato un errore.';
                showAlert(errorMsg, 'danger');
            })
            .always(function() {
                if (window.Loading) Loading.stop(submitBtn);
            });
    });

    function showAlert(message, type) {
        const alertPlaceholder = $('#alert-placeholder');
        alertPlaceholder.empty();
        const wrapper = $(`<div class="alert alert-${type}" role="alert">${message}</div>`);
        alertPlaceholder.html(wrapper);
    }
});