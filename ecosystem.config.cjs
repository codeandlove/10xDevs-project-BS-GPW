/* eslint-env node */
module.exports = {
  apps: [
    {
      name: "BSGPW",
      script: "./dist/server/entry.mjs",

      cwd: "/home/deploy/apps/bsgpw",

      instances: 1,
      exec_mode: "fork",
      env_file: ".env",

      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "0.0.0.0",
      },
    },
  ],
};
