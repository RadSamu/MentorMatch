const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Crea il transporter usando le variabili d'ambiente o i valori di fallback (Ethereal)
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_EMAIL || 'darwin.haag3@ethereal.email',
            pass: process.env.SMTP_PASSWORD || 'wtN76q9rB7e5bQj7Xg',
        },
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

    // Stampa il link di anteprima nei log (FONDAMENTALE per la demo)
    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
};

module.exports = sendEmail;
