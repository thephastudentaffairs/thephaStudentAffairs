// Script to add statuspoint field to all students in user2.1.json
const fs = require('fs');

console.log('📚 Reading user2.1.json...');
const students = JSON.parse(fs.readFileSync('./user2.1.json', 'utf8'));

console.log(`Found ${students.length} students`);

let counts = {
    urgent: 0,
    risk: 0,
    normal: 0,
    excellent: 0
};

students.forEach(student => {
    const score = student.score || 100;

    // Initial calculation based on score only
    // Will be refined later to check deduction history for 'excellent' status
    if (score < 60) {
        student.statuspoint = 'urgent';
        counts.urgent++;
    } else if (score < 80) {
        student.statuspoint = 'risk';
        counts.risk++;
    } else if (score === 100) {
        student.statuspoint = 'excellent';
        counts.excellent++;
    } else {
        student.statuspoint = 'normal';
        counts.normal++;
    }
});

console.log('\n📊 Status Distribution:');
console.log(`  🚨 Urgent (< 60):        ${counts.urgent} students`);
console.log(`  ⚠️  Risk (60-79):        ${counts.risk} students`);
console.log(`  ✅ Normal (80-99):       ${counts.normal} students`);
console.log(`  ⭐ Excellent (100):      ${counts.excellent} students`);
console.log(`  📝 Total:                ${students.length} students`);

// Backup original file
const backupPath = './user2.1.json.backup';
if (!fs.existsSync(backupPath)) {
    console.log('\n💾 Creating backup: user2.1.json.backup');
    fs.copyFileSync('./user2.1.json', backupPath);
}

// Write updated data
console.log('\n✍️  Writing updated data to user2.1.json...');
fs.writeFileSync('./user2.1.json', JSON.stringify(students, null, 2), 'utf8');

console.log('\n✅ Successfully added statuspoint to all students!');
console.log('💡 Note: Students with score=100 are marked as "excellent"');
console.log('   They will be verified against deduction history when the system runs.');
