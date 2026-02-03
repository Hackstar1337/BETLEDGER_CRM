const mysql = require('mysql2/promise');

async function dropConflicts() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);

    // audit_trail is known to cause "Table already exists" error
    try {
        console.log('Dropping audit_trail...');
        await connection.execute('DROP TABLE IF EXISTS audit_trail');
        console.log('Dropped audit_trail');
    } catch (e) {
        console.error(e.message);
    }

    await connection.end();
}

dropConflicts().catch(console.error);
