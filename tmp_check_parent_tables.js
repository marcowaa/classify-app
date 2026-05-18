const { Client } = require("pg");

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("Missing DATABASE_URL env var");
        process.exit(1);
    }

    const client = new Client({ connectionString });
    await client.connect();

    const r = await client.query(
        "select table_name from information_schema.tables where table_schema='public' order by table_name"
    );

    const matches = r.rows
        .map(x => x.table_name)
        .filter(n => /(parent|child|parents|children)/i.test(n));

    console.log(matches.slice(0, 200));
    await client.end();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
