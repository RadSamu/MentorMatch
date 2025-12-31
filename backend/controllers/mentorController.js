const pool = require('../config/db');

/**
 * @desc    Ottiene la lista di tutti i mentor
 * @route   GET /api/mentors
 * @access  Pubblico
 */
exports.getAllMentors = async (req, res) => {
    const { search, sector, language, min_rating, page = 1, limit = 9 } = req.query;
    const offset = (page - 1) * limit;

    try {
        // Costruiamo la clausola WHERE per la ricerca
        let whereConditions = [];
        const queryParams = [];
        let paramIndex = 1;

        if (search) {
            whereConditions.push(`(mp.name ILIKE $${paramIndex} OR mp.surname ILIKE $${paramIndex} OR mp.bio ILIKE $${paramIndex})`);
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        if (sector) {
            whereConditions.push(`sector = $${paramIndex}`);
            queryParams.push(sector);
            paramIndex++;
        }

        if (language) {
            whereConditions.push(`mp.languages ILIKE $${paramIndex}`);
            queryParams.push(`%${language}%`);
            paramIndex++;
        }

        if (min_rating) {
            whereConditions.push(`mp.rating_avg >= $${paramIndex}`);
            queryParams.push(min_rating);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Query per contare il totale degli elementi che corrispondono alla ricerca
        const totalQuery = `SELECT COUNT(*) FROM mentor_profiles mp ${whereClause}`;
        const totalResult = await pool.query(totalQuery, queryParams);
        const totalItems = parseInt(totalResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalItems / limit);

        // Query per ottenere i dati della pagina corrente
        const dataParams = [...queryParams];
        dataParams.push(limit, offset);
        const dataQuery = `
            SELECT mp.id, mp.name, mp.surname, mp.bio, mp.sector, mp.avatar_url, mp.languages, mp.rating_avg
            FROM mentor_profiles mp
            ${whereClause} 
            ORDER BY mp.name ASC 
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        const mentorsResult = await pool.query(dataQuery, dataParams);

        res.json({
            data: mentorsResult.rows,
            pagination: {
                totalItems,
                totalPages,
                currentPage: parseInt(page, 10)
            }
        });
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') console.error(err.message);
    res.status(500).send('Errore del Server');
  }
};

/**
 * @desc    Ottieni la lista di tutti i settori unici dei mentor
 * @route   GET /api/mentors/sectors
 * @access  Pubblico
 */
exports.getMentorSectors = async (req, res) => {
    try {
        const sectors = await pool.query(
            "SELECT DISTINCT sector FROM users WHERE role = 'mentor' AND sector IS NOT NULL AND sector <> '' ORDER BY sector ASC"
        );
        res.json(sectors.rows.map(row => row.sector));
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') console.error(err.message);
        res.status(500).send('Errore del Server');
    }
};

/**
 * @desc    Ottieni la lista di tutte le lingue uniche dei mentor
 * @route   GET /api/mentors/languages
 * @access  Pubblico
 */
exports.getMentorLanguages = async (req, res) => {
    try {
        // Questa query estrae tutte le lingue, le splitta, le pulisce e le rende uniche
        const result = await pool.query(
            "SELECT DISTINCT trim(unnest(languages)) as language FROM users WHERE role = 'mentor' AND languages IS NOT NULL AND array_length(languages, 1) > 0 ORDER BY language ASC"
        );
        res.json(result.rows.map(row => row.language));
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') console.error(err.message);
        res.status(500).send('Errore del Server');
    }
};

/**
 * @desc    Ottiene il profilo pubblico di un singolo mentor
 * @route   GET /api/mentors/:id
 * @access  Pubblico
 */
exports.getMentorById = async (req, res) => {
  try {
    const { id } = req.params;
    const mentor = await pool.query("SELECT * FROM mentor_profiles WHERE id = $1", [id]);

    if (mentor.rows.length === 0) {
      return res.status(404).json({ msg: 'Mentor non trovato' });
    }

    res.json(mentor.rows[0]);
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') console.error(err.message);
    res.status(500).send('Errore del Server');
  }
};