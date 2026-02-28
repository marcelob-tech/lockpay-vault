import { Connection, Keypair, PublicKey, SystemProgram, Commitment } from "@solana/web3.js";
import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
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

const defaultReceiverKeypair = Keypair.fromSecretKey(new Uint8Array(receiverWallet as any));

const deriveVault = (sender: PublicKey, receiver: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), sender.toBuffer(), receiver.toBuffer()],
    programId,
  )[0];

const deriveVaultAuthority = () =>
  PublicKey.findProgramAddressSync([Buffer.from("vault_authority")], programId)[0];

const parseReceiverArg = (receiverArg?: string) => {
  if (!receiverArg) {
    return defaultReceiverKeypair.publicKey;
  }

  const maybePath = path.isAbsolute(receiverArg)
    ? receiverArg
    : path.resolve(process.cwd(), receiverArg);

  if (fs.existsSync(maybePath)) {
    const raw = fs.readFileSync(maybePath, "utf8");
    const arr = JSON.parse(raw);
    return Keypair.fromSecretKey(new Uint8Array(arr)).publicKey;
  }

  return new PublicKey(receiverArg);
};

export const main = async (argv: string[] = process.argv) => {
  const receiverArg = argv[2];
  const amountArg = argv[3];
  const senderWalletPath = argv[4];

  const isJest = !!process.env.JEST_WORKER_ID;

  const senderKeypair = loadKeypair(senderWalletPath);
  const provider = new AnchorProvider(connection, new Wallet(senderKeypair), { commitment });
  const program = new Program(IDL as any, provider);

  const receiver = parseReceiverArg(receiverArg);
  const amountLamports = amountArg ? BigInt(amountArg) : 30_000_000n;

  const vault = deriveVault(senderKeypair.publicKey, receiver);
  const vaultAuthority = deriveVaultAuthority();

  const existing = await connection.getAccountInfo(vault, commitment);
  if (existing) {
    const owner = existing.owner.toBase58();
    const expected = programId.toBase58();
    if (existing.owner.equals(programId)) {
      throw new Error(
        `Vault PDA already initialized for sender=${senderKeypair.publicKey.toBase58()} receiver=${receiver.toBase58()} vault=${vault.toBase58()}. Use yarn ts:claim <receiver> [receiver_wallet.json] [sender] or yarn ts:cancel <sender> [sender_wallet.json] [receiver].`,
      );
    }
    throw new Error(
      `Vault PDA address is already in use by owner=${owner} (expected ${expected}). sender=${senderKeypair.publicKey.toBase58()} receiver=${receiver.toBase58()} vault=${vault.toBase58()}`,
    );
  }

  const signature = await program.methods
    .initializeVault(receiver, new BN(amountLamports.toString()))
    .accounts({
      sender: senderKeypair.publicKey,
      receiver,
      vault,
      vaultAuthority,
      systemProgram: SystemProgram.programId,
    })
    .signers([senderKeypair])
    .rpc();

  if (!isJest) {
    console.log(`Init success! https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    console.log(`sender:   ${senderKeypair.publicKey.toBase58()}`);
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
