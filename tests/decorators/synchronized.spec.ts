/**
 * Copyright ©2021 Dana Basken
 */

import {assert} from "chai";
import {synchronized} from "../../src/decorators/synchronized";
import {Utilities} from "@d4lton/utilities";

describe("synchronized", function() {

  class TestService {
    @synchronized({retrySleepMs: 10})
    async testTask(sleepMs: number, object: any): Promise<void> {
      const random = Math.random();
      object.index += random;
      await Utilities.sleep(sleepMs);
      object.index -= random;
    }
  }

  it("@synchronized should only allow one method at a time", async () => {
    const taskCount = 5;
    const sleepMs = 100;
    const startMs = Date.now();
    const service = new TestService();
    const promises: Promise<void>[] = [];
    const object = {index: 0};
    for (let i = 0; i < taskCount; i++) {
      setTimeout(async () => promises.push(service.testTask(sleepMs, object)), 0);
    }
    await service.testTask(sleepMs, object);
    await Promise.all(promises);
    const elapsedMs = Date.now() - startMs;
    assert.isAbove(elapsedMs, sleepMs + (sleepMs * taskCount));
    assert.equal(0, object.index);
  });

});
