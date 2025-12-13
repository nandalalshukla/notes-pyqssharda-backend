// src/config/env.ts
import path from "path";
import dotenv from "dotenv";

const env = process.env.NODE_ENV || "development";
//getting the absolute path of the env file earlier node was looking for env file in the src foleder but now it will look in the folder where the command is run
const pathToEnvFile = path.resolve(process.cwd(), `.env.${env}`.trim());
dotenv.config({
  path: pathToEnvFile,
  override: true,
});
