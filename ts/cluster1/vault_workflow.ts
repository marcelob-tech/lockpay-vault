import { Keypair, PublicKey } from "@solana/web3.js";
import path from "path";

import senderWallet from "../../turbin3-wallet.json";
import receiverWallet from "../../receiver-wallet.json";

import { main as vaultInit } from "./vault_init";
import { main as claimVault } from "./claim_vault";
import { main as cancelVault } from "./cancel_lock_vault";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const runStep = async (label: string, expectedError: boolean, fn: () => Promise<void>) => {
  console.log(`\n====================`);
  console.log(`STEP: ${label}`);
  if (expectedError) {
    console.log(`(expected error)`);
  }
  console.log(`====================`);

  try {
    await fn();

    if (expectedError) {
      console.log(`WARNING: step completed without error, but an error was expected.`);
    } else {
      console.log(`OK: step completed successfully.`);
    }
  } catch (e) {
    if (expectedError) {
      console.log(`OK: expected error captured: ${e}`);
      return;
    }

    console.error(`Unexpected error in this step: ${e}`);
    throw e;
  }
};

(async () => {
  const senderKeypair = Keypair.fromSecretKey(new Uint8Array(senderWallet as any));
  const receiverKeypair = Keypair.fromSecretKey(new Uint8Array(receiverWallet as any));

  const senderPubkey = senderKeypair.publicKey;
  const receiverPubkey = receiverKeypair.publicKey;

  const senderWalletPath = path.normalize("turbin3-wallet.json");
  const receiverWalletPath = path.normalize("receiver-wallet.json");

  console.log(`Workflow started`);
  console.log(`sender:   ${senderPubkey.toBase58()}`);
  console.log(`receiver: ${receiverPubkey.toBase58()}`);

  // ----------------------
  // FLOW 1 – CLAIM WORKFLOW
  // ----------------------

  await runStep("Flow 1.1 - vault_init", false, async () => {
    await vaultInit(["node", "vault_init.ts"]);
  });

  await sleep(5000);

  await runStep("Flow 1.2 - claim_vault with invalid wallet", true, async () => {
    await claimVault([
      "node",
      "claim_vault.ts",
      receiverPubkey.toBase58(),
      senderWalletPath,
      senderPubkey.toBase58(),
    ]);
  });

  await sleep(5000);

  await runStep("Flow 1.3 - claim_vault with valid wallet", false, async () => {
    await claimVault(["node", "claim_vault.ts", receiverPubkey.toBase58(), receiverWalletPath, senderPubkey.toBase58()]);
  });

  await sleep(5000);

  // ----------------------
  // FLOW 2 – CANCEL WORKFLOW
  // ----------------------

  await runStep("Flow 2.1 - vault_init", false, async () => {
    await vaultInit(["node", "vault_init.ts"]);
  });

  await sleep(5000);

  await runStep("Flow 2.2 - cancel_lock_vault with invalid wallet", true, async () => {
    await cancelVault([
      "node",
      "cancel_lock_vault.ts",
      senderPubkey.toBase58(),
      receiverWalletPath,
      receiverPubkey.toBase58(),
    ]);
  });

  await sleep(5000);

  await runStep("Flow 2.3 - cancel_lock_vault with valid wallet", false, async () => {
    await cancelVault(["node", "cancel_lock_vault.ts", senderPubkey.toBase58(), senderWalletPath, receiverPubkey.toBase58()]);
  });

  console.log(`\nWorkflow finished`);
})().catch((e) => {
  console.error(`Workflow failed: ${e}`);
});
