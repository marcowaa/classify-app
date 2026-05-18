const { Client } = require("pg");

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("Missing DATABASE_URL env var");
        process.exit(1);
    }

    const client = new Client({ connectionString });
    await client.connect();

    const schemasRes = await client.query(
        "select schema_name from information_schema.schemata order by schema_name"
    );
    const schemas = schemasRes.rows.map((r) => r.schema_name);

    console.log("schemas:", schemas);

    for (const schema of schemas) {
        const countRes = await client.query(
            "select count(*)::int as cnt from information_schema.tables where table_schema = $1",
            [schema]
        );
        const cnt = countRes.rows?.[0]?.cnt ?? 0;
        console.log(`schema=${schema} tableCount=${cnt}`);

        if (schema === "public" && cnt > 0) {
            const tablesRes = await client.query(
                "select table_name from information_schema.tables where table_schema='public' order by table_name limit 200"
            );
            const names = tablesRes.rows.map((r) => r.table_name);
            console.log("public tables(sample200):", names);
        }
    }

    await client.end();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
