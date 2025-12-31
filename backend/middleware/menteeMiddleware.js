module.exports = function (req, res, next) {
  // Questo middleware viene eseguito DOPO authMiddleware,
  // quindi abbiamo già accesso a req.user
  if (req.user && req.user.role === 'mentee') {
    next(); // L'utente è un mentee, può procedere
  } else {
    res.status(403).json({ msg: 'Accesso negato. Risorsa riservata ai mentee.' });
  }
};