const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. Crea un transporter usando le credenziali dal file .env
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    // 2. Definisci le opzioni dell'email
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: options.email,
        subject: options.subject,
        html: options.message,
    };

    // 3. Invia l'email
    const info = await transporter.sendMail(mailOptions);

    if (process.env.NODE_ENV !== 'test') {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
};

module.exports = sendEmail;
