const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // 1. Ottieni il token dall'header della richiesta
  const authHeader = req.header('Authorization');

  // 2. Controlla se l'header 'Authorization' esiste e se è nel formato corretto ('Bearer TOKEN')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'Nessun token, autorizzazione negata.' });
  }

  try {
    // Estrai il token rimuovendo "Bearer "
    const token = authHeader.split(' ')[1];

    // 3. Verifica il token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Se il token è valido, aggiungi i dati dell'utente (il "payload") alla richiesta.
    // In questo modo, le rotte successive potranno sapere chi è l'utente che ha fatto la richiesta.
    req.user = decoded.user;

    // 5. Passa il controllo alla prossima funzione (la logica della rotta effettiva)
    next();
  } catch (err) {
    // Se il token non è valido (es. scaduto o manomesso)
    res.status(401).json({ msg: 'Token non valido.' });
  }
};