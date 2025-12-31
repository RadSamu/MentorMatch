$(document).ready(function() {
    const token = localStorage.getItem('token');
    const calendarEl = document.getElementById('calendar');

    // Protezione della pagina
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    
    // Inizializzazione di FullCalendar
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek', // Vista settimanale
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        locale: 'it', // Lingua italiana
        slotMinTime: '08:00:00', // Orario di inizio visualizzato
        slotMaxTime: '20:00:00', // Orario di fine visualizzato
        allDaySlot: false, // Nasconde la riga "tutto il giorno"
        selectable: true, // Permette di selezionare gli slot
        
        // Funzione per caricare gli eventi (le nostre disponibilità)
        events: function(fetchInfo, successCallback, failureCallback) {
            ApiService.get('/availability/me')
                .done(function(slots) {
                    const events = slots.map(slot => ({
                        id: slot.id,
                        title: slot.is_booked ? 'Prenotato' : 'Disponibile',
                        start: slot.start_ts,
                        end: slot.end_ts,
                        backgroundColor: slot.is_booked ? '#6c757d' : '#0d6efd', // Grigio per prenotato, Blu per disponibile
                        borderColor: slot.is_booked ? '#6c757d' : '#0d6efd',
                        editable: !slot.is_booked // Gli slot prenotati non sono modificabili
                    }));
                    successCallback(events);
                })
                .fail(function(xhr) {
                    showAlert('Errore nel caricare le disponibilità.', 'danger');
                    failureCallback(xhr);
                });
        },

        // Gestione del click su una data/ora per AGGIUNGERE uno slot
        select: function(selectionInfo) {
            const startTime = selectionInfo.start;
            if (startTime < new Date()) {
                showAlert('Non puoi aggiungere disponibilità nel passato.', 'warning');
                calendar.unselect();
                return;
            }

            const meetingLink = prompt("Vuoi aggiungere un link per la videochiamata (es. Zoom, Meet)? Lascia vuoto se non necessario.", "https://meet.google.com/");

            // Se l'utente clicca "Annulla" sul prompt, non fare nulla
            if (meetingLink === null) return;

            if (confirm(`Confermi di voler aggiungere uno slot per le ${startTime.toLocaleTimeString('it-IT', {timeStyle: 'short'})}?`)) {
                ApiService.post('/availability', { start_time: startTime.toISOString(), meeting_link: meetingLink })
                    .done(function() {
                        showAlert('Disponibilità aggiunta con successo!', 'success');
                        calendar.refetchEvents(); // Ricarica gli eventi sul calendario
                    })
                    .fail(function(xhr) {
                        const errorMsg = xhr.responseJSON ? xhr.responseJSON.msg : 'Errore.';
                        showAlert(`Impossibile aggiungere la disponibilità. ${errorMsg}`, 'danger');
                    });
            }
            calendar.unselect();
        },

        // Gestione del click su un evento per RIMUOVERLO
        eventClick: function(clickInfo) {
            const event = clickInfo.event;
            // Permetti la cancellazione solo se lo slot non è prenotato
            if (event.extendedProps.editable === false || event.backgroundColor === '#6c757d') {
                showAlert('Non puoi rimuovere uno slot già prenotato.', 'warning');
                return;
            }

            if (confirm(`Sei sicuro di voler rimuovere lo slot delle ${event.start.toLocaleTimeString('it-IT', {timeStyle: 'short'})}?`)) {
                ApiService.delete(`/availability/${event.id}`)
                    .done(function() {
                        showAlert('Slot eliminato con successo.', 'success');
                        calendar.refetchEvents(); // Ricarica gli eventi
                    })
                    .fail(function(xhr) {
                        const errorMsg = xhr.responseJSON ? xhr.responseJSON.msg : 'Errore.';
                        showAlert(`Impossibile eliminare lo slot. ${errorMsg}`, 'danger');
                    });
            }
        }
    });

    // Renderizza il calendario
    calendar.render();

    // Funzione helper per mostrare alert
    function showAlert(message, type) {
        const alertPlaceholder = $('#alert-placeholder');
        const wrapper = $(`<div class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`);
        alertPlaceholder.html(wrapper);
        // Auto-dismiss dopo 3 secondi
        setTimeout(() => {
            wrapper.alert('close');
        }, 3000);
    }
});