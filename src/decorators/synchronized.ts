/**
 * Copyright ©2021-2022 Dana Basken
 */

import crypto from "crypto";
import {Redis} from "../Redis";
import {EnglishMs} from "@d4lton/utilities";

export function synchronized(options: any = {argExpression: undefined, timeoutMs: EnglishMs.ms("15m"), retrySleepMs: undefined}) {

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const method: Function = descriptor.value;
    const redis: Redis = target.redis || new Redis();
    descriptor.value = async function(...args: any[]) {
      let hash = `${target.constructor.name}.${propertyKey}`;
      if (options.argExpression) {
        hash = `${hash}.${crypto.createHash("md5").update(eval(options.argExpression)).digest("hex").toString()}`;
      }
      const key = `synchronized.${hash}`;
      let lock;
      try {
        lock = await redis.getLock(key, true, options.timeoutMs, options.retrySleepMs);
        return await method.apply(target, args);
      } finally {
        if (lock) { await redis.unlock(lock) }
      }
    }
  };

}
