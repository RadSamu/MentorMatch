const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    let transporter;

    // LOGICA IBRIDA:
    // Se abbiamo le credenziali SMTP nelle variabili d'ambiente (es. su Render), usiamo quelle.
    // Altrimenti, usiamo Ethereal per i test locali.
    if (process.env.SMTP_HOST && process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: false, // true per 465, false per altre porte
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD,
            },
        });
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
    const mailOptions = {
        from: `${process.env.FROM_NAME || 'MentorMatch'} <${process.env.FROM_EMAIL || 'noreply@mentormatch.com'}>`,
        to: options.email,
        subject: options.subject,
        html: options.message,
    };

    // 3. Invia l'email
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
