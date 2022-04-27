/// This file contains an example of how one could retry upon the Actyx SDK
/// losing connection to the locally running Actyx node.

import { Actyx as SDK, AppManifest } from "@actyx/sdk";
import { Pond } from "@actyx/pond";

export const main = async () => {
  console.log("starting...");

  const manifest: AppManifest = {
    appId: "com.example.nodejs-reload",
    displayName: "Nodejs reload example",
    version: "1.0.0",
  };

  let connected = false;

  const sdk = await SDK.of(manifest, {
    onConnectionEstablished: () => {
      console.log(`connection established`);
      connected = true;
    },
    onConnectionLost: () => {
      console.log(`connection lost`);
      connected = false;
    },
  });

  const pond = Pond.from(sdk, {});

  // Perform your actual work
  //while (true) {
  //  console.log(`connected: ${connected}`);
  //  if (!connected) {
  //    console.log(`skipping since not connected...`);
  //  } else {
  //    //const _offsets = await sdk.offsets();
  //    console.log(`got info`, pond.info());
  //  }
  //  await new Promise((res) => setTimeout(res, 1_000));
  //}

  while (true) {
    console.log(`connected: ${connected}`);
    if (!connected) {
      console.log(`skipping since not connected...`);
    } else {
      try {
        console.log(`starting subscription`);
        // Start the subscription and do something with the results (never ends)
        await new Promise<void>((resolve, reject) => {
          const cancel = sdk.subscribeAql(
            `FEATURES(timeRange) FROM allEvents & from(2023-01-01T00:00:00.000Z)`,
            () => {
              // Just an example to show how to cancel; this will lead to the next
              // while loop which will re-start the subscription. Not necessary of
              // course, but just showing how to ensure we don't have memory leaks.
              setTimeout(() => {
                cancel();
                resolve();
              }, 10_000);
            },
            (err) => {
              // No need to call cancel in the case of an error
              reject(err);
            }
          );
        });
      } catch (error) {
        console.log(`caught error in subscription`);
        console.error(error);
      }
    }

    await new Promise((res) => setTimeout(res, 1_000));
  }
};

main();
