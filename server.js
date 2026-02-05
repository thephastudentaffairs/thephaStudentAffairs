const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Helper function to parse JSON body
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
}

// Helper function to send JSON response
function sendJSON(res, data, statusCode = 200) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(data));
}

// Load students data
function loadStudents() {
    try {
        const data = fs.readFileSync('./user2.1.json', 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Error loading students:', e.message);
        return [];
    }
}

// Save students data
function saveStudents(students) {
    try {
        fs.writeFileSync('./user2.1.json', JSON.stringify(students, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error saving students:', e.message);
        return false;
    }
}

// Load/Save log data
function loadLog() {
    try {
        const data = fs.readFileSync('./log.json', 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

function saveLog(logs) {
    try {
        fs.writeFileSync('./log.json', JSON.stringify(logs, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error saving log:', e.message);
        return false;
    }
}

const server = http.createServer(async (req, res) => {
    const urlParts = req.url.split('?');
    const pathname = urlParts[0];

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    // ================= API ENDPOINTS =================

    // API: Save Status (for updating student status)
    if (pathname === '/api/save-status' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const { id, status } = body;

            if (!id || !status) {
                sendJSON(res, { status: 'error', message: 'Missing id or status' }, 400);
                return;
            }

            const students = loadStudents();
            const student = students.find(s => String(s.id) === String(id));

            if (!student) {
                sendJSON(res, { status: 'error', message: 'Student not found' }, 404);
                return;
            }

            student.status = status;

            if (saveStudents(students)) {
                console.log(`[API] Status updated: ${id} -> ${status}`);
                sendJSON(res, { status: 'success', message: 'Status updated successfully' });
            } else {
                sendJSON(res, { status: 'error', message: 'Failed to save data' }, 500);
            }
        } catch (e) {
            console.error('[API] save-status error:', e);
            sendJSON(res, { status: 'error', message: e.message }, 500);
        }
        return;
    }

    // API: Save Score (for individual score updates)
    if (pathname === '/api/save-score' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const { id, score, reason } = body;

            if (!id || score === undefined) {
                sendJSON(res, { status: 'error', message: 'Missing id or score' }, 400);
                return;
            }

            const students = loadStudents();
            const student = students.find(s => String(s.id) === String(id));

            if (!student) {
                sendJSON(res, { status: 'error', message: 'Student not found' }, 404);
                return;
            }

            const oldScore = student.score;
            student.score = parseInt(score);

            if (saveStudents(students)) {
                // Log the change
                const logs = loadLog();
                logs.push({
                    student_id: id,
                    student_name: student.name,
                    old_score: oldScore,
                    new_score: student.score,
                    change: student.score - oldScore,
                    reason: reason || 'Score updated',
                    timestamp: new Date().toISOString(),
                    type: 'score_change'
                });
                saveLog(logs);

                console.log(`[API] Score updated: ${id} (${oldScore} -> ${student.score})`);
                sendJSON(res, { status: 'success', message: 'Score updated successfully' });
            } else {
                sendJSON(res, { status: 'error', message: 'Failed to save data' }, 500);
            }
        } catch (e) {
            console.error('[API] save-score error:', e);
            sendJSON(res, { status: 'error', message: e.message }, 500);
        }
        return;
    }

    // API: Save All (for bulk updates)
    if (pathname === '/api/save-all' && req.method === 'POST') {
        try {
            const body = await parseBody(req);

            if (!Array.isArray(body)) {
                sendJSON(res, { status: 'error', message: 'Invalid data format' }, 400);
                return;
            }

            if (saveStudents(body)) {
                console.log(`[API] All students saved: ${body.length} records`);
                sendJSON(res, { status: 'success', message: 'All students saved', students: body.length });
            } else {
                sendJSON(res, { status: 'error', message: 'Failed to save data' }, 500);
            }
        } catch (e) {
            console.error('[API] save-all error:', e);
            sendJSON(res, { status: 'error', message: e.message }, 500);
        }
        return;
    }

    // API: Save to Admin (for deduction/addition records from QR scanner)
    if (pathname === '/api/save-toadmin' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const { student_id, student_name, reason, deduction, new_score } = body;

            // Update student score
            const students = loadStudents();
            const student = students.find(s => String(s.id) === String(student_id));

            if (student && new_score !== undefined) {
                student.score = parseInt(new_score);
                saveStudents(students);
            }

            // Log the action
            const logs = loadLog();
            logs.push({
                student_id,
                student_name,
                reason,
                deduction: parseInt(deduction) || 0,
                new_score: parseInt(new_score),
                timestamp: new Date().toISOString(),
                type: 'deduction'
            });
            saveLog(logs);

            console.log(`[API] Deduction logged: ${student_id} - ${reason}`);
            sendJSON(res, { status: 'success', message: 'Record saved' });
        } catch (e) {
            console.error('[API] save-toadmin error:', e);
            sendJSON(res, { status: 'error', message: e.message }, 500);
        }
        return;
    }

    // API: Save Work (for work submission records)
    if (pathname === '/api/save-work' && req.method === 'POST') {
        try {
            const body = await parseBody(req);

            // Load existing work records
            let works = [];
            try {
                const data = fs.readFileSync('./work.json', 'utf8');
                works = JSON.parse(data);
            } catch (e) {
                works = [];
            }

            // Add new work record
            works.push({
                ...body,
                timestamp: new Date().toISOString()
            });

            fs.writeFileSync('./work.json', JSON.stringify(works, null, 2), 'utf8');

            console.log(`[API] Work saved: ${body.student_id}`);
            sendJSON(res, { status: 'success', message: 'Work saved' });
        } catch (e) {
            console.error('[API] save-work error:', e);
            sendJSON(res, { status: 'error', message: e.message }, 500);
        }
        return;
    }

    // API: Upload Student Profile
    if (pathname === '/api/upload-student-profile' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const { student_id, image_data } = body;

            if (!student_id || !image_data) {
                sendJSON(res, { status: 'error', message: 'Missing student_id or image_data' }, 400);
                return;
            }

            // Create edstudent directory if it doesn't exist
            const dirPath = './edstudent';
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }

            // Save image (base64 to file)
            const base64Data = image_data.replace(/^data:image\/\w+;base64,/, '');
            const imagePath = path.join(dirPath, `${student_id}.jpg`);
            fs.writeFileSync(imagePath, base64Data, 'base64');

            console.log(`[API] Profile uploaded: ${student_id}`);
            sendJSON(res, { status: 'success', message: 'Profile image saved' });
        } catch (e) {
            console.error('[API] upload-student-profile error:', e);
            sendJSON(res, { status: 'error', message: e.message }, 500);
        }
        return;
    }

    // ================= STATIC FILE SERVER =================
    let filePath = '.' + pathname;
    if (filePath === './') filePath = './th.html';

    const extname = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                console.log('404 Not Found:', filePath);
                res.writeHead(404);
                res.end('File not found: ' + filePath);
            } else {
                res.writeHead(500);
                res.end('Server error: ' + err.code);
            }
        } else {
            console.log('200 OK:', filePath);
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('API Endpoints available:');
    console.log('  POST /api/save-status - Update student status');
    console.log('  POST /api/save-score - Update individual score');
    console.log('  POST /api/save-all - Save all student data');
    console.log('  POST /api/save-toadmin - Log deductions');
    console.log('  POST /api/save-work - Save work submissions');
    console.log('  POST /api/upload-student-profile - Upload profile image');
    console.log('Press Ctrl+C to stop');
});