const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    getConversations,
    getMessagesWithUser,
    sendMessage
} = require('../controllers/messageController');

// Tutte le rotte sono protette
router.use(authMiddleware);

router.get('/conversations', getConversations);
router.get('/:otherUserId', getMessagesWithUser);
router.post('/:receiverId', sendMessage);

module.exports = router;