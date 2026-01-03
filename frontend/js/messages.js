$(document).ready(function() {
    const BASE_URL = ApiService.BASE_URL;
    const token = localStorage.getItem('token');
    let currentUserId;
    
    let pollingInterval = null; // Variabile per gestire il timer del polling

    if (!token) { // Protezione della pagina
        window.location.href = '/login.html';
        return;
    }

    // Funzione di utilità per garantire che un ID sia sempre un numero
    function parseUserId(id) {
        if (id === null || id === undefined) {
            return null;
        }
        return parseInt(id, 10);
    }

    // Helper per formattare l'etichetta della data
    function formatDateLabel(isoDate) {
        const date = new Date(isoDate);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Oggi';
        if (date.toDateString() === yesterday.toDateString()) return 'Ieri';
        return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function loadMessages(otherUserId, otherUserName, otherUserAvatar) {
        // Interrompi il polling precedente prima di caricarne uno nuovo
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }

        $('#welcome-window').addClass('d-none'); // Nasconde la finestra di benvenuto
        $('#chat-container').removeClass('d-none').addClass('d-flex'); // Mostra il contenitore della chat
        $('#receiver-id-input').val(otherUserId); // Manteniamo il valore originale, lo parseremo quando serve
        
        // Header Chat Arricchito
        $('#chat-header').html(`
            <div class="d-flex align-items-center">
                <img src="${otherUserAvatar}" class="rounded-circle me-3 border shadow-sm" width="45" height="45" style="object-fit: cover;">
                <div>
                    <h6 class="mb-0 fw-bold">${otherUserName}</h6>
                    <small class="text-success"><i class="fas fa-circle fa-xs me-1"></i>Online</small>
                </div>
            </div>
        `);
        
        const messagesList = $('#messages-list');
        messagesList.empty().append('<p class="text-center text-muted">Caricamento...</p>');

        ApiService.get(`/messages/${otherUserId}`)
            .done(function(messages) {
                messagesList.empty();
                let lastDateStr = null; // Per tenere traccia del cambio di giorno

                messages.forEach(msg => {
                    // 1. Gestione Divisore Data
                    const msgDate = new Date(msg.created_at);
                    const msgDateStr = msgDate.toDateString();

                    if (msgDateStr !== lastDateStr) {
                        messagesList.append(`
                            <div class="date-separator">
                                <span>${formatDateLabel(msg.created_at)}</span>
                            </div>
                        `);
                        lastDateStr = msgDateStr;
                    }

                    const messageClass = parseUserId(msg.from_user) === currentUserId ? 'sent' : 'received';
                    
                    let item;
                    if (messageClass === 'received') {
                        item = `
                            <div class="message received mb-2" data-message-id="${msg.id}" data-timestamp="${msg.created_at}">
                                <div class="message-bubble">${msg.body}</div>
                                <small class="text-muted d-block mt-1">${new Date(msg.created_at).toLocaleTimeString('it-IT', {timeStyle: 'short'})}</small>
                            </div>`;
                    } else { // sent
                        item = `
                            <div class="message sent mb-2" data-message-id="${msg.id}" data-timestamp="${msg.created_at}">
                                <div class="message-bubble">${msg.body}</div>
                                <div class="message-status d-flex justify-content-end align-items-center mt-1">
                                    <small class="me-1">${new Date(msg.created_at).toLocaleTimeString('it-IT', {timeStyle: 'short'})}</small>
                                    <span class="status-icon">✓</span>
                                </div>
                            </div>`;
                    }
                    messagesList.append(item);
                });

                // Scrolla fino all'ultimo messaggio
                messagesList.scrollTop(messagesList[0].scrollHeight);

                // Avvia il polling per questa conversazione
                pollingInterval = setInterval(() => pollForNewMessages(otherUserId), 3000); // Controlla ogni 3 secondi
            });
    }

    // --- Funzioni per Typing Indicator ---
    function showTypingIndicator() {
        const messagesList = $('#messages-list');
        if ($('#typing-indicator').length === 0) {
            const indicator = `
                <div id="typing-indicator" class="message received mb-2">
                    <div class="message-bubble">
                        <div class="typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                </div>`;
            messagesList.append(indicator);
        }
    }

    function hideTypingIndicator() {
        $('#typing-indicator').remove();
    }

    // Funzione estratta per appendere i messaggi (usata sia direttamente che dopo il delay)
    function appendNewMessagesToChat(newMessages) {
        const messagesList = $('#messages-list');
        newMessages.forEach(msg => {
            // Aggiungiamo solo i messaggi ricevuti, quelli inviati li aggiungiamo già all'invio
            const isFromOtherUser = parseUserId(msg.from_user) !== currentUserId;
            
            // WORKAROUND: Controlla se il messaggio esiste già nel DOM per evitare duplicati causati dal backend
            const messageExists = $(`#messages-list .message[data-message-id="${msg.id}"]`).length > 0;

            if (isFromOtherUser && !messageExists) {
                
                // Controllo se serve un divisore di data per il nuovo messaggio
                const lastMsgElement = messagesList.find('.message').last();
                const lastTimestamp = lastMsgElement.data('timestamp');
                const msgDate = new Date(msg.created_at);
                
                if (lastTimestamp && new Date(lastTimestamp).toDateString() !== msgDate.toDateString()) {
                    messagesList.append(`
                        <div class="date-separator">
                            <span>${formatDateLabel(msg.created_at)}</span>
                        </div>
                    `);
                }

                const item = `
                    <div class="message received mb-2" data-message-id="${msg.id}" data-timestamp="${msg.created_at}">
                        <div class="message-bubble">${msg.body}</div>
                        <small class="text-muted d-block mt-1">${new Date(msg.created_at).toLocaleTimeString('it-IT', {timeStyle: 'short'})}</small>
                    </div>`;
                messagesList.append(item);
            }
        });
        // Scrolla solo se l'utente non sta guardando i messaggi vecchi
        const scrollHeight = messagesList[0].scrollHeight;
        const currentScroll = messagesList.scrollTop() + messagesList.innerHeight();
        if (scrollHeight - currentScroll < 100) { // Se l'utente è vicino al fondo
            messagesList.scrollTop(scrollHeight);
        }
    }

    function pollForNewMessages(userId) {
        // FIX: Interrompi se l'utente ha cambiato chat nel frattempo
        const currentReceiverId = parseUserId($('#receiver-id-input').val());
        if (currentReceiverId !== userId) return;

        // Trova l'ID dell'ultimo messaggio visualizzato
        const lastMessageId = $('#messages-list .message').last().data('message-id') || 0;
        console.log(`[POLL START] Polling for user: ${userId}. Last message ID: ${lastMessageId}. Current user ID: ${currentUserId}`);
        
        ApiService.get(`/messages/${userId}?since=${lastMessageId}`)
            .done(function(newMessages) {
                // FIX: Controllo doppio nel caso la chat sia cambiata durante la richiesta di rete
                if (parseUserId($('#receiver-id-input').val()) !== userId) return;

                console.log(`[POLL SUCCESS] Received ${newMessages.length} new messages.`);
                if (newMessages.length > 0) {
                    // Filtra i messaggi che sono veramente nuovi e in arrivo (per l'animazione)
                    const incomingNewMessages = newMessages.filter(msg => {
                        const isFromOtherUser = parseUserId(msg.from_user) !== currentUserId;
                        const messageExists = $(`#messages-list .message[data-message-id="${msg.id}"]`).length > 0;
                        return isFromOtherUser && !messageExists;
                    });

                    if (incomingNewMessages.length > 0) {
                        showTypingIndicator();
                        $('#messages-list').scrollTop($('#messages-list')[0].scrollHeight);
                        setTimeout(() => {
                            hideTypingIndicator();
                            appendNewMessagesToChat(newMessages);
                        }, 1500); // Simula 1.5s di scrittura
                    } else {
                        appendNewMessagesToChat(newMessages);
                    }
                }
            })
            .fail(function(xhr) {
                console.error("[POLL ERROR] Error during polling:", xhr.responseText);
            });
    }

    // Gestione click su una conversazione
    $(document).on('click', '.conversation-item', function(e) {
        e.preventDefault();
        const userId = $(this).data('user-id');
        const userName = $(this).data('user-name');
        const userAvatar = $(this).find('img').attr('src'); // Recupera l'avatar dall'elemento cliccato
        $('.conversation-item').removeClass('active');
        $(this).addClass('active').removeClass('fw-bold');
        loadMessages(userId, userName, userAvatar);
    });

    // Gestione click sul pulsante "Riprova"
    $(document).on('click', '.retry-btn', function(e) {
        e.preventDefault();
        const messageElement = $(this).closest('.message.error');
        const body = messageElement.data('body');
        const receiverId = parseUserId(messageElement.data('receiver-id'));
        messageElement.remove(); // Rimuovi il messaggio fallito
        sendMessage(receiverId, body); // Tenta di inviare di nuovo
    });

    // Gestione auto-resize textarea e invio con Enter
    $('#message-input').on('input', function() {
        this.style.height = 'auto'; // Resetta l'altezza per ricalcolare
        this.style.height = (this.scrollHeight) + 'px'; // Imposta la nuova altezza
    }).on('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Evita l'a capo
            $('#message-form').submit(); // Invia il form
        }
    });

    // Gestione invio messaggio
    $('#message-form').on('submit', function(e) {
        e.preventDefault();
        const receiverId = parseUserId($('#receiver-id-input').val());
        if (!receiverId) return;

        const body = $('#message-input').val();
        if (!body.trim()) return;

        sendMessage(receiverId, body);
        $('#message-input').val(''); // Svuota l'input solo dopo aver chiamato la funzione
        $('#message-input').css('height', 'auto'); // Resetta l'altezza dopo l'invio
    });

    function sendMessage(receiverId, body) {
        // 1. Crea un ID temporaneo e l'elemento HTML del messaggio in stato "pending"
        const tempId = `temp_${Date.now()}`;
        const messagesList = $('#messages-list');
        const now = new Date();

        // Controllo se serve un divisore di data per il messaggio che sto inviando
        const lastMsgElement = messagesList.find('.message').last();
        const lastTimestamp = lastMsgElement.data('timestamp');
        
        if (lastTimestamp && new Date(lastTimestamp).toDateString() !== now.toDateString()) {
            messagesList.append(`
                <div class="date-separator">
                    <span>Oggi</span>
                </div>
            `);
        }

        const pendingItemHtml = `
            <div class="message sent pending mb-2" data-temp-id="${tempId}" data-body="${body}" data-receiver-id="${receiverId}" data-timestamp="${now.toISOString()}">
                <div class="message-bubble">${body}</div>
                <div class="message-status d-flex justify-content-end align-items-center mt-1">
                    <small class="me-1">${new Date().toLocaleTimeString('it-IT', {timeStyle: 'short'})}</small>
                    <span class="status-icon">🕓</span>
                </div>
            </div>`;
        
        messagesList.append(pendingItemHtml);
        messagesList.scrollTop(messagesList[0].scrollHeight);

        // 2. Invia il messaggio al server
        ApiService.post(`/messages/${receiverId}`, { body: body })
            .done(function(newMessage) {
                // 3. Aggiorna il messaggio da "pending" a "sent"
                const sentMessage = $(`[data-temp-id="${tempId}"]`);
                sentMessage.removeClass('pending');
                sentMessage.attr('data-message-id', newMessage.id); // Imposta l'ID permanente
                sentMessage.attr('data-timestamp', newMessage.created_at); // Aggiorna timestamp reale server
                sentMessage.removeAttr('data-temp-id');
                sentMessage.find('.status-icon').text('✓'); // Aggiorna l'icona a spunta

                // Se questa era una nuova conversazione, ricarica la lista a sinistra
                if ($(`.conversation-item[data-user-id="${receiverId}"]`).length === 0) {
                    initializeChat(); // Ricarica tutto per la nuova conversazione
                } else {
                    updateConversationPreview(receiverId, newMessage, true);
                }
            })
            .fail(function(xhr) {
                // 4. Aggiorna il messaggio allo stato di "error"
                const errorMessage = $(`[data-temp-id="${tempId}"]`);
                const statusContainer = errorMessage.find('.message-status');
                
                errorMessage.removeClass('pending').addClass('error');
                statusContainer.find('.status-icon').html('❗');
                statusContainer.append('<a href="#" class="retry-btn">Riprova</a>');
                errorMessage.attr('title', 'Invio fallito. Clicca su "Riprova".');
            });
    }

    // Funzione di avvio principale
    async function initializeChat() { 
        try {
            const user = await ApiService.get('/auth/me');
            console.log("[INIT] Fetched current user.", user);
            currentUserId = parseUserId(user.id);

            await refreshConversationsList(); // Carica la lista iniziale

            const urlParams = new URLSearchParams(window.location.search);
            const openWithUserId = urlParams.get('with');
            
            if (openWithUserId) {
                const conversationItem = $(`.conversation-item[data-user-id="${openWithUserId}"]`);
                if (conversationItem.length > 0) {
                    conversationItem.click();
                } else {
                    // Se è una nuova conversazione, recuperiamo i dati del mentor e apriamo la chat
                    const mentor = await ApiService.get(`/mentors/${openWithUserId}`);
                    const mentorFullName = `${mentor.name} ${mentor.surname}`;
                    // Rimuoviamo la classe 'active' da altre conversazioni
                    $('.conversation-item').removeClass('active');
                    // Apriamo la finestra della chat per il nuovo utente
                    const avatarUrl = window.getAvatarUrl(mentor.avatar_url);
                    loadMessages(openWithUserId, mentorFullName, avatarUrl);
                }
            }
        } catch (error) {
            console.error("Errore durante l'inizializzazione della chat:", error);
            window.location.href = '/login.html';
        }
    }

    // Funzione per caricare/aggiornare l'intera lista delle conversazioni
    async function refreshConversationsList() {
        try {
            const conversations = await ApiService.get('/messages/conversations');
    
            const list = $('#conversations-list');
            const activeUserId = $('.conversation-item.active').data('user-id');
            list.empty();

            if (conversations.length === 0) {
                list.html(`
                    <div class="text-center py-5">
                        <i class="fas fa-paper-plane fa-3x text-muted mb-3"></i>
                        <p class="text-muted">Nessuna conversazione iniziata.</p>
                        <p class="small text-muted">Contatta un mentor per iniziare.</p>
                    </div>
                `);
                return;
            }

            conversations.forEach(conv => {
                // Usiamo un SVG come placeholder per non dipendere da servizi esterni
                const avatarUrl = window.getAvatarUrl(conv.avatar_url);
                const unreadClass = conv.has_unread ? 'fw-bold' : '';
                const item = `
                    <a href="#" class="list-group-item list-group-item-action conversation-item ${unreadClass}" data-user-id="${conv.id}" data-user-name="${conv.name} ${conv.surname}">
                        <div class="d-flex w-100 justify-content-start align-items-center py-1">
                            <img src="${avatarUrl}" class="rounded-circle me-3" width="50" height="50">
                            <div class="flex-grow-1">
                                <h6 class="mb-1">${conv.name} ${conv.surname}</h6>
                                <small class="text-muted text-truncate d-block">${conv.last_message}</small>
                            </div>
                        </div>
                    </a>`;
                list.append(item);
            });

            if (activeUserId) {
                $(`.conversation-item[data-user-id="${activeUserId}"]`).addClass('active');
            }

        } catch (error) {
            console.error("Impossibile aggiornare le conversazioni", error);
        }
    }

    // Funzione per aggiornare solo l'anteprima di una conversazione
    function updateConversationPreview(otherUserId, lastMessage, isSentByMe) {
        const conversationItem = $(`.conversation-item[data-user-id="${otherUserId}"]`);
        if (conversationItem.length > 0) {
            // Aggiorna il testo dell'ultimo messaggio
            conversationItem.find('small.text-muted').text(lastMessage.body);

            // Se il messaggio è stato ricevuto (non inviato da me) e la chat non è attiva,
            // mettila in grassetto per indicare un nuovo messaggio non letto.
            if (!isSentByMe && !conversationItem.hasClass('active')) {
                conversationItem.addClass('fw-bold');
            }
            // Porta la conversazione in cima alla lista
            conversationItem.parent().prepend(conversationItem);
        }
    }

    initializeChat(); // Avvia tutto
});