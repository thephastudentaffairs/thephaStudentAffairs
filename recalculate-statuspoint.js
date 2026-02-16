// Script to recalculate statuspoint for all students using correct logic
const fs = require('fs');

console.log('📚 Reading user2.1.json...');
const students = JSON.parse(fs.readFileSync('./user2.1.json', 'utf8'));

console.log('📚 Reading log.json...');
let logs = [];
try {
    logs = JSON.parse(fs.readFileSync('./log.json', 'utf8'));
} catch (e) {
    console.log('⚠️  No log.json found, assuming no deduction history');
}

console.log(`Found ${students.length} students and ${logs.length} log entries`);

// Same calculation logic as server.js
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

let counts = {
    urgent: 0,
    risk: 0,
    normal: 0,
    excellent: 0
};

let changedCount = 0;

students.forEach(student => {
    const oldStatus = student.statuspoint;
    const newStatus = calculateStatusPoint(student, logs);

    if (oldStatus !== newStatus) {
        console.log(`  Changed: ${student.id} (${student.name}): ${oldStatus} → ${newStatus} (score: ${student.score})`);
        changedCount++;
    }

    student.statuspoint = newStatus;
    counts[newStatus]++;
});

console.log('\n📊 Status Distribution:');
console.log(`  🚨 Urgent (< 60):        ${counts.urgent} students`);
console.log(`  ⚠️  Risk (60-79):        ${counts.risk} students`);
console.log(`  ✅ Normal (80-99):       ${counts.normal} students`);
console.log(`  ⭐ Excellent (100):      ${counts.excellent} students`);
console.log(`  📝 Total:                ${students.length} students`);
console.log(`\n🔄 Changed:               ${changedCount} students`);

// Write updated data
console.log('\n✍️  Writing updated data to user2.1.json...');
fs.writeFileSync('./user2.1.json', JSON.stringify(students, null, 2), 'utf8');

console.log('\n✅ Successfully recalculated statuspoint for all students!');
