import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import BN from "bn.js";
import { expect } from "chai";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("lockpay_vault (devnet smoke)", () => {
  const commitment: anchor.web3.Commitment = "confirmed";

  const loadKeypair = (path: string) => {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    return anchor.web3.Keypair.fromSecretKey(new Uint8Array(raw));
  };

  const payer = loadKeypair(resolve(process.env.ANCHOR_WALLET ?? "~/.config/solana/id.json".replace("~", process.env.HOME ?? "")));

  const connection = new anchor.web3.Connection(
    process.env.ANCHOR_PROVIDER_URL ?? "https://api.devnet.solana.com",
    commitment,
  );

  const provider = new AnchorProvider(connection, new Wallet(payer), { commitment });
  anchor.setProvider(provider);

  const program = anchor.workspace.LockpayVault as any;

  const sender = anchor.web3.Keypair.generate();
  const receiver = anchor.web3.Keypair.generate();

  const deriveVault = (s: anchor.web3.PublicKey, r: anchor.web3.PublicKey) => {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), s.toBuffer(), r.toBuffer()],
      program.programId,
    )[0];
  };

  const deriveVaultAuthority = () => {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault_authority")],
      program.programId,
    )[0];
  };

  const fundFromPayer = async (to: anchor.web3.PublicKey, lamports: number) => {
    const ix = anchor.web3.SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: to,
      lamports,
    });

    const tx = new anchor.web3.Transaction().add(ix);
    await anchor.web3.sendAndConfirmTransaction(connection, tx, [payer], {
      commitment,
    });
  };

  before(async () => {
    await fundFromPayer(sender.publicKey, 20_000_000); // 0.02 SOL
    await fundFromPayer(receiver.publicKey, 20_000_000); // 0.02 SOL
  });

  it("initialize_vault -> claim", async () => {
    const amount = new BN(5_000_000); // 0.005 SOL

    const vault = deriveVault(sender.publicKey, receiver.publicKey);
    const vaultAuthority = deriveVaultAuthority();

    await program.methods
      .initializeVault(receiver.publicKey, amount)
      .accounts({
        sender: sender.publicKey,
        receiver: receiver.publicKey,
        vault,
        vaultAuthority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([sender])
      .rpc();

    await program.methods
      .claim()
      .accounts({
        receiver: receiver.publicKey,
        vault,
        vaultAuthority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([receiver])
      .rpc();

    const state: any = await program.account["vault"].fetch(vault);
    expect(state.claimed).to.eq(true);
  });
});
