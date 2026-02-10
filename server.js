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

// Calculate statuspoint based on score and deduction history
function calculateStatusPoint(student, logs) {
    const score = student.score || 100;

    // Check if student has any deduction history
    const hasDeductions = logs.some(log =>
        String(log.student_id) === String(student.id) &&
        (log.change < 0 || log.deduction < 0 || log.type === 'deduction')
    );

    if (score < 60) return 'urgent';
    if (score < 80) return 'risk';
    if (score === 100 && !hasDeductions) return 'excellent';
    return 'normal';
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

            // Update statuspoint
            const logs = loadLog();
            student.statuspoint = calculateStatusPoint(student, logs);

            if (saveStudents(students)) {
                // Log the change
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

                console.log(`[API] Score updated: ${id} (${oldScore} -> ${student.score}), statuspoint: ${student.statuspoint}`);
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
            const { student_id, student_name, reason, deduction, new_score, teacher, status } = body;

            // Update student score
            const students = loadStudents();
            const student = students.find(s => String(s.id) === String(student_id));

            if (student && new_score !== undefined) {
                student.score = parseInt(new_score);

                // Update statuspoint after deduction
                const logs = loadLog();
                student.statuspoint = calculateStatusPoint(student, logs);

                saveStudents(students);
            }

            // Log the action to log.json
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

            // Also save to toadmin.json for admin view
            let toAdminData = [];
            try {
                if (!fs.existsSync('./toadmin.json')) {
                    fs.writeFileSync('./toadmin.json', '[]', 'utf8');
                }
                const data = fs.readFileSync('./toadmin.json', 'utf8');
                toAdminData = JSON.parse(data);
            } catch (e) {
                toAdminData = [];
            }

            toAdminData.push({
                student_id,
                student_name,
                reason,
                teacher: teacher || 'Unknown',
                timestamp: new Date().toISOString(),
                status: status || 'pending',
                type: 'deduction'
            });

            fs.writeFileSync('./toadmin.json', JSON.stringify(toAdminData, null, 2), 'utf8');

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

            // 1. Process Images
            const { image_before, image_after, student_id, ...otherData } = body;
            let beforePath = null;
            let afterPath = null;

            // Create profly directory if it doesn't exist
            const proflyDir = './profly';
            if (!fs.existsSync(proflyDir)) {
                fs.mkdirSync(proflyDir, { recursive: true });
            }

            // Save Before Image
            if (image_before && image_before.startsWith('data:image')) {
                const base64Data = image_before.replace(/^data:image\/\w+;base64,/, '');
                const fileName = `${student_id}_before_${Date.now()}.jpg`;
                const filePath = path.join(proflyDir, fileName);
                fs.writeFileSync(filePath, base64Data, 'base64');
                beforePath = '/profly/' + fileName;
            }

            // Save After Image
            if (image_after && image_after.startsWith('data:image')) {
                const base64Data = image_after.replace(/^data:image\/\w+;base64,/, '');
                const fileName = `${student_id}_after_${Date.now()}.jpg`;
                const filePath = path.join(proflyDir, fileName);
                fs.writeFileSync(filePath, base64Data, 'base64');
                afterPath = '/profly/' + fileName;
            }

            // 2. Prepare Data for toadmin.json
            let toAdminData = [];
            try {
                // Initialize if not exists
                if (!fs.existsSync('./toadmin.json')) {
                    fs.writeFileSync('./toadmin.json', '[]', 'utf8');
                }
                const data = fs.readFileSync('./toadmin.json', 'utf8');
                toAdminData = JSON.parse(data);
            } catch (e) {
                toAdminData = [];
                console.error('Error loading toadmin.json, initializing empty array', e);
            }

            // Add new record
            const newRecord = {
                ...otherData,
                student_id,
                image_before: beforePath || null, // Use path if saved
                image_after: afterPath || null,
                timestamp: new Date().toISOString(),
                type: 'work_submission',
                status: otherData.status || 'pending' // Allow override status
            };

            toAdminData.push(newRecord);

            fs.writeFileSync('./toadmin.json', JSON.stringify(toAdminData, null, 2), 'utf8');

            console.log(`[API] Work saved to toadmin.json: ${student_id}, Images: ${beforePath}, ${afterPath}`);
            sendJSON(res, { status: 'success', message: 'Work saved successfully' });
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

    // API: Update ToAdmin Status (mark as completed)
    if (pathname === '/api/update-toadmin-status' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const { index, admin_name, reason } = body;

            if (index === undefined) {
                sendJSON(res, { status: 'error', message: 'Missing index' }, 400);
                return;
            }

            let toAdminData = [];
            try {
                if (fs.existsSync('./toadmin.json')) {
                    const data = fs.readFileSync('./toadmin.json', 'utf8');
                    toAdminData = JSON.parse(data);
                }
            } catch (e) {
                console.error('Error loading toadmin.json', e);
                sendJSON(res, { status: 'error', message: 'Failed to load data' }, 500);
                return;
            }

            if (index >= 0 && index < toAdminData.length) {
                toAdminData[index].status = 'completed';
                if (admin_name) toAdminData[index].admin_name = admin_name;
                if (reason) toAdminData[index].admin_reason = reason; // Store admin reason separately or override
                // toAdminData[index].score_updated = true; // Optional flag

                fs.writeFileSync('./toadmin.json', JSON.stringify(toAdminData, null, 2), 'utf8');
                console.log(`[API] ToAdmin status updated for index ${index}`);
                sendJSON(res, { status: 'success', message: 'Status updated' });
            } else {
                sendJSON(res, { status: 'error', message: 'Invalid index' }, 404);
            }
        } catch (e) {
            console.error('[API] update-toadmin-status error:', e);
            sendJSON(res, { status: 'error', message: e.message }, 500);
        }
        return;
    }

    // API: Get Student Logs (for notifications)
    if (pathname === '/api/student-logs' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const { student_id } = body;

            if (!student_id) {
                sendJSON(res, { status: 'error', message: 'Missing student_id' }, 400);
                return;
            }

            const logs = loadLog();
            // Filter logs for this student
            const studentLogs = logs.filter(log => String(log.student_id) === String(student_id));

            // Sort by latest first
            studentLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            sendJSON(res, { status: 'success', logs: studentLogs });
        } catch (e) {
            console.error('[API] student-logs error:', e);
            sendJSON(res, { status: 'error', message: e.message }, 500);
        }
        return;
    }

    // API: List Student Photos from edstudent folder
    if (pathname === '/api/list-student-photos' && req.method === 'GET') {
        try {
            const dirPath = './edstudent';
            let photos = [];

            if (fs.existsSync(dirPath)) {
                const files = fs.readdirSync(dirPath);
                photos = files
                    .filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f))
                    .map(f => {
                        const stats = fs.statSync(path.join(dirPath, f));
                        const studentId = f.replace(/\.(jpg|jpeg|png|gif)$/i, '');
                        return {
                            filename: f,
                            student_id: studentId,
                            path: '/edstudent/' + f,
                            size: stats.size,
                            modified: stats.mtime
                        };
                    });
            }

            console.log(`[API] Listed ${photos.length} student photos`);
            sendJSON(res, { status: 'success', photos });
        } catch (e) {
            console.error('[API] list-student-photos error:', e);
            sendJSON(res, { status: 'error', message: e.message }, 500);
        }
        return;
    }

    // API: Delete Student Photo
    if (pathname === '/api/delete-student-photo' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const { student_id } = body;

            if (!student_id) {
                sendJSON(res, { status: 'error', message: 'Missing student_id' }, 400);
                return;
            }

            const filePath = `./edstudent/${student_id}.jpg`;
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`[API] Deleted photo: ${student_id}`);
                sendJSON(res, { status: 'success', message: 'Photo deleted' });
            } else {
                sendJSON(res, { status: 'error', message: 'Photo not found' }, 404);
            }
        } catch (e) {
            console.error('[API] delete-student-photo error:', e);
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