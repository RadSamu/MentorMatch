const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    let transporter;
    console.log('[DEBUG] sendEmail() avviato.');

    // Configurazione: Usa variabili d'ambiente o i valori di Ethereal specifici (green5)
    const smtpHost = process.env.SMTP_HOST || 'smtp.ethereal.email';
    const smtpPort = process.env.SMTP_PORT || 587;
    const smtpUser = process.env.SMTP_EMAIL || 'green5@ethereal.email';
    const smtpPass = process.env.SMTP_PASSWORD || 'j8UqCppGtXVcz4Nx17';

    try {
        transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: false,
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
            family: 4, // FIX: Forza l'uso di IPv4 per evitare blocchi/timeout di rete su Render
            connectionTimeout: 20000, // Aumentiamo a 20 secondi per connessioni lente
            greetingTimeout: 20000
        });

        // 3. Definisci le opzioni dell'email
        const mailOptions = {
            from: `"${process.env.FROM_NAME || 'MentorMatch'}" <${process.env.FROM_EMAIL || 'noreply@mentormatch.com'}>`,
            to: options.email,
            subject: options.subject,
            html: options.message,
        };

        // 4. Invia l'email
        console.log(`[DEBUG] Tentativo invio email a ${options.email} tramite ${smtpHost}...`);
        const info = await transporter.sendMail(mailOptions);

        // 5. Stampa il link di anteprima
        console.log('Message sent: %s', info.messageId);
        
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log('Preview URL: %s', previewUrl);
        }
    } catch (error) {
        console.error('[ERROR] Invio email fallito:', error.message);
    }
};

module.exports = sendEmail;
