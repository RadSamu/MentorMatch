const pool = require('../config/db');

exports.getDashboardStats = async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        if (userRole === 'mentor') {
            // --- STATS FOR MENTOR ---
            const upcomingBookingsQuery = pool.query(
                "SELECT COUNT(*) FROM bookings WHERE mentor_id = $1 AND status = 'confirmed' AND slot_id IN (SELECT id FROM availabilities WHERE start_ts > NOW())",
                [userId]
            );

            const ratingQuery = pool.query(
                "SELECT rating_avg, rating_count FROM mentor_profiles WHERE id = $1",
                [userId]
            );
            
            const recentReviewsQuery = pool.query(
                `SELECT r.rating, r.comment, u.name as mentee_name 
                 FROM reviews r
                 JOIN users u ON r.mentee_id = u.id
                 WHERE r.mentor_id = $1 
                 ORDER BY r.created_at DESC 
                 LIMIT 2`,
                [userId]
            );

            const [
                upcomingBookingsResult,
                ratingResult,
                recentReviewsResult
            ] = await Promise.all([upcomingBookingsQuery, ratingQuery, recentReviewsQuery]);

            res.json({
                upcomingBookings: parseInt(upcomingBookingsResult.rows[0].count, 10),
                averageRating: parseFloat(ratingResult.rows[0]?.rating_avg || 0).toFixed(1),
                ratingCount: parseInt(ratingResult.rows[0]?.rating_count || 0, 10),
                recentReviews: recentReviewsResult.rows
            });

        } else { // mentee
            // --- STATS FOR MENTEE ---
            const nextBookingQuery = pool.query(
                `SELECT b.id, b.status, b.price, a.start_ts, u.name as mentor_name, u.avatar_url as mentor_avatar
                 FROM bookings b
                 JOIN availabilities a ON b.slot_id = a.id
                 JOIN users u ON b.mentor_id = u.id
                 WHERE b.mentee_id = $1 AND b.status IN ('confirmed', 'pending') AND a.start_ts > NOW()
                 ORDER BY a.start_ts ASC
                 LIMIT 1`,
                [userId]
            );

            const [nextBookingResult] = await Promise.all([nextBookingQuery]);

            res.json({
                nextBooking: nextBookingResult.rows[0] || null
            });
        }
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') console.error('Error fetching dashboard stats:', err.message);
        res.status(500).send('Errore del Server');
    }
};