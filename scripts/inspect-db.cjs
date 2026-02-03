const mysql = require('mysql2/promise');

async function inspect() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Tables:', tables);

    for (const row of tables) {
        const tableName = Object.values(row)[0];
        console.log(`\nSchema for ${tableName}:`);
        try {
            const [create] = await connection.execute(`SHOW CREATE TABLE ${tableName}`);
            console.log(create[0]['Create Table']);
        } catch (e) {
            console.error(e.message);
        }
    }
    await connection.end();
}

inspect().catch(console.error);
