const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');

const sendEmail = async (options) => {
    console.log('[DEBUG] sendEmail() avviato.');

    // Preferisci SendGrid se SENDGRID_API_KEY è disponibile (HTTPS, non bloccato su Render)
    const sendgridKey = process.env.SENDGRID_API_KEY;
    if (sendgridKey) {
        try {
            sgMail.setApiKey(sendgridKey);
            const msg = {
                to: options.email,
                from: `${process.env.FROM_NAME || 'MentorMatch'} <${process.env.FROM_EMAIL || 'noreply@mentormatch.com'}>`,
                subject: options.subject,
                html: options.message,
            };
            console.log(`[DEBUG] Tentativo invio via SendGrid a ${options.email}...`);
            const [response] = await sgMail.send(msg);
            console.log('[DEBUG] Email SendGrid inviata con successo. Status:', response && response.statusCode);
            return;
        } catch (error) {
            console.error('[ERROR] SendGrid fallito:', error && error.message ? error.message : error);
            // Fallback a SMTP se SendGrid non disponibile
        }
    }

    // Fallback: tenta SMTP (utile per sviluppo locale)
    let transporter;
    console.log('[DEBUG] Tentativo invio via SMTP...');
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
        
        // Fallback: logga email su file se sia SendGrid che SMTP falliscono
        try {
            const timestamp = new Date().toISOString();
            const logEntry = `
[${timestamp}]
To: ${options.email}
Subject: ${options.subject}
Message: ${options.message}
---
`;
            const logFile = path.join(__dirname, '..', 'email_logs.txt');
            fs.appendFileSync(logFile, logEntry);
            console.log(`[INFO] Email loggata su file: ${logFile}`);
        } catch (logErr) {
            console.error('[ERROR] Impossibile loggare email su file:', logErr.message);
        }
    }
};

module.exports = sendEmail;
