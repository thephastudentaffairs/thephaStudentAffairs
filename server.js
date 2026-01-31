const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8000;

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

server.listen(PORT, () => {
  console.log('\n🚀 Server กำลังทำงาน!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📚 API Endpoints:');
  console.log('   POST /api/save-score             - บันทึกคะแนนเดี่ยว');
  console.log('   POST /api/save-all               - บันทึกทั้งหมด');
  console.log('   POST /api/save-toadmin           - บันทึกข้อมูลการสแกน QR');
  console.log('   POST /api/update-toadmin-status  - อัพเดทสถานะการแจ้งเตือน');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡 กด Ctrl+C เพื่อหยุด Server\n');
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} ถูกใช้งานแล้ว!`);
    console.log('💡 ลองใช้ Port อื่น หรือปิดโปรแกรมที่ใช้ Port นี้อยู่');
  } else {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 กำลังปิด Server...');
  server.close(() => {
    console.log('✅ Server ปิดเรียบร้อย');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n\n👋 กำลังปิด Server...');
  server.close(() => {
    console.log('✅ Server ปิดเรียบร้อย');
    process.exit(0);
  });
});