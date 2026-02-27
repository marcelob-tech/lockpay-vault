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

(async () => {
  try {
    const senderArg = process.argv[2];
    const senderWalletPath = process.argv[3];
    const receiverArg = process.argv[4];

    if (!senderArg) {
      throw new Error("Usage: yarn ts:cancel <SENDER_PUBKEY> [SENDER_WALLET_JSON_PATH] [RECEIVER_PUBKEY]");
    }

    const keypair = loadKeypair(senderWalletPath);
    const provider = new AnchorProvider(connection, new Wallet(keypair), { commitment });
    const program = new Program(IDL as any, provider);

    const sender = new PublicKey(senderArg);
    const receiver = receiverArg ? new PublicKey(receiverArg) : defaultReceiverPubkey;

    if (!sender.equals(keypair.publicKey)) {
      throw new Error(
        `Sender signer mismatch: sender arg=${sender.toBase58()} but signer wallet=${keypair.publicKey.toBase58()}`,
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
      throw new Error(
        `Vault PDA owner is ${vaultInfo.owner.toBase58()}, expected ${programId.toBase58()}`,
      );
    }

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

    console.log(`Cancel success! https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    console.log(`sender:   ${sender.toBase58()}`);
    console.log(`receiver: ${receiver.toBase58()}`);
    console.log(`vault:    ${vault.toBase58()}`);
    console.log(`vaultAuthority: ${vaultAuthority.toBase58()}`);
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();
