import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { Commitment, Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import wallet from "../../turbin3-wallet.json";
import receiverWallet from "../../receiver-wallet.json";
import { IDL } from "./programs/lockpay_vault";

const loadKeypair = (walletPath?: string) => {
  if (!walletPath) return null;

  const abs = path.isAbsolute(walletPath) ? walletPath : path.resolve(process.cwd(), walletPath);
  const raw = fs.readFileSync(abs, "utf8");
  const arr = JSON.parse(raw);
  return Keypair.fromSecretKey(new Uint8Array(arr));
};

const senderKeypair = Keypair.fromSecretKey(new Uint8Array(wallet as any));
const defaultReceiverKeypair = Keypair.fromSecretKey(new Uint8Array(receiverWallet as any));

const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

const programId = new PublicKey((IDL as any).address);

const deriveVault = (sender: PublicKey, receiver: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), sender.toBuffer(), receiver.toBuffer()],
    programId,
  )[0];

const deriveVaultAuthority = () =>
  PublicKey.findProgramAddressSync([Buffer.from("vault_authority")], programId)[0];

export const main = async (argv: string[] = process.argv) => {
  const receiverArg = argv[2];
  const receiverWalletPath = argv[3];
  const senderArg = argv[4];

  const isJest = !!process.env.JEST_WORKER_ID;

  const receiverKeypair = loadKeypair(receiverWalletPath) ?? defaultReceiverKeypair;
  const provider = new AnchorProvider(connection, new Wallet(receiverKeypair), { commitment });
  const program = new Program(IDL as any, provider);

  const sender = senderArg ? new PublicKey(senderArg) : senderKeypair.publicKey;
  const receiver = receiverArg ? new PublicKey(receiverArg) : receiverKeypair.publicKey;

  if (receiverArg && !receiver.equals(receiverKeypair.publicKey)) {
    throw new Error(
      `Receiver signer mismatch: receiver arg=${receiver.toBase58()} but signer wallet=${receiverKeypair.publicKey.toBase58()}`,
    );
  }

  const vault = deriveVault(sender, receiver);
  const vaultAuthority = deriveVaultAuthority();

  const vaultInfo = await connection.getAccountInfo(vault, commitment);
  if (!vaultInfo) {
    throw new Error(
      `Vault PDA not initialized for sender=${sender.toBase58()} receiver=${receiver.toBase58()} vault=${vault.toBase58()}`,
    );
  }
  if (!vaultInfo.owner.equals(programId)) {
    throw new Error(`Vault PDA owner is ${vaultInfo.owner.toBase58()}, expected ${programId.toBase58()}`);
  }

  const signature = await program.methods
    .claim()
    .accounts({
      receiver,
      vault,
      vaultAuthority,
      systemProgram: SystemProgram.programId,
    })
    .signers([receiverKeypair])
    .rpc();

  if (!isJest) {
    console.log(`Claim success! https://explorer.solana.com/tx/${signature}?cluster=devnet`);
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
