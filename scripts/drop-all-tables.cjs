const mysql = require('mysql2/promise');

async function nuke() {
    console.log('Connecting to DB...');
    const connection = await mysql.createConnection(process.env.DATABASE_URL);

    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`Found ${tables.length} tables.`);

    // Disable foreign key checks to avoid constraint errors
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    for (const row of tables) {
        const tableName = Object.values(row)[0];
        console.log(`Dropping ${tableName}...`);
        await connection.execute(`DROP TABLE IF EXISTS ${tableName}`);
    }

    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('All tables dropped.');
    await connection.end();
}

nuke().catch(err => {
    console.error(err);
    process.exit(1);
});
