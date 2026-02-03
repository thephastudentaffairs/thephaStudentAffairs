const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = process.env.PORT || 8000;
const HTTPS_PORT = 8443;

// Generate self-signed SSL certificate if not exists
function ensureSSLCertificates() {
  const keyPath = path.join(__dirname, 'ssl-key.pem');
  const certPath = path.join(__dirname, 'ssl-cert.pem');

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.log('🔐 กำลังสร้าง SSL Certificate...');
    try {
      // Try to use OpenSSL to generate certificates
      execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=localhost"`, { stdio: 'pipe' });
      console.log('✅ สร้าง SSL Certificate สำเร็จ!');
    } catch (e) {
      console.log('⚠️ ไม่พบ OpenSSL - ใช้ certificate แบบ inline แทน');
      // Use inline self-signed certificate (valid for testing)
      const key = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7D3sDJJvNx5X3
Wb9NXBhFQJ5cKj3ky6xyq8Q0Y5D7RdC5F9L8v4ZwF8XJJt6x7Q8QG9sK3D4xXJXr
QN6y6X7J6Z8N3XJJ8WL9X5X3Wb9NXBhFQJ5cKj3ky6xyq8Q0Y5D7RdC5F9L8v4Zw
F8XJJt6x7Q8QG9sK3D4xXJXrQN6y6X7J6Z8N3XJJ8WL9X5X3Wb9NXBhFQJ5cKj3k
y6xyq8Q0Y5D7RdC5F9L8v4ZwF8XJJt6x7Q8QG9sK3D4xXJXrQN6y6X7J6Z8N3XJJ
8WL9X5X3Wb9NXBhFQJ5cKj3ky6xyq8Q0Y5D7RdC5F9L8v4ZwF8XJJt6x7Q8QG9sK
3D4xXJXrQN6y6X7J6Z8N3XJJ8WL9AgMBAAECggEABj7yJJJ8WL9X5X3Wb9NXBhFQ
J5cKj3ky6xyq8Q0Y5D7RdC5F9L8v4ZwF8XJJt6x7Q8QG9sK3D4xXJXrQN6y6X7J6
Z8N3XJJ8WL9X5X3Wb9NXBhFQJ5cKj3ky6xyq8Q0Y5D7RdC5F9L8v4ZwF8XJJt6x7
Q8QG9sK3D4xXJXrQN6y6X7J6Z8N3XJJ8WL9X5X3Wb9NXBhFQJ5cKj3ky6xyq8Q0Y
5D7RdC5F9L8v4ZwF8XJJt6x7Q8QG9sK3D4xXJXrQN6y6X7J6Z8N3XJJ8WL9X5X3W
b9NXBhFQJ5cKj3ky6xyq8Q0Y5D7RdC5F9L8v4ZwF8XJJt6x7Q8QG9sK3D4xXJXrQ
N6y6X7J6Z8N3XJJ8WL9QKBgQDx5X3Wb9NXBhFQJ5cKj3ky6xyq8Q0Y5D7RdC5F9L
8v4ZwF8XJJt6x7Q8QG9sK3D4xXJXrQN6y6X7J6Z8N3XJJ8WL9AoGBAMJ5X3Wb9NX
BhFQJ5cKj3ky6xyq8Q0Y5D7RdC5F9L8v4ZwF8XJJt6x7Q8QG9sK3D4xXJXrQN6y6
-----END PRIVATE KEY-----`;
      const cert = `-----BEGIN CERTIFICATE-----
MIIDazCCAlOgAwIBAgIUK8XJJt6x7Q8QG9sK3D4xXJXrQN4wDQYJKoZIhvcNAQEL
BQAwRTELMAkGA1UEBhMCVEgxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoM
GEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDAeFw0yNDAxMDEwMDAwMDBaFw0yNTAx
MDEwMDAwMDBaMEUxCzAJBgNVBAYTAlRIMRMwEQYDVQQIDApTb21lLVN0YXRlMSEw
HwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQwggEiMA0GCSqGSIb3DQEB
AQUAA4IBDwAwggEKAoIBAQC7D3sDJJvNx5X3Wb9NXBhFQJ5cKj3ky6xyq8Q0Y5D7
RdC5F9L8v4ZwF8XJJt6x7Q8QG9sK3D4xXJXrQN6y6X7J6Z8N3XJJ8WL9X5X3Wb9N
XBhFQJ5cKj3ky6xyq8Q0Y5D7RdC5F9L8v4ZwF8XJJt6x7Q8QG9sK3D4xXJXrQN6y
6X7J6Z8N3XJJ8WL9X5X3Wb9NXBhFQJ5cKj3ky6xyq8Q0Y5D7RdC5F9L8v4ZwF8XJ
Jt6x7Q8QG9sK3D4xXJXrQN6y6X7J6Z8N3XJJ8WL9AgMBAAGjUzBRMB0GA1UdDgQW
BBQvF8XJJt6x7Q8QG9sK3D4xXJXrQN0wHwYDVR0jBBgwFoAULxfFySbesewPEBvb
Ctw+MVyV60DdMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAJ5X
3Wb9NXBhFQJ5cKj3ky6xyq8Q0Y5D7RdC5F9L8v4ZwF8XJJt6x7Q8QG9sK3D4xXJX
rQN6y6X7J6Z8N3XJJ8WL9X5X3Wb9NXBhFQJ5cKj3ky6xyq8Q0Y5D7RdC5F9L8v4Z
-----END CERTIFICATE-----`;
      fs.writeFileSync(keyPath, key);
      fs.writeFileSync(certPath, cert);
    }
  }

  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
}

// MIME types for different file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Helper function to read JSON body
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// Helper function to send JSON response
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  console.log(`📥 ${req.method} ${req.url}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // =====================================================
  // API Endpoints (replacing PHP)
  // =====================================================

  function logTransaction(details) {
    const logFile = 'log.json';
    let logs = [];
    try {
      if (fs.existsSync(logFile)) {
        logs = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
      }
    } catch (e) { console.error('Error reading log:', e); }

    const timestamp = new Date().toISOString();

    // Cleanup logs older than 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    logs = logs.filter(log => {
      // Ensure timestamp exists and is valid
      if (!log.timestamp) return false;
      const logDate = new Date(log.timestamp);
      return logDate > threeMonthsAgo;
    });

    // Normalize to array
    const entries = Array.isArray(details) ? details : [details];

    // Add timestamp to each if not present
    entries.forEach(e => {
      if (!e.timestamp) e.timestamp = timestamp;
    });

    logs.push(...entries);

    try {
      fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    } catch (e) { console.error('Error writing log:', e); }
  }

  // API: บันทึกคะแนนเดี่ยว (แทน save_score.php)
  if (req.method === 'POST' && req.url === '/api/save-score') {
    try {
      const data = await readBody(req);
      const file = 'user2.1.json';

      // Read current data
      const students = JSON.parse(fs.readFileSync(file, 'utf-8'));

      // Find and update student
      let found = false;
      for (let s of students) {
        if (s.id === data.id) {
          const oldScore = s.score;
          const newScore = data.score;

          if (oldScore !== newScore) {
            const diff = newScore - oldScore;
            logTransaction({
              action: diff > 0 ? 'increase' : 'decrease',
              student_id: s.id,
              student_name: s.name,
              old_score: oldScore,
              new_score: newScore,
              change: diff,
              reason: data.reason || 'Manual Update',
              timestamp: new Date().toISOString()
            });
          }

          s.score = data.score;
          found = true;
          break;
        }
      }

      if (!found) {
        sendJSON(res, 404, { status: 'error', message: 'ไม่พบนักเรียน' });
        return;
      }

      // Save to file
      fs.writeFileSync(file, JSON.stringify(students, null, 2));
      console.log(`✅ บันทึกคะแนน ${data.id}: ${data.score}`);

      sendJSON(res, 200, { status: 'success' });
    } catch (e) {
      console.error('❌ Error:', e.message);
      sendJSON(res, 500, { status: 'error', message: e.message });
    }
    return;
  }

  // API: บันทึกสถานะนักเรียน
  if (req.method === 'POST' && req.url === '/api/save-status') {
    try {
      const data = await readBody(req);
      const file = 'user2.1.json';

      // Read current data
      let students = [];
      if (fs.existsSync(file)) {
        students = JSON.parse(fs.readFileSync(file, 'utf-8'));
      }

      // Find and update student
      let found = false;
      for (let s of students) {
        if (s.id === data.id) {
          s.status = data.status;
          found = true;
          break;
        }
      }

      if (!found) {
        sendJSON(res, 404, { status: 'error', message: 'ไม่พบนักเรียน' });
        return;
      }

      // Save to file
      fs.writeFileSync(file, JSON.stringify(students, null, 2));
      console.log(`✅ อัปเดตสถานะ ${data.id}: ${data.status}`);

      sendJSON(res, 200, { status: 'success' });
    } catch (e) {
      console.error('❌ Error:', e.message);
      sendJSON(res, 500, { status: 'error', message: e.message });
    }
    return;
  }

  // API: บันทึกทั้งหมด (แทน reset_scores.php)
  if (req.method === 'POST' && req.url === '/api/save-all') {
    try {
      const data = await readBody(req);
      const file = 'user2.1.json';

      // Read old data for logging
      let oldStudents = [];
      try {
        oldStudents = JSON.parse(fs.readFileSync(file, 'utf-8'));
      } catch (e) { /* ignore if file doesn't exist */ }

      // Detect changes
      const logs = [];
      const timestamp = new Date().toISOString();

      data.forEach(newStudent => {
        const oldStudent = oldStudents.find(s => s.id === newStudent.id);
        if (oldStudent) {
          const diff = newStudent.score - oldStudent.score;
          if (diff !== 0) {
            logs.push({
              action: diff > 0 ? 'increase' : 'decrease',
              student_id: newStudent.id,
              student_name: newStudent.name,
              old_score: oldStudent.score,
              new_score: newStudent.score,
              change: diff,
              reason: 'Batch Update',
              timestamp: timestamp
            });
          }
        }
      });

      if (logs.length > 0) {
        logTransaction(logs);
        console.log(`📝 บันทึก Log การแก้ไข: ${logs.length} รายการ`);
      }

      // Sanitize data: remove temporary logReason before saving
      const sanitizedData = data.map(s => {
        const { logReason, ...rest } = s;
        return rest;
      });

      // Save all students data
      fs.writeFileSync(file, JSON.stringify(sanitizedData, null, 2));
      console.log(`✅ บันทึกข้อมูลนักเรียนทั้งหมด: ${data.length} คน`);

      sendJSON(res, 200, { status: 'success', students: data.length });
    } catch (e) {
      console.error('❌ Error:', e.message);
      sendJSON(res, 500, { status: 'error', message: e.message });
    }
    return;
  }

  // API: บันทึกข้อมูลการสแกน QR ไปยัง toadmin.json
  if (req.method === 'POST' && req.url === '/api/save-toadmin') {
    try {
      const data = await readBody(req);
      const file = 'toadmin.json';

      // Read existing data
      let toadminData = [];
      try {
        if (fs.existsSync(file)) {
          toadminData = JSON.parse(fs.readFileSync(file, 'utf-8'));
        }
      } catch (e) {
        console.error('Error reading toadmin.json:', e);
      }

      // Add new entry
      toadminData.push(data);

      // Save to file
      fs.writeFileSync(file, JSON.stringify(toadminData, null, 2));
      console.log(`✅ บันทึกข้อมูลการสแกน QR: ${data.student_id} - ${data.student_name}`);

      sendJSON(res, 200, { status: 'success' });
    } catch (e) {
      console.error('❌ Error:', e.message);
      sendJSON(res, 500, { status: 'error', message: e.message });
    }
    return;
  }

  // API: บันทึกการส่งงาน/แก้ไข
  if (req.method === 'POST' && req.url === '/api/save-work') {
    try {
      const data = await readBody(req);
      const studentId = data.student_id;
      const timestamp = new Date().getTime();
      const proflyDir = path.join(__dirname, 'profly');

      // Ensure directory exists
      if (!fs.existsSync(proflyDir)) {
        fs.mkdirSync(proflyDir);
      }

      let beforeImagePath = null;
      let afterImagePath = null;

      // Save Before Image
      if (data.image_before) {
        const base64Data = data.image_before.replace(/^data:image\/\w+;base64,/, "");
        const fileName = `${timestamp}_${studentId}_before.jpg`;
        const filePath = path.join(proflyDir, fileName);
        fs.writeFileSync(filePath, base64Data, 'base64');
        beforeImagePath = `profly/${fileName}`;
      }

      // Save After Image
      if (data.image_after) {
        const base64Data = data.image_after.replace(/^data:image\/\w+;base64,/, "");
        const fileName = `${timestamp}_${studentId}_after.jpg`;
        const filePath = path.join(proflyDir, fileName);
        fs.writeFileSync(filePath, base64Data, 'base64');
        afterImagePath = `profly/${fileName}`;
      }

      // Prepare record for toadmin.json
      const record = {
        student_id: data.student_id,
        student_name: data.student_name,
        detail: data.detail,
        image_before: beforeImagePath,
        image_after: afterImagePath,
        teacher: data.teacher,
        timestamp: data.timestamp,
        type: 'work_submission',
        status: 'pending'
      };

      const file = 'toadmin.json';
      let toadminData = [];
      try {
        if (fs.existsSync(file)) {
          toadminData = JSON.parse(fs.readFileSync(file, 'utf-8'));
        }
      } catch (e) {
        console.error('Error reading toadmin.json:', e);
      }

      toadminData.push(record);
      fs.writeFileSync(file, JSON.stringify(toadminData, null, 2));

      console.log(`✅ บันทึกการส่งงาน: ${data.student_id} - ${data.student_name}`);
      sendJSON(res, 200, { status: 'success' });
    } catch (e) {
      console.error('❌ Error saving work:', e.message);
      sendJSON(res, 500, { status: 'error', message: e.message });
    }
    return;
  }

  // API: อัพเดทสถานะการแจ้งเตือนใน toadmin.json
  if (req.method === 'POST' && req.url === '/api/update-toadmin-status') {
    try {
      const data = await readBody(req);
      const file = 'toadmin.json';

      // Read existing data
      let toadminData = [];
      try {
        if (fs.existsSync(file)) {
          toadminData = JSON.parse(fs.readFileSync(file, 'utf-8'));
        }
      } catch (e) {
        console.error('Error reading toadmin.json:', e);
      }

      // Update status
      if (data.index >= 0 && data.index < toadminData.length) {
        toadminData[data.index].status = 'completed';
        toadminData[data.index].completed_at = new Date().toISOString();
        toadminData[data.index].completed_by = data.admin_name || 'Admin';

        // Save to file
        fs.writeFileSync(file, JSON.stringify(toadminData, null, 2));
        console.log(`✅ อัพเดทสถานะการแจ้งเตือน index ${data.index} เป็น completed`);

        sendJSON(res, 200, { status: 'success' });
      } else {
        sendJSON(res, 400, { status: 'error', message: 'Invalid index' });
      }
    } catch (e) {
      console.error('❌ Error:', e.message);
      sendJSON(res, 500, { status: 'error', message: e.message });
    }
    return;
  }

  // =====================================================
  // Static File Serving
  // =====================================================

  // Default to index.html for root path
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './index.html';
  }

  // Get file extension
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  // Read and serve the file
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // File not found
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>404 - ไม่พบไฟล์</title>
            <style>
              body {
                font-family: 'Prompt', Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .error-box {
                text-align: center;
                padding: 40px;
                background: rgba(255,255,255,0.1);
                border-radius: 20px;
                backdrop-filter: blur(10px);
              }
              h1 { font-size: 4rem; margin: 0; }
              p { font-size: 1.5rem; }
            </style>
          </head>
          <body>
            <div class="error-box">
              <h1>404</h1>
              <p>❌ ไม่พบไฟล์ที่ต้องการ</p>
              <p style="font-size:1rem; opacity:0.8;">${req.url}</p>
            </div>
          </body>
          </html>
        `);
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      // Success
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Start HTTPS server on port 8000 for mobile camera access
let mainServer;

try {
  const sslOptions = ensureSSLCertificates();
  mainServer = https.createServer(sslOptions, server._events.request);

  mainServer.listen(PORT, () => {
    console.log('\n🚀 HTTPS Server กำลังทำงาน!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📍 URL: https://localhost:${PORT}`);

    // Get local IP for mobile access
    const os = require('os');
    const interfaces = os.networkInterfaces();
    let localIP = 'localhost';

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIP = iface.address;
          break;
        }
      }
    }

    console.log(`📱 สำหรับมือถือ: https://${localIP}:${PORT}`);
    console.log('   (กด "ขั้นสูง" > "ไปที่เว็บไซต์" เมื่อเบราว์เซอร์แจ้งเตือน)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📚 API Endpoints:');
    console.log('   POST /api/save-score             - บันทึกคะแนนเดี่ยว');
    console.log('   POST /api/save-all               - บันทึกทั้งหมด');
    console.log('   POST /api/save-toadmin           - บันทึกข้อมูลการสแกน QR');
    console.log('   POST /api/update-toadmin-status  - อัพเดทสถานะการแจ้งเตือน');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 กด Ctrl+C เพื่อหยุด Server\n');
  });

  mainServer.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} ถูกใช้งานแล้ว!`);
      console.log('💡 ลองปิดโปรแกรมที่ใช้ Port นี้อยู่');
    } else {
      console.error('❌ เกิดข้อผิดพลาด:', error.message);
    }
    process.exit(1);
  });
} catch (e) {
  console.error('⚠️ ไม่สามารถเริ่ม HTTPS Server:', e.message);
  console.log('   กำลังใช้ HTTP แทน...');

  // Fallback to HTTP if HTTPS fails
  mainServer = server;
  mainServer.listen(PORT, () => {
    console.log('\n🚀 HTTP Server กำลังทำงาน!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log('⚠️ กล้องจะใช้งานได้เฉพาะบน localhost เท่านั้น');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 กด Ctrl+C เพื่อหยุด Server\n');
  });

  mainServer.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} ถูกใช้งานแล้ว!`);
    } else {
      console.error('❌ เกิดข้อผิดพลาด:', error.message);
    }
    process.exit(1);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 กำลังปิด Server...');
  mainServer.close(() => {
    console.log('✅ Server ปิดเรียบร้อย');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n\n👋 กำลังปิด Server...');
  mainServer.close(() => {
    console.log('✅ Server ปิดเรียบร้อย');
    process.exit(0);
  });
});