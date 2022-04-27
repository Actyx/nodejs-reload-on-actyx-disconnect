/// This file contains an example of how one could retry upon the Actyx SDK
/// losing connection to the locally running Actyx node.
///
/// This file contains three important functions:
///
/// 1. `loadSdk`
/// This function is used to load the Actyx SDK. It returns that SDK as well
/// as a promise which will resolve whenever the SDK loses its connection to
/// the local Actyx node. This allows the caller to use the SDK, but also wait
/// for a possible disconnect. It is used by the next function.
///
/// 2. `withSdk`
/// This function takes another function which needs the SDK to run. It then
/// creates the SDK (using the `loadSdk` function) and provides the returned
/// SDK to the given function which can then use it. It also waits for a
/// possible disconnect of the SDK and throws an exception in that case. The
/// provided function does not have to deal with disconnects.
///
/// 3. `withRetry`
/// This function takes another function and runs it. If the function fails
/// with an exception, it will retry running that function. Depending on how
/// it is configured it will retry it forever, or a specific maximum number
/// of tries. Depending on how it is configured it will also possibly wait a
/// number of milliseconds before retrying.
///
///
/// Add the bottom of the file (in the `main` function) you will find an
/// example of how to use this. Note that the `run` function is the important
/// one which will contain your code that use the SDK.

import { Actyx as SDK, AppManifest } from "@actyx/sdk";
import { Pond } from "@actyx/pond";

/** Sleep for the given number of milliseconds */
const sleep = (ms: number): Promise<void> =>
  new Promise((res) => setTimeout(res, ms));

/**
 * This function returns a promise containing a tuple of the SDK and a promise that will resolve if and
 * when the SDK loses its connection to the Actyx node. Note that the first promise may throw if the SDK
 * is not able to initially connect to Actyx. The second promise will never throw.
 */
const loadSdk = async (
  manifest: AppManifest
): Promise<[SDK, Promise<Error>]> => {
  let onConnectionLost: (error: Error) => void = () => {};
  const connectionLost = new Promise<Error>((res) => {
    onConnectionLost = res;
  });
  const sdk = await SDK.of(manifest, {
    onConnectionLost: () => {
      onConnectionLost(
        new Error(`Actyx SDK lost its connection to the local Actyx node`)
      );
    },
  });
  return [sdk, connectionLost];
};

/** Load the Actyx SDK and run the given function with it */
const withSdk = async <T>(
  manifest: AppManifest,
  run: (sdk: SDK) => Promise<T>
): Promise<T> => {
  const [sdk, connectionWasLost] = await loadSdk(manifest);
  const result = await Promise.race([run(sdk), connectionWasLost]);
  if (result instanceof Error) {
    throw result;
  }
  sdk.dispose();
  return result;
};

/**
 * Retry the given function the configured number of times with the configured timeout between each try. This function
 * takes a runner which returns an Either. Upon success, the Right is returned. Upon Left, the function is retries as
 * many times as configured. If the maximum number of retries is reached, this function returns the last Left.
 */
const withRetry =
  <T>(cfg?: { retryTimeoutMs?: number; maxRetries?: number }) =>
  async (run: () => T | Promise<T>): Promise<T> => {
    let numRetries = 0;
    const retryTimeout =
      cfg?.retryTimeoutMs !== undefined ? cfg.retryTimeoutMs : 0;
    while (true) {
      try {
        const res = await run();
        return res;
      } catch (error) {
        if (numRetries === 0) {
          console.error(`Got error on first run`, error);
        } else {
          console.error(
            `Got error on retry ${numRetries} of ${
              cfg?.maxRetries || "unlimited"
            }`,
            error
          );
        }
        numRetries++;
        // Allow for infinite retries
        if (cfg?.maxRetries !== undefined && numRetries > cfg.maxRetries) {
          console.info(
            `Aboring further running since we have retried max number of times (${cfg.maxRetries})`
          );
          throw error; // Throw the error to the caller if we have reached the maximum number of retries
        } else {
          console.info(
            `Will try again in ${retryTimeout}ms (num retries so far: ${
              numRetries - 1
            })`
          );
          await sleep(retryTimeout);
        }
      }
    }
  };

/** Example run function which returns a boolean for demonstration purposes */
const run = async (sdk: SDK): Promise<boolean> => {
  console.log(`starting to run with Actyx...`);

  // Setup an Actyx Pond if you want to use that; instead of creating it manually,
  // you can (since the most recent release of @actyx/pond), just pass the SDK into
  // the Pond.
  const pond = Pond.from(sdk, {});

  console.log(pond.info())
  while(true) {
    console.log(pond.info())
    await new Promise((res) => setTimeout(res, 100_000_000));
  }
  
  return true;
};

export const main = async () => {
  console.log("starting...");

  const manifest: AppManifest = {
    appId: "com.example.nodejs-reload",
    displayName: "Nodejs reload example",
    version: "1.0.0",
  };

  try {
    // Here we use both the `withRetry` and `withSdk` functions togther. If you
    // don't ever want the program to end, i.e. you want it to keep retrying, just
    // remove the maxRetries field. If you don't want to wait between retries (this
    // is a bad idea in the case of I/O such as here), remove the retryTimeoutMs
    // field.
    const result = withRetry<boolean>({
      maxRetries: 10,
      retryTimeoutMs: 500,
    })(() => withSdk(manifest, run));

    console.log(`the program ended successfully with result ${result}`);
  } catch (error) {
    console.error(`the program ended unsuccessfully`);
  }
};

main();
