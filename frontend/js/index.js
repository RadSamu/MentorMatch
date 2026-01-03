$(document).ready(function() {
    const BASE_URL = ApiService.BASE_URL;

    // Carica 3 mentor in evidenza
    ApiService.get('/mentors?limit=3')
        .done(function(response) {
            const mentors = response.data;
            const container = $('#featured-mentors');
            container.empty();

            if (mentors.length === 0) {
                container.html('<p class="text-center text-muted">Nessun mentor disponibile al momento.</p>');
                return;
            }

            mentors.forEach(mentor => {
                const avatarUrl = mentor.avatar_url ? `${BASE_URL}${mentor.avatar_url}` : 'https://via.placeholder.com/150';
                const headline = mentor.sector || 'Esperto';
                const bioSnippet = mentor.bio ? mentor.bio.substring(0, 80) + '...' : '...';
                
                // Badge prezzo
                const priceBadge = mentor.hourly_rate 
                    ? `<div class="mentor-price-badge">${parseFloat(mentor.hourly_rate).toFixed(0)}€/h</div>` 
                    : `<div class="mentor-price-badge">Gratis</div>`;

                // Rating
                const ratingHtml = mentor.rating_avg 
                    ? `<span class="text-warning fw-bold"><i class="fas fa-star"></i> ${mentor.rating_avg}</span>`
                    : `<span class="text-muted small">Nuovo</span>`;

                const cardHtml = `
                    <div class="col-md-4 stagger-item">
                        <div class="card mentor-card h-100">
                            <div class="mentor-card-header">
                                ${priceBadge}
                                <div class="mentor-avatar-container">
                                    <img src="${avatarUrl}" alt="${mentor.name}">
                                </div>
                            </div>
                            <div class="mentor-card-body text-center">
                                <h5 class="fw-bold mb-1">${mentor.name} ${mentor.surname}</h5>
                                <p class="text-primary small mb-2 fw-bold text-uppercase">${headline}</p>
                                <div class="mb-3">${ratingHtml}</div>
                                <p class="card-text text-muted small mb-4">${bioSnippet}</p>
                                <a href="/mentor-detail.html?id=${mentor.id}" class="btn btn-outline-primary rounded-pill px-4">Vedi Profilo</a>
                            </div>
                        </div>
                    </div>
                `;
                container.append(cardHtml);
            });
        })
        .fail(function() {
            $('#featured-mentors').html('<p class="text-center text-danger">Impossibile caricare i mentor.</p>');
        });

    // --- Typewriter Effect Logic ---
    const words = ["Sviluppo Web", "Marketing Digitale", "Data Science", "Design UX/UI", "Startup & Business", "Leadership"];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    const typeSpeed = 100;
    const deleteSpeed = 50;
    const waitBeforeDelete = 2000;
    const waitBeforeNext = 500;
    const typeWriterElement = $('#typewriter-text');

    function typeWriter() {
        const currentWord = words[wordIndex];
        
        if (isDeleting) {
            // Cancellazione
            typeWriterElement.text(currentWord.substring(0, charIndex - 1));
            charIndex--;
        } else {
            // Scrittura
            typeWriterElement.text(currentWord.substring(0, charIndex + 1));
            charIndex++;
        }

        let nextSpeed = isDeleting ? deleteSpeed : typeSpeed;

        if (!isDeleting && charIndex === currentWord.length) {
            // Parola completata, aspetta prima di cancellare
            nextSpeed = waitBeforeDelete;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            // Cancellazione completata, passa alla prossima parola
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            nextSpeed = waitBeforeNext;
        }

        setTimeout(typeWriter, nextSpeed);
    }

    // Avvia l'effetto macchina da scrivere
    typeWriter();

    // --- Parallax Effect Logic ---
    $(window).on('scroll', function() {
        const scrolled = $(window).scrollTop();
        // Muove lo sfondo a metà velocità rispetto allo scroll (effetto profondità)
        $('.hero-section').css('background-position', 'center ' + (scrolled * 0.5) + 'px');
    });
});