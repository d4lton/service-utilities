/**
 * Copyright ©2021 Dana Basken
 */

import log4js from "log4js";
import {Model} from "objection"
import Knex from "knex";
import {Config, Utilities} from "@d4lton/utilities";
import {synchronized} from "./decorators/synchronized";

const logger = log4js.getLogger("DatabaseService");

export class DatabaseService {

  static knex?: any;

  static async start(options: any = {migrate: false, traceQueries: false}) {
    if (DatabaseService.knex) { throw new Error("DatabaseService has already been initialized") }
    const config = Config.get("knex");
    if (!config) { throw new Error("knex configuration not found") }
    DatabaseService.knex = Knex(config);
    if (options.traceQueries) { DatabaseService.knex.on("query", (data: any) => logger.trace(data?.sql, data?.bindings)) }
    await DatabaseService.ensureDatabaseIsRunning();
    if (options.migrate) { await DatabaseService.migrate() }
    Model.knex(DatabaseService.knex);
  }

  static async ensureDatabaseIsRunning() {
    const sleepMs = Config.get("db.check_sleep_ms", 10000);
    const maxRetries = Config.get("db.check_max_retries", 30)
    return new Promise<void>(async (resolve, reject) => {
      let running = true;
      let retries = 0;
      while (running) {
        try {
          await DatabaseService.knex.raw("select 1");
          return resolve();
        } catch (error: any) {
          logger.warn(error.message);
        }
        if (retries > maxRetries) {
          logger.error(`could not connect to database after ${retries} retries`);
          return reject();
        }
        await Utilities.sleep(sleepMs);
        retries++;
      }
    });
  }

  @synchronized()
  static async migrate() {
    const result = await DatabaseService.knex.migrate.latest();
    if (!Array.isArray(result) || result?.length !== 2) { throw new Error("Unknown migration result") }
    const version = result[0];
    const migrations = result[1];
    logger.debug(`database version: ${version}`);
    if (migrations.length) {
      logger.debug("database migrations run:");
      migrations.forEach((migration: any) => {
        logger.debug(`  ${migration}`);
      });
    }
  }

  @synchronized()
  static async rollback() {
    return DatabaseService.knex.migrate.rollback();
  }

}
