const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Crea il transporter usando le variabili d'ambiente (dal file .env)
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    // Definisci le opzioni dell'email
    const mailOptions = {
        from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
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
