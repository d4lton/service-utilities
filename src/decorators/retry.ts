/**
 * Copyright ©2021 Dana Basken
 */

import log4js from "log4js";
import {Utilities} from "@d4lton/utilities";

const logger = log4js.getLogger("retry");

export function retry(maxRetries: number = 5, baseSleepMs: number = 200, type: string = "geometric") {

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {

    const method: Function = descriptor.value;

    descriptor.value = async function(...args: any[]) {

      let retries = 0;
      let lastError: any;

      function getSleepMs(): number {
        if (type === "geometric") { return Math.pow(2, retries) * baseSleepMs }
        return (retries + 1) * baseSleepMs;
      }

      while (retries <= maxRetries) {
        try {
          return await method.apply(target, args);
        } catch (error: any) {
          lastError = error;
          retries++;
          if (retries <= maxRetries) {
            const sleepMs = getSleepMs();
            logger.trace(`failed with ${error.message}, retrying after ${sleepMs}ms`);
            await Utilities.sleep(sleepMs);
          }
        }
      }

      throw lastError || Error("retries failed");

    }

  };
}
