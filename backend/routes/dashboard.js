const express = require('express');
const pool = require('../config/database');
const { authenticateToken, applyRegionFilter } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const regionFilter = applyRegionFilter(req);
    const regionClause = regionFilter ? 'WHERE region = $1' : '';
    const params = regionFilter ? [regionFilter] : [];

    const totalDevices = await pool.query(
      `SELECT COUNT(DISTINCT device_key) as total FROM devices ${regionClause}`,
      params
    );

    const toolCounts = await pool.query(
      `SELECT tool_name, COUNT(DISTINCT device_key) as count
       FROM inventories
       ${regionClause ? regionClause.replace('WHERE', 'WHERE') : ''}
       GROUP BY tool_name`,
      params
    );

    const latestCompliance = await pool.query(
      `SELECT baseline_tool, comparison_tool, compliance_percentage, region, month, year
       FROM compliance_results
       ${regionClause ? regionClause.replace('region', 'region') : ''}
       ORDER BY year DESC, month DESC
       LIMIT 20`,
      params
    );

    const recentUploads = await pool.query(
      `SELECT tool_name, month, year, row_count, status, created_at
       FROM uploads
       ORDER BY created_at DESC
       LIMIT 5`
    );

    const activeAlerts = await pool.query(
      `SELECT COUNT(*) as count, severity
       FROM alerts
       WHERE is_acknowledged = false
       ${regionFilter ? 'AND region = $1' : ''}
       GROUP BY severity`,
      regionFilter ? [regionFilter] : []
    );

    res.json({
      totalDevices: parseInt(totalDevices.rows[0]?.total || '0', 10),
      toolCounts: toolCounts.rows,
      latestCompliance: latestCompliance.rows,
      recentUploads: recentUploads.rows,
      activeAlerts: activeAlerts.rows,
    });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dashboard/compliance/:baseline
router.get('/compliance/:baseline', authenticateToken, async (req, res) => {
  try {
    const { baseline } = req.params;
    const { month, year } = req.query;
    const regionFilter = applyRegionFilter(req);

    const validTools = ['Cube', 'AD', 'DC', 'KES', 'DLP'];
    if (!validTools.includes(baseline)) {
      return res.status(400).json({ error: 'Invalid baseline tool' });
    }

    let query = `
      SELECT cr.*, 
        (SELECT COUNT(DISTINCT device_key) FROM inventories 
         WHERE tool_name = cr.baseline_tool AND month = cr.month AND year = cr.year) as baseline_device_count
      FROM compliance_results cr
      WHERE cr.baseline_tool = $1
    `;
    const params = [baseline];
    let paramIdx = 2;

    if (month) {
      query += ` AND cr.month = $${paramIdx}`;
      params.push(parseInt(month, 10));
      paramIdx++;
    }
    if (year) {
      query += ` AND cr.year = $${paramIdx}`;
      params.push(parseInt(year, 10));
      paramIdx++;
    }
    if (regionFilter) {
      query += ` AND cr.region = $${paramIdx}`;
      params.push(regionFilter);
      paramIdx++;
    }

    query += ' ORDER BY cr.year DESC, cr.month DESC, cr.comparison_tool';

    const result = await pool.query(query, params);

    // Get regional breakdown
    const regionBreakdown = await pool.query(
      `SELECT region, COUNT(DISTINCT device_key) as count
       FROM inventories
       WHERE tool_name = $1
       ${month ? 'AND month = $2' : ''}
       ${year ? `AND year = $${month ? 3 : 2}` : ''}
       AND region IS NOT NULL AND region != ''
       GROUP BY region
       ORDER BY count DESC`,
      month && year ? [baseline, parseInt(month, 10), parseInt(year, 10)]
        : month ? [baseline, parseInt(month, 10)]
        : year ? [baseline, parseInt(year, 10)]
        : [baseline]
    );

    // Get OS breakdown
    const osBreakdown = await pool.query(
      `SELECT 
         CASE WHEN LOWER(os_type) LIKE '%windows%' THEN 'Windows' ELSE 'Other' END as os_category,
         COUNT(DISTINCT device_key) as count
       FROM inventories
       WHERE tool_name = $1
       ${month ? 'AND month = $2' : ''}
       ${year ? `AND year = $${month ? 3 : 2}` : ''}
       GROUP BY os_category`,
      month && year ? [baseline, parseInt(month, 10), parseInt(year, 10)]
        : month ? [baseline, parseInt(month, 10)]
        : year ? [baseline, parseInt(year, 10)]
        : [baseline]
    );

    res.json({
      baseline,
      complianceData: result.rows,
      regionBreakdown: regionBreakdown.rows,
      osBreakdown: osBreakdown.rows,
    });
  } catch (err) {
    console.error('Compliance data error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dashboard/trends
router.get('/trends', authenticateToken, async (req, res) => {
  try {
    const { baseline, months = 6 } = req.query;
    const regionFilter = applyRegionFilter(req);

    let query = `
      SELECT baseline_tool, comparison_tool, month, year,
             AVG(compliance_percentage) as avg_compliance,
             SUM(baseline_total) as total_baseline,
             SUM(found_count) as total_found
      FROM compliance_results
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (baseline) {
      query += ` AND baseline_tool = $${paramIdx}`;
      params.push(baseline);
      paramIdx++;
    }
    if (regionFilter) {
      query += ` AND region = $${paramIdx}`;
      params.push(regionFilter);
      paramIdx++;
    }

    query += `
      GROUP BY baseline_tool, comparison_tool, month, year
      ORDER BY year DESC, month DESC
      LIMIT $${paramIdx}
    `;
    params.push(parseInt(months, 10) * 20);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Trends error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dashboard/matrix
router.get('/matrix', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const regionFilter = applyRegionFilter(req);

    let query = `
      SELECT baseline_tool, comparison_tool, compliance_percentage, region
      FROM compliance_results
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (month) {
      query += ` AND month = $${paramIdx}`;
      params.push(parseInt(month, 10));
      paramIdx++;
    }
    if (year) {
      query += ` AND year = $${paramIdx}`;
      params.push(parseInt(year, 10));
      paramIdx++;
    }
    if (regionFilter) {
      query += ` AND region = $${paramIdx}`;
      params.push(regionFilter);
      paramIdx++;
    }

    query += ' ORDER BY baseline_tool, comparison_tool';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Matrix error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
