$(document).ready(function() {
    const token = localStorage.getItem('token');
    const calendarEl = document.getElementById('calendar');

    // Variabili per gestire lo stato dei modali
    let selectedStartDate = null;
    let selectedEventId = null;

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
            right: 'timeGridWeek,timeGridDay' // Rimosso dayGridMonth per focus su orari
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

            // 1. Salva la data selezionata
            selectedStartDate = startTime;
            
            // 2. Aggiorna il testo nel modale
            const dateStr = startTime.toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
            $('#slot-date-display').text(dateStr);
            
            // 3. Apri il modale
            const addModal = new bootstrap.Modal(document.getElementById('addSlotModal'));
            addModal.show();
        },

        // Gestione del click su un evento per VEDERE DETTAGLI o RIMUOVERE
        eventClick: function(clickInfo) {
            const event = clickInfo.event;
            selectedEventId = event.id;
            
            const isBooked = !event.extendedProps.editable;
            const timeStr = event.start.toLocaleString('it-IT', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            let contentHtml = `<p><strong>Orario:</strong> ${timeStr}</p>`;
            
            if (isBooked) {
                contentHtml += `<div class="alert alert-warning"><i class="fas fa-lock"></i> Questo slot è stato prenotato da un mentee.</div>`;
                $('#delete-slot-btn').hide(); // Nascondi bottone elimina
            } else {
                contentHtml += `<div class="alert alert-success"><i class="fas fa-check-circle"></i> Slot disponibile.</div>`;
                $('#delete-slot-btn').show(); // Mostra bottone elimina
            }

            $('#event-details-content').html(contentHtml);
            
            const eventModal = new bootstrap.Modal(document.getElementById('eventModal'));
            eventModal.show();
        }
    });

    // Renderizza il calendario
    calendar.render();

    // --- Gestione Azioni Modali ---

    // 1. Salva Nuovo Slot
    $('#save-slot-btn').click(function() {
        const meetingLink = $('#meeting-link').val();
        const btn = $(this);
        
        Loading.start(btn);
        
        ApiService.post('/availability', { start_time: selectedStartDate.toISOString(), meeting_link: meetingLink })
            .done(function() {
                showAlert('Disponibilità aggiunta con successo!', 'success');
                calendar.refetchEvents();
                bootstrap.Modal.getInstance(document.getElementById('addSlotModal')).hide();
            })
            .fail(function(xhr) {
                showAlert(`Errore: ${xhr.responseJSON?.msg || 'Impossibile aggiungere.'}`, 'danger');
            })
            .always(function() {
                Loading.stop(btn);
            });
    });

    // 2. Elimina Slot
    $('#delete-slot-btn').click(function() {
        ApiService.delete(`/availability/${selectedEventId}`)
            .done(function() {
                showAlert('Slot eliminato con successo.', 'success');
                calendar.refetchEvents();
                bootstrap.Modal.getInstance(document.getElementById('eventModal')).hide();
            })
            .fail(function(xhr) {
                showAlert(`Errore: ${xhr.responseJSON?.msg || 'Impossibile eliminare.'}`, 'danger');
            });
    });

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