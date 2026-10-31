import { DataSource } from "typeorm";
import databaseConfig from "@soundcircle/shared/config/database.config";

/** The DataSource the migration and seed CLI resolve. */
const AppDataSource = new DataSource(databaseConfig);

AppDataSource.initialize()
  .then(() => {
    console.log("Data Source has been initialized!");
  })
  .catch((err) => {
    console.error("Error during Data Source initialization", err);
  });

export default AppDataSource;
