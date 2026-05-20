const express = require('express');
const XLSX = require('xlsx');
const path = require('path');
const pool = require('../config/database');
const { authenticateToken, requireRole, logAudit } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

function generateDeviceKey(serialNo, computerName) {
  if (serialNo && serialNo.toString().trim() !== '') {
    return serialNo.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  if (computerName && computerName.toString().trim() !== '') {
    return computerName.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  return null;
}

function parseFilename(filename) {
  const match = filename.match(/^(\d{4})_(\d{2})_(\w+)_Inventory\.(xlsx|xls)$/i);
  if (!match) return null;
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10),
    toolName: match[3],
  };
}

// POST /api/upload
router.post(
  '/',
  authenticateToken,
  requireRole('super_admin', 'national_lead', 'regional_manager'),
  upload.single('file'),
  async (req, res) => {
    const client = await pool.connect();
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const parsed = parseFilename(req.file.originalname);
      const toolName = req.body.toolName || (parsed && parsed.toolName);
      const month = parseInt(req.body.month, 10) || (parsed && parsed.month);
      const year = parseInt(req.body.year, 10) || (parsed && parsed.year);

      if (!toolName || !month || !year) {
        return res.status(400).json({
          error:
            'Tool name, month, and year are required. Use filename format: YYYY_MM_TOOL_Inventory.xlsx or provide in request body.',
        });
      }

      const validTools = ['Cube', 'AD', 'DC', 'KES', 'DLP'];
      if (!validTools.includes(toolName)) {
        return res.status(400).json({
          error: `Invalid tool name. Must be one of: ${validTools.join(', ')}`,
        });
      }

      await client.query('BEGIN');

      const uploadResult = await client.query(
        `INSERT INTO uploads (filename, original_name, tool_name, month, year, file_size, uploaded_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing')
         RETURNING id`,
        [req.file.filename, req.file.originalname, toolName, month, year, req.file.size, req.user.id]
      );
      const uploadId = uploadResult.rows[0].id;

      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      let rowCount = 0;
      let duplicateCount = 0;
      const seenKeys = new Set();

      for (const row of data) {
        const serialNo = row['Serial Number'] || row['SerialNumber'] || row['serial_number'] || '';
        const computerName =
          row['Computer Name'] || row['ComputerName'] || row['computer_name'] || '';
        const deviceKey = generateDeviceKey(serialNo, computerName);

        if (!deviceKey) continue;

        if (seenKeys.has(deviceKey)) {
          duplicateCount++;
          continue;
        }
        seenKeys.add(deviceKey);

        const osType = row['OS Type'] || row['OSType'] || row['os_type'] || row['OS'] || '';
        const osVersion =
          row['OS Version'] || row['OSVersion'] || row['os_version'] || '';
        const region = row['Region'] || row['region'] || '';
        const department = row['Department'] || row['department'] || '';
        const ipAddress = row['IP Address'] || row['IPAddress'] || row['ip_address'] || '';
        const macAddress = row['MAC Address'] || row['MACAddress'] || row['mac_address'] || '';
        const lastUser =
          row['Last Logged User'] || row['LastLoggedUser'] || row['last_logged_user'] || '';

        // Upsert device
        await client.query(
          `INSERT INTO devices (device_key, computer_name, serial_number, os_type, os_version, region, department, last_seen)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT (device_key) DO UPDATE SET
             computer_name = COALESCE(EXCLUDED.computer_name, devices.computer_name),
             serial_number = COALESCE(EXCLUDED.serial_number, devices.serial_number),
             os_type = COALESCE(EXCLUDED.os_type, devices.os_type),
             os_version = COALESCE(EXCLUDED.os_version, devices.os_version),
             region = COALESCE(EXCLUDED.region, devices.region),
             last_seen = NOW(),
             updated_at = NOW()`,
          [
            deviceKey,
            computerName.toString().trim(),
            serialNo.toString().trim(),
            osType.toString().trim(),
            osVersion.toString().trim(),
            region.toString().trim(),
            department.toString().trim(),
          ]
        );

        // Insert inventory
        await client.query(
          `INSERT INTO inventories (upload_id, tool_name, device_key, computer_name, serial_number,
                                    os_type, os_version, region, department, ip_address, mac_address,
                                    last_logged_user, month, year, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            uploadId,
            toolName,
            deviceKey,
            computerName.toString().trim(),
            serialNo.toString().trim(),
            osType.toString().trim(),
            osVersion.toString().trim(),
            region.toString().trim(),
            department.toString().trim(),
            ipAddress.toString().trim(),
            macAddress.toString().trim(),
            lastUser.toString().trim(),
            month,
            year,
            req.user.id,
          ]
        );

        // Upsert device mapping
        const deviceRes = await client.query(
          'SELECT id FROM devices WHERE device_key = $1',
          [deviceKey]
        );
        if (deviceRes.rows.length > 0) {
          await client.query(
            `INSERT INTO device_mapping (device_id, device_key, tool_name, month, year)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (device_key, tool_name, month, year) DO NOTHING`,
            [deviceRes.rows[0].id, deviceKey, toolName, month, year]
          );
        }

        rowCount++;
      }

      // Update upload status
      await client.query(
        `UPDATE uploads SET row_count = $1, duplicate_count = $2, status = 'completed', completed_at = NOW()
         WHERE id = $3`,
        [rowCount, duplicateCount, uploadId]
      );

      await client.query('COMMIT');

      // Trigger compliance calculation
      await calculateCompliance(toolName, month, year);

      await logAudit(
        req.user.id,
        'UPLOAD',
        'upload',
        uploadId,
        { toolName, month, year, rowCount, duplicateCount },
        req
      );

      res.json({
        message: 'File uploaded and processed successfully',
        uploadId,
        rowCount,
        duplicateCount,
        toolName,
        month,
        year,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Failed to process upload: ' + err.message });
    } finally {
      client.release();
    }
  }
);

// GET /api/upload/history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.*, us.first_name, us.last_name, us.email as uploader_email
       FROM uploads u
       LEFT JOIN users us ON u.uploaded_by = us.id
       ORDER BY u.created_at DESC
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Upload history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/upload/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM uploads WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Upload not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Upload detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function calculateCompliance(toolName, month, year) {
  const tools = ['Cube', 'AD', 'DC', 'KES', 'DLP'];
  const regions = await pool.query(
    'SELECT DISTINCT region FROM inventories WHERE month = $1 AND year = $2 AND region IS NOT NULL AND region != \'\'',
    [month, year]
  );

  const allRegions = regions.rows.map((r) => r.region);
  allRegions.push(null); // null = all regions

  for (const baselineTool of tools) {
    for (const comparisonTool of tools) {
      if (baselineTool === comparisonTool) continue;

      for (const region of allRegions) {
        const regionFilter = region
          ? 'AND region = $3'
          : 'AND (region IS NOT NULL OR region IS NULL)';
        const params = region ? [baselineTool, month, year, region] : [baselineTool, month, year];

        const baselineQuery = await pool.query(
          `SELECT COUNT(DISTINCT device_key) as total
           FROM inventories
           WHERE tool_name = $1 AND month = $2 AND year = $${region ? 4 : 3 + 1}
           ${region ? 'AND region = $3' : ''}`.replace(
            `$${region ? 4 : 3 + 1}`,
            region ? `$4` : `$3`
          ),
          region ? [baselineTool, month, year, region] : [baselineTool, month, year]
        );

        // Simplified query for baseline total
        const baselineTotal = parseInt(baselineQuery.rows[0]?.total || '0', 10);

        if (baselineTotal === 0) continue;

        const compParams = region
          ? [baselineTool, comparisonTool, month, year, region]
          : [baselineTool, comparisonTool, month, year];

        const foundQuery = await pool.query(
          `SELECT COUNT(DISTINCT i1.device_key) as found
           FROM inventories i1
           INNER JOIN inventories i2 ON i1.device_key = i2.device_key
           WHERE i1.tool_name = $1 AND i2.tool_name = $2
             AND i1.month = $3 AND i1.year = $4
             AND i2.month = $3 AND i2.year = $4
             ${region ? 'AND i1.region = $5' : ''}`,
          compParams
        );

        const foundCount = parseInt(foundQuery.rows[0]?.found || '0', 10);
        const missingCount = baselineTotal - foundCount;
        const compliancePercentage =
          baselineTotal > 0 ? ((foundCount / baselineTotal) * 100).toFixed(2) : 0;

        await pool.query(
          `INSERT INTO compliance_results
           (baseline_tool, comparison_tool, region, month, year, baseline_total, found_count, missing_count, compliance_percentage)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (baseline_tool, comparison_tool, region, month, year)
           DO UPDATE SET
             baseline_total = EXCLUDED.baseline_total,
             found_count = EXCLUDED.found_count,
             missing_count = EXCLUDED.missing_count,
             compliance_percentage = EXCLUDED.compliance_percentage,
             calculated_at = NOW()`,
          [
            baselineTool,
            comparisonTool,
            region,
            month,
            year,
            baselineTotal,
            foundCount,
            missingCount,
            compliancePercentage,
          ]
        );

        // Generate alerts for low compliance
        if (parseFloat(compliancePercentage) < 60) {
          await pool.query(
            `INSERT INTO alerts (alert_type, severity, title, message, region, metadata)
             VALUES ('compliance', 'critical', $1, $2, $3, $4)`,
            [
              `Critical: ${baselineTool} vs ${comparisonTool} compliance below 60%`,
              `Compliance for ${baselineTool} baseline against ${comparisonTool} is at ${compliancePercentage}% ${region ? `in ${region}` : 'overall'}`,
              region,
              JSON.stringify({ baselineTool, comparisonTool, compliancePercentage, month, year }),
            ]
          );
        } else if (parseFloat(compliancePercentage) < 75) {
          await pool.query(
            `INSERT INTO alerts (alert_type, severity, title, message, region, metadata)
             VALUES ('compliance', 'warning', $1, $2, $3, $4)`,
            [
              `Warning: ${baselineTool} vs ${comparisonTool} compliance below 75%`,
              `Compliance for ${baselineTool} baseline against ${comparisonTool} is at ${compliancePercentage}% ${region ? `in ${region}` : 'overall'}`,
              region,
              JSON.stringify({ baselineTool, comparisonTool, compliancePercentage, month, year }),
            ]
          );
        }
      }
    }
  }
}

module.exports = router;
