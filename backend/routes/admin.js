const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { authenticateToken, requireRole, logAudit } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/audit-logs
router.get(
  '/audit-logs',
  authenticateToken,
  requireRole('super_admin', 'auditor'),
  async (req, res) => {
    try {
      const { action, userId, page = 1, limit = 50 } = req.query;
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      let query = `
        SELECT al.*, u.email as user_email, u.first_name, u.last_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `;
      const params = [];
      let paramIdx = 1;

      if (action) {
        query += ` AND al.action = $${paramIdx}`;
        params.push(action);
        paramIdx++;
      }

      if (userId) {
        query += ` AND al.user_id = $${paramIdx}`;
        params.push(userId);
        paramIdx++;
      }

      const countResult = await pool.query(
        query.replace('SELECT al.*, u.email as user_email, u.first_name, u.last_name', 'SELECT COUNT(*)'),
        params
      );

      query += ` ORDER BY al.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
      params.push(parseInt(limit, 10), offset);

      const result = await pool.query(query, params);

      res.json({
        logs: result.rows,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: parseInt(countResult.rows[0]?.count || '0', 10),
          pages: Math.ceil(
            parseInt(countResult.rows[0]?.count || '0', 10) / parseInt(limit, 10)
          ),
        },
      });
    } catch (err) {
      console.error('Audit logs error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/admin/users
router.get(
  '/users',
  authenticateToken,
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, email, first_name, last_name, role, region, department, 
                is_active, last_login, created_at
         FROM users
         ORDER BY created_at DESC`
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Users list error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/admin/users/:id
router.put(
  '/users/:id',
  authenticateToken,
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const { role, region, department, isActive } = req.body;

      const result = await pool.query(
        `UPDATE users
         SET role = COALESCE($1, role),
             region = COALESCE($2, region),
             department = COALESCE($3, department),
             is_active = COALESCE($4, is_active),
             updated_at = NOW()
         WHERE id = $5
         RETURNING id, email, first_name, last_name, role, region, department, is_active`,
        [role, region, department, isActive, req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      await logAudit(
        req.user.id,
        'UPDATE_USER',
        'user',
        req.params.id,
        { role, region, department, isActive },
        req
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Update user error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/admin/users/:id
router.delete(
  '/users/:id',
  authenticateToken,
  requireRole('super_admin'),
  async (req, res) => {
    try {
      const result = await pool.query(
        `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      await logAudit(req.user.id, 'DEACTIVATE_USER', 'user', req.params.id, {}, req);

      res.json({ message: 'User deactivated successfully' });
    } catch (err) {
      console.error('Delete user error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/admin/settings
router.get(
  '/settings',
  authenticateToken,
  requireRole('super_admin'),
  async (req, res) => {
    try {
      res.json({
        complianceThresholds: {
          green: 90,
          amber: 75,
          orange: 60,
          red: 0,
        },
        tools: ['Cube', 'AD', 'DC', 'KES', 'DLP'],
        regions: ['North', 'South', 'East', 'West', 'Central'],
        fileUpload: {
          maxSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
          allowedTypes: ['.xlsx', '.xls'],
        },
      });
    } catch (err) {
      console.error('Settings error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/admin/stats
router.get(
  '/stats',
  authenticateToken,
  requireRole('super_admin', 'national_lead'),
  async (req, res) => {
    try {
      const userCount = await pool.query(
        'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM users'
      );
      const deviceCount = await pool.query(
        'SELECT COUNT(*) as total FROM devices WHERE is_active = true'
      );
      const uploadCount = await pool.query(
        "SELECT COUNT(*) as total FROM uploads WHERE status = 'completed'"
      );
      const alertCount = await pool.query(
        'SELECT COUNT(*) as total FROM alerts WHERE is_acknowledged = false'
      );

      res.json({
        users: userCount.rows[0],
        devices: deviceCount.rows[0],
        uploads: uploadCount.rows[0],
        alerts: alertCount.rows[0],
      });
    } catch (err) {
      console.error('Admin stats error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
