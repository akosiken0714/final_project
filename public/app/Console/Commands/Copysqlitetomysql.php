<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PDO;
use Throwable;

/**
 * One command that turns the old SQLite database into an exact MySQL copy:
 *   1. creates the MySQL database if it does not exist
 *   2. builds every table with your migrations
 *   3. copies every row from database/database.sqlite
 *   4. compares row counts so you can see nothing was lost
 *
 * Run:  php artisan laundry:copy-sqlite-to-mysql
 */
class CopySqliteToMysql extends Command
{
    protected $signature = 'laundry:copy-sqlite-to-mysql
        {--source= : Path to the SQLite file (default: database/database.sqlite)}
        {--yes : Do not ask for confirmation}';

    protected $description = 'Create the MySQL database and copy every table and row from the old SQLite database';

    public function handle(): int
    {
        $source = $this->option('source') ?: database_path('database.sqlite');
        if (! is_file($source)) {
            $this->error("SQLite file not found: {$source}");

            return self::FAILURE;
        }

        $target = config('database.default');
        $cfg = config("database.connections.{$target}");
        if (! in_array($cfg['driver'] ?? '', ['mysql', 'mariadb'], true)) {
            $this->error("Your default connection is '{$target}'. Set DB_CONNECTION=mysql in .env first, then run: php artisan config:clear");

            return self::FAILURE;
        }

        $name = (string) ($cfg['database'] ?? '');
        if (! preg_match('/^[A-Za-z0-9_]+$/', $name)) {
            $this->error('DB_DATABASE in .env must only use letters, numbers and underscores (example: phinewash).');

            return self::FAILURE;
        }

        // 1. make sure MySQL is running and the database exists
        try {
            $pdo = new PDO(
                "mysql:host={$cfg['host']};port={$cfg['port']}",
                $cfg['username'],
                $cfg['password'] ?? '',
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
            );
            $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        } catch (Throwable $e) {
            $this->error('Could not reach MySQL. Is MySQL started in the XAMPP Control Panel, and are DB_HOST / DB_PORT / DB_USERNAME / DB_PASSWORD right in .env?');
            $this->line($e->getMessage());

            return self::FAILURE;
        }

        if (! $this->option('yes') && ! $this->confirm("This will ERASE everything inside the MySQL database '{$name}' and replace it with a copy of {$source}. Continue?", false)) {
            $this->warn('Cancelled. Nothing was changed.');

            return self::FAILURE;
        }

        config(['database.connections.old_sqlite' => [
            'driver' => 'sqlite',
            'database' => $source,
            'prefix' => '',
            'foreign_key_constraints' => false,
        ]]);
        $old = DB::connection('old_sqlite');
        $new = DB::connection($target);

        // 2. build the tables
        $this->info('1/3  Building the tables in MySQL...');
        $this->call('migrate:fresh', ['--force' => true]);

        // 3. copy the rows
        $this->info('2/3  Copying the data...');
        $tables = collect($old->select("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name"))
            ->pluck('name')
            ->reject(fn ($t) => $t === 'migrations') // already filled in by migrate:fresh
            ->values();

        $schema = Schema::connection($target);
        $schema->disableForeignKeyConstraints();

        $report = [];
        $allGood = true;

        foreach ($tables as $table) {
            if (! $schema->hasTable($table)) {
                $this->warn("  {$table}: no such table in MySQL, skipped");
                $report[] = [$table, $old->table($table)->count(), '-', 'SKIPPED'];
                $allGood = false;

                continue;
            }

            try {
                $batch = [];
                foreach ($old->table($table)->cursor() as $row) {
                    $batch[] = (array) $row;
                    if (count($batch) >= 500) {
                        $new->table($table)->insert($batch);
                        $batch = [];
                    }
                }
                if ($batch) {
                    $new->table($table)->insert($batch);
                }
            } catch (Throwable $e) {
                $this->error("  {$table}: {$e->getMessage()}");
            }

            $before = $old->table($table)->count();
            $after = $new->table($table)->count();
            $ok = $before === $after;
            $allGood = $allGood && $ok;
            $report[] = [$table, $before, $after, $ok ? 'yes' : 'NO'];
        }

        $schema->enableForeignKeyConstraints();

        // 4. proof
        $this->info('3/3  Checking the copy...');
        $this->table(['Table', 'Old (SQLite)', 'New (MySQL)', 'Match'], $report);

        if ($allGood) {
            $this->info("Done. '{$name}' is now an exact copy of your old database. Open http://localhost/phpmyadmin to see it.");

            return self::SUCCESS;
        }

        $this->error('Some tables did not match. Read the messages above and send them to me.');

        return self::FAILURE;
    }
}