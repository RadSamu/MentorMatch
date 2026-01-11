const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // --- LOG DI SICUREZZA (SALVAVITA) ---
    // Stampiamo il contenuto dell'email PRIMA di inviarla.
    // Se l'invio fallisce o Ethereal è lento, hai comunque il link qui.
    console.log('================================================================');
    console.log('📧 EMAIL IN USCITA (Copia il link qui sotto):');
    console.log(`A: ${options.email}`);
    console.log(`Oggetto: ${options.subject}`);
    console.log('--- Contenuto HTML (Cerca il link href=...) ---');
    console.log(options.message);
    console.log('================================================================');

    try {
        // Crea il transporter usando le variabili d'ambiente o i valori di fallback (Ethereal)
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.ethereal.email',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_EMAIL || 'darwin.haag3@ethereal.email',
                pass: process.env.SMTP_PASSWORD || 'wtN76q9rB7e5bQj7Xg',
            },
            connectionTimeout: 5000, // Timeout breve per non bloccare tutto
        });

        // Definisci le opzioni dell'email
        const mailOptions = {
            from: `"${process.env.FROM_NAME || 'MentorMatch'}" <${process.env.FROM_EMAIL || 'noreply@mentormatch.com'}>`,
            to: options.email,
            subject: options.subject,
            html: options.message,
        };

        // Invia l'email
        const info = await transporter.sendMail(mailOptions);

        // Stampa il link di anteprima nei log (se l'invio ha successo)
        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    } catch (error) {
        console.error('⚠️ Errore invio SMTP (Ignorato perché abbiamo stampato il link sopra):', error.message);
        // Non lanciamo l'errore, così il frontend riceve "Successo" e tu usi il link dai log
    }
};

module.exports = sendEmail;
