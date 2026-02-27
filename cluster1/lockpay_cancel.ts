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

const CANCEL_DISCRIMINATOR = Uint8Array.from([232, 219, 223, 41, 219, 236, 220, 190]);

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

const buildCancelIx = (sender: PublicKey, receiver: PublicKey) => {
  const vault = deriveVault(sender, receiver);
  const vaultAuthority = deriveVaultAuthority();

  const data = Buffer.from(CANCEL_DISCRIMINATOR);
  const keys = [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: vault, isSigner: false, isWritable: true },
    { pubkey: vaultAuthority, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({ programId, keys, data });
};

(async () => {
  try {
    const receiver = new PublicKey(process.argv[2] ?? payer.publicKey.toBase58());
    const sender = payer.publicKey;

    const ix = buildCancelIx(sender, receiver);
    const tx = new Transaction().add(ix);

    const signature = await sendAndConfirmTransaction(connection, tx, [payer], {
      commitment,
    });

    console.log(
      `Cancel sent! https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    );
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();
