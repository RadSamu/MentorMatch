const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    try {
        // Crea il transporter usando le variabili d'ambiente o i valori di fallback (Ethereal)
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.ethereal.email',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_EMAIL || 'green5@ethereal.email',
                pass: process.env.SMTP_PASSWORD || 'j8UqCppGtXVcz4Nx17',
            },
            connectionTimeout: 10000, // 10 secondi per evitare timeout su reti lente
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
        console.error('⚠️ Errore invio email:', error.message);
        // Non lanciamo l'errore per non far crashare il frontend, ma lo logghiamo chiaramente
    }
};

module.exports = sendEmail;
