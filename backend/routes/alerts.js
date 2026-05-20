const express = require('express');
const pool = require('../config/database');
const { authenticateToken, applyRegionFilter, logAudit } = require('../middleware/auth');

const router = express.Router();

// GET /api/alerts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { severity, acknowledged, page = 1, limit = 25 } = req.query;
    const regionFilter = applyRegionFilter(req);
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = 'SELECT * FROM alerts WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    if (regionFilter) {
      query += ` AND (region = $${paramIdx} OR region IS NULL)`;
      params.push(regionFilter);
      paramIdx++;
    }

    if (severity) {
      query += ` AND severity = $${paramIdx}`;
      params.push(severity);
      paramIdx++;
    }

    if (acknowledged !== undefined) {
      query += ` AND is_acknowledged = $${paramIdx}`;
      params.push(acknowledged === 'true');
      paramIdx++;
    }

    const countResult = await pool.query(
      query.replace('SELECT *', 'SELECT COUNT(*)'),
      params
    );

    query += ` ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(parseInt(limit, 10), offset);

    const result = await pool.query(query, params);

    res.json({
      alerts: result.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: parseInt(countResult.rows[0]?.count || '0', 10),
        pages: Math.ceil(parseInt(countResult.rows[0]?.count || '0', 10) / parseInt(limit, 10)),
      },
    });
  } catch (err) {
    console.error('Alerts error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/alerts/:id/acknowledge
router.put('/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE alerts
       SET is_acknowledged = true, acknowledged_by = $1, acknowledged_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [req.user.id, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    await logAudit(req.user.id, 'ACKNOWLEDGE_ALERT', 'alert', req.params.id, {}, req);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Acknowledge alert error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/alerts/stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const regionFilter = applyRegionFilter(req);
    const regionClause = regionFilter ? 'AND (region = $1 OR region IS NULL)' : '';
    const params = regionFilter ? [regionFilter] : [];

    const stats = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE is_acknowledged = false) as unacknowledged,
         COUNT(*) FILTER (WHERE severity = 'critical' AND is_acknowledged = false) as critical,
         COUNT(*) FILTER (WHERE severity = 'warning' AND is_acknowledged = false) as warning,
         COUNT(*) FILTER (WHERE severity = 'info' AND is_acknowledged = false) as info,
         COUNT(*) as total
       FROM alerts
       WHERE 1=1 ${regionClause}`,
      params
    );

    res.json(stats.rows[0]);
  } catch (err) {
    console.error('Alert stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
