import { Connection, Keypair, PublicKey, SystemProgram, Commitment } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";
import wallet from "../../turbin3-wallet.json";
import receiverWallet from "../../receiver-wallet.json";
import { IDL } from "./programs/lockpay_vault";

const loadKeypair = (walletPath?: string) => {
  if (!walletPath) {
    return Keypair.fromSecretKey(new Uint8Array(wallet as any));
  }

  const abs = path.isAbsolute(walletPath) ? walletPath : path.resolve(process.cwd(), walletPath);
  const raw = fs.readFileSync(abs, "utf8");
  const arr = JSON.parse(raw);
  return Keypair.fromSecretKey(new Uint8Array(arr));
};

const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

const programId = new PublicKey((IDL as any).address);
const defaultReceiverPubkey = Keypair.fromSecretKey(new Uint8Array(receiverWallet as any)).publicKey;

const deriveVault = (sender: PublicKey, receiver: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), sender.toBuffer(), receiver.toBuffer()],
    programId,
  )[0];

const deriveVaultAuthority = () =>
  PublicKey.findProgramAddressSync([Buffer.from("vault_authority")], programId)[0];

const normalizeArgs = (argv: string[]) => {
  if (argv[2] === "-e") {
    return argv.slice(4);
  }

  const scriptIdx = argv.findIndex((a) => a.endsWith("cancel_lock_vault.ts"));
  if (scriptIdx !== -1) {
    return argv.slice(scriptIdx + 1);
  }

  return argv.slice(2);
};

export const main = async (argv: string[] = process.argv) => {
  const args = normalizeArgs(argv);
  const senderArg = args[0];
  const senderWalletPath = args[1];
  const receiverArg = args[2];

  const isJest = !!process.env.JEST_WORKER_ID;

  if (!senderArg) {
    throw new Error("Usage: yarn ts:cancel <SENDER_PUBKEY> [SENDER_WALLET_JSON_PATH] [RECEIVER_PUBKEY]");
  }

  const keypair = loadKeypair(senderWalletPath);
  const provider = new AnchorProvider(connection, new Wallet(keypair), { commitment });
  const program = new Program(IDL as any, provider);

  const sender = new PublicKey(senderArg);
  const receiver = receiverArg ? new PublicKey(receiverArg) : defaultReceiverPubkey;

  const vault = deriveVault(sender, receiver);
  const vaultAuthority = deriveVaultAuthority();

  const signature = await program.methods
    .cancel()
    .accounts({
      sender,
      vault,
      vaultAuthority,
      systemProgram: SystemProgram.programId,
    })
    .signers([keypair])
    .rpc();

  if (!isJest) {
    console.log(`Cancel success! https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    console.log(`sender:   ${sender.toBase58()}`);
    console.log(`receiver: ${receiver.toBase58()}`);
    console.log(`vault:    ${vault.toBase58()}`);
    console.log(`vaultAuthority: ${vaultAuthority.toBase58()}`);
  }
};

if (process.env.JEST_WORKER_ID) {
  main().catch((e) => {
    console.error(`Oops, something went wrong: ${e}`);
  });
}
