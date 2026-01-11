const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    let transporter;

    // LOGICA IBRIDA:
    // Se abbiamo le credenziali SMTP nelle variabili d'ambiente (es. su Render), usiamo quelle.
    // Altrimenti, usiamo Ethereal per i test locali.
    if (process.env.SMTP_HOST && process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
        
        const isGmail = process.env.SMTP_HOST.includes('gmail');
        const transportConfig = {
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD,
            },
            family: 4, // FIX: Forza IPv4 per evitare timeout su Render/Gmail
            // Timeout per evitare che la richiesta si blocchi all'infinito
            connectionTimeout: 10000, // 10 secondi
            greetingTimeout: 10000,
            logger: true, // Logga ogni step SMTP
            debug: true   // Include i dati del traffico
        };

        if (isGmail) {
            transportConfig.service = 'gmail'; // Usa configurazione automatica per Gmail
        } else {
            const port = parseInt(process.env.SMTP_PORT || '587');
            transportConfig.host = process.env.SMTP_HOST;
            transportConfig.port = port;
            transportConfig.secure = port === 465;
        }

        transporter = nodemailer.createTransport(transportConfig);
    } else {
        // Fallback a Ethereal (solo se non siamo in produzione o mancano le variabili)
        if (process.env.NODE_ENV !== 'test') {
            console.log('⚠️ SMTP non configurato: Utilizzo Ethereal Email (Fake SMTP)');
        }
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    }

    // 2. Definisci le opzioni dell'email
    // Se usiamo SMTP reale, è meglio che il 'from' corrisponda all'utente autenticato per evitare spam
    const fromEmail = process.env.SMTP_EMAIL || process.env.FROM_EMAIL || 'noreply@mentormatch.com';
    const mailOptions = {
        from: `${process.env.FROM_NAME || 'MentorMatch'} <${fromEmail}>`,
        to: options.email,
        subject: options.subject,
        html: options.message,
    };

    // 3. Invia l'email
    console.log(`[DEBUG] Tentativo invio email a ${options.email} (Host: ${process.env.SMTP_HOST || 'Ethereal'})`);
    const info = await transporter.sendMail(mailOptions);

    // Se abbiamo usato Ethereal, stampiamo il link nel terminale
    if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'test') {
        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    } else if (process.env.NODE_ENV !== 'test') {
        console.log(`Email inviata a: ${options.email}`);
    }
};

module.exports = sendEmail;
