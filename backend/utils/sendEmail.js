const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    console.log('[DEBUG] sendEmail() chiamato. Generazione account Ethereal...');
    // Genera un account di test su Ethereal (Fake SMTP)
    const testAccount = await nodemailer.createTestAccount();

    // Crea il transporter usando Ethereal
    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    });

    // Definisci le opzioni dell'email
    const mailOptions = {
        from: '"MentorMatch" <noreply@mentormatch.com>',
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
