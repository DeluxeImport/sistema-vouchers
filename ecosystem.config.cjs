// Configuracion de PM2 para aaPanel (gestor de procesos Node).
// Arranca SOLO el servidor ya compilado. Las migraciones y el seed se ejecutan
// una vez en el despliegue con: npm --prefix backend run deploy:prod
//
// SQLite admite un solo escritor -> usar 1 instancia en modo fork (NO cluster).
module.exports = {
  apps: [
    {
      name: "sistema-vouchers",
      cwd: "./backend",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        // El resto de variables (JWT_SECRET, DATABASE_URL, STORAGE_PATH...)
        // se leen de backend/.env mediante dotenv.
      },
    },
  ],
};
