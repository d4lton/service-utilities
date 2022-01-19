/**
 * Copyright ©2021-2022 Dana Basken
 */

import {Redis} from "../Redis";
import {Config} from "@d4lton/utilities";

export function rate_limit() {

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {

    const method: Function = descriptor.value;

    const redis: Redis = target.redis || new Redis();

    const instanceKey = `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function(...args: any[]) {
      const rateLimitCount = Config.get(`service.${instanceKey}.rateLimit.count`, 2);
      const rateLimitResolutionMs = Config.get(`service.${instanceKey}.rateLimit.resolutionMs`, 1000);
      await redis.limit("blizzard.api", rateLimitCount, rateLimitResolutionMs);
      return await method.apply(target, args);
    }

  };
}
