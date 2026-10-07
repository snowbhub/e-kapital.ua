import { spawn } from "node:child_process";
const child = spawn(process.execPath, [".next/standalone/server.js"], {
  stdio: "inherit",
  env: {
    ...process.env,
    HOSTNAME: "0.0.0.0",
    PORT: process.env.PORT || "3000",
  },
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));

// Retention runs independently of analytics opt-in or visits, while the service is running.
if (process.env.DATABASE_URL) {
  let maintenanceBusy = false;
  const maintenance = async () => {
    if (maintenanceBusy) return;
    maintenanceBusy = true;
    let pool;
    try {
      const { Pool } = await import("pg");
      const connection = new URL(process.env.DATABASE_URL);
      const ca = process.env.DATABASE_CA_CERT;
      if (ca) {
        connection.searchParams.delete("sslmode");
        connection.searchParams.delete("sslrootcert");
      }
      pool = new Pool({
        connectionString: connection.toString(),
        ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : {}),
        max: 1,
        connectionTimeoutMillis: 5000,
        statement_timeout: 10000,
      });
      const schema = await pool.query(
        "SELECT to_regclass('capital_private.events') AS table_name",
      );
      if (!schema.rows[0]?.table_name) return;
      await pool.query(
        "DELETE FROM capital_private.events WHERE created_at<now()-interval '90 days'",
      );
      await pool.query(
        "UPDATE capital_private.locations SET encrypted_ip=NULL WHERE checked_at<now()-interval '7 days' AND encrypted_ip IS NOT NULL",
      );
      for (const table of ["sessions", "challenges", "limits"]) {
        await pool.query(
          `DELETE FROM capital_private.${table} WHERE expires_at<now()`,
        );
      }
      await pool.query(
        "DELETE FROM capital_private.audit WHERE created_at<now()-interval '365 days'",
      );
    } catch {
      console.warn("Account retention maintenance unavailable; will retry");
    } finally {
      await pool?.end();
      maintenanceBusy = false;
    }
  };
  void maintenance();
  setInterval(() => void maintenance(), 3600000).unref();
}
