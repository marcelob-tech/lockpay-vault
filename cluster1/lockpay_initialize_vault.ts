import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import wallet from "../turbin3-wallet.json";

const programId = new PublicKey("4e8sbrp3VH4HnrC3tgy6fQ1AnzYXG5jsLZC4CQFnayER");

const INITIALIZE_VAULT_DISCRIMINATOR = Uint8Array.from([
  48, 191, 163, 44, 71, 129, 63, 164,
]);

const payer = Keypair.fromSecretKey(new Uint8Array(wallet as any));
const commitment = "confirmed" as const;
const connection = new Connection("https://api.devnet.solana.com", commitment);

const deriveVault = (sender: PublicKey, receiver: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), sender.toBuffer(), receiver.toBuffer()],
    programId,
  )[0];
};

const deriveVaultAuthority = () => {
  return PublicKey.findProgramAddressSync([Buffer.from("vault_authority")], programId)[0];
};

const encodeU64LE = (n: bigint) => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(n);
  return buf;
};

const buildInitializeVaultIx = (receiver: PublicKey, amountLamports: bigint) => {
  const vault = deriveVault(payer.publicKey, receiver);
  const vaultAuthority = deriveVaultAuthority();

  const data = Buffer.concat([
    Buffer.from(INITIALIZE_VAULT_DISCRIMINATOR),
    receiver.toBuffer(),
    encodeU64LE(amountLamports),
  ]);

  const keys = [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: receiver, isSigner: false, isWritable: false },
    { pubkey: vault, isSigner: false, isWritable: true },
    { pubkey: vaultAuthority, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({ programId, keys, data });
};

(async () => {
  try {
    const receiver = Keypair.generate().publicKey;
    const ix = buildInitializeVaultIx(receiver, 1_000_000n);
    const tx = new Transaction().add(ix);

    const signature = await sendAndConfirmTransaction(connection, tx, [payer], {
      commitment,
    });

    console.log(
      `Init sent! https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    );
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();
