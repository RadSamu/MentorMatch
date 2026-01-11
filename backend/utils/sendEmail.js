const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    let transporter;

    // 1. Se ci sono variabili d'ambiente SMTP valide, usa quelle (Produzione)
    if (process.env.SMTP_HOST && process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD,
            },
        });
    } else {
        // 2. Altrimenti usa Ethereal con generazione DINAMICA (Sviluppo/Demo)
        // Crea un account fresco al volo per evitare errori di credenziali scadute
        const testAccount = await nodemailer.createTestAccount();
        
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
            connectionTimeout: 10000, // Timeout di sicurezza
        });
    }

    // 3. Definisci le opzioni dell'email
    const mailOptions = {
        from: `"${process.env.FROM_NAME || 'MentorMatch'}" <${process.env.FROM_EMAIL || 'noreply@mentormatch.com'}>`,
        to: options.email,
        subject: options.subject,
        html: options.message,
    };

    // 4. Invia l'email
    const info = await transporter.sendMail(mailOptions);

    // 5. Stampa il link di anteprima (Solo se siamo su Ethereal)
    console.log('Message sent: %s', info.messageId);
    
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
        console.log('Preview URL: %s', previewUrl);
    }
};

module.exports = sendEmail;
