import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const migrationsDir = path.join(repoRoot, 'supabase', 'migrations');

const snapshots = [
    {
        table: 'argentina_market_cache',
        filePath: path.join(repoRoot, 'supabase', 'argentina_market_cache_schema.sql'),
    },
    {
        table: 'argentina_company_profile_cache',
        filePath: path.join(repoRoot, 'supabase', 'argentina_company_profile_cache_schema.sql'),
    },
    {
        table: 'stock_cache',
        filePath: path.join(repoRoot, 'supabase', 'stock_cache_schema.sql'),
    },
];

const migrationFiles = fs.existsSync(migrationsDir)
    ? fs.readdirSync(migrationsDir).filter((fileName) => /\.sql$/i.test(fileName))
    : [];

const migrationEntries = migrationFiles.map((fileName) => {
    const fullPath = path.join(migrationsDir, fileName);
    const content = fs.readFileSync(fullPath, 'utf8');
    const timestamp = (fileName.match(/^(\d{14})_/) || [])[1] || null;
    return { fileName, timestamp, content };
});

const getLatestMigrationForTable = (table) => {
    const matches = migrationEntries
        .filter((entry) => entry.timestamp && entry.content.toLowerCase().includes(table.toLowerCase()))
        .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    return matches.length > 0 ? matches[matches.length - 1].timestamp : null;
};

const extractSnapshotMarker = (content) => {
    const marker = content.match(/snapshot-source-migration:\s*(\d{14}|none)/i);
    return marker ? marker[1] : null;
};

const failures = [];

for (const snapshot of snapshots) {
    if (!fs.existsSync(snapshot.filePath)) {
        failures.push(`Missing snapshot file: ${path.relative(repoRoot, snapshot.filePath)}`);
        continue;
    }

    const content = fs.readFileSync(snapshot.filePath, 'utf8');
    const marker = extractSnapshotMarker(content);
    const latestMigration = getLatestMigrationForTable(snapshot.table);

    if (!content.toLowerCase().includes(snapshot.table.toLowerCase())) {
        failures.push(`Snapshot ${path.basename(snapshot.filePath)} does not reference table ${snapshot.table}.`);
    }

    if (!marker) {
        failures.push(`Snapshot ${path.basename(snapshot.filePath)} is missing snapshot-source-migration marker.`);
        continue;
    }

    if (!latestMigration && marker !== 'none') {
        failures.push(`Snapshot ${path.basename(snapshot.filePath)} marker must be 'none' because no migration references ${snapshot.table}.`);
        continue;
    }

    if (latestMigration && marker !== latestMigration) {
        failures.push(`Snapshot ${path.basename(snapshot.filePath)} is stale. Expected marker ${latestMigration}, found ${marker}.`);
    }
}

if (failures.length > 0) {
    console.error('Supabase schema parity check failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
}

console.log('Supabase schema parity check passed.');
