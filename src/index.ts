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
  while (true) {
    console.log(`connected: ${connected}`);
    if (!connected) {
      console.log(`skipping since not connected...`);
    } else {
      //const _offsets = await sdk.offsets();
      console.log(`got info`, pond.info());
    }
    await new Promise((res) => setTimeout(res, 1_000));
  }
};

main();
