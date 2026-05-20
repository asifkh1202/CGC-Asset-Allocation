const express = require('express');
const pool = require('../config/database');
const { authenticateToken, applyRegionFilter } = require('../middleware/auth');

const router = express.Router();

// GET /api/devices/search
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q, region, os, tool, page = 1, limit = 25 } = req.query;
    const regionFilter = applyRegionFilter(req);
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = `
      SELECT d.*, 
        ARRAY_AGG(DISTINCT dm.tool_name) FILTER (WHERE dm.tool_name IS NOT NULL) as tools
      FROM devices d
      LEFT JOIN device_mapping dm ON d.id = dm.device_id
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (q) {
      query += ` AND (d.device_key ILIKE $${paramIdx} OR d.computer_name ILIKE $${paramIdx} OR d.serial_number ILIKE $${paramIdx})`;
      params.push(`%${q}%`);
      paramIdx++;
    }

    const effectiveRegion = regionFilter || region;
    if (effectiveRegion) {
      query += ` AND d.region = $${paramIdx}`;
      params.push(effectiveRegion);
      paramIdx++;
    }

    if (os) {
      query += ` AND d.os_type ILIKE $${paramIdx}`;
      params.push(`%${os}%`);
      paramIdx++;
    }

    query += ` GROUP BY d.id`;

    if (tool) {
      query += ` HAVING $${paramIdx} = ANY(ARRAY_AGG(dm.tool_name))`;
      params.push(tool);
      paramIdx++;
    }

    const countQuery = `SELECT COUNT(*) FROM (${query}) as filtered`;
    const countResult = await pool.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0]?.count || '0', 10);

    query += ` ORDER BY d.computer_name LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(parseInt(limit, 10), offset);

    const result = await pool.query(query, params);

    res.json({
      devices: result.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit, 10)),
      },
    });
  } catch (err) {
    console.error('Device search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/devices/:deviceKey
router.get('/:deviceKey', authenticateToken, async (req, res) => {
  try {
    const { deviceKey } = req.params;

    const device = await pool.query(
      'SELECT * FROM devices WHERE device_key = $1',
      [deviceKey.toUpperCase()]
    );

    if (device.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const inventories = await pool.query(
      `SELECT tool_name, month, year, os_type, os_version, region, ip_address, mac_address, created_at
       FROM inventories
       WHERE device_key = $1
       ORDER BY year DESC, month DESC, tool_name`,
      [deviceKey.toUpperCase()]
    );

    const mappings = await pool.query(
      `SELECT tool_name, month, year
       FROM device_mapping
       WHERE device_key = $1
       ORDER BY year DESC, month DESC`,
      [deviceKey.toUpperCase()]
    );

    res.json({
      device: device.rows[0],
      inventories: inventories.rows,
      toolMappings: mappings.rows,
    });
  } catch (err) {
    console.error('Device detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/devices/:deviceKey/history
router.get('/:deviceKey/history', authenticateToken, async (req, res) => {
  try {
    const { deviceKey } = req.params;

    const history = await pool.query(
      `SELECT i.tool_name, i.month, i.year, i.os_type, i.os_version, 
              i.region, i.ip_address, i.created_at,
              u.original_name as upload_file
       FROM inventories i
       LEFT JOIN uploads u ON i.upload_id = u.id
       WHERE i.device_key = $1
       ORDER BY i.year DESC, i.month DESC, i.tool_name`,
      [deviceKey.toUpperCase()]
    );

    res.json(history.rows);
  } catch (err) {
    console.error('Device history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
