import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import { expect } from "chai";

describe("lockpay-vault (integration)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const program = (anchor.workspace as any).LockpayVault as anchor.Program;

  const deriveVault = (sender: anchor.web3.PublicKey, receiver: anchor.web3.PublicKey) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), sender.toBuffer(), receiver.toBuffer()],
      program.programId,
    )[0];

  const deriveVaultAuthority = () =>
    anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("vault_authority")], program.programId)[0];

  before("ensure local validator is running", async () => {
    try {
      await provider.connection.getLatestBlockhash("confirmed");
    } catch (e) {
      throw new Error(
        `Unable to reach RPC at ${provider.connection.rpcEndpoint}. Start solana-test-validator (or set ANCHOR_PROVIDER_URL). Root error: ${e}`,
      );
    }
  });

  it("initialize + claim closes the vault", async () => {
    const sender = provider.wallet.publicKey;
    const receiverKp = anchor.web3.Keypair.generate();

    // Avoid requestAirdrop flakiness by funding the receiver from the provider wallet.
    // During `anchor test`, the provider wallet is funded by the local validator.
    const fundSig = await provider.sendAndConfirm(
      new anchor.web3.Transaction().add(
        anchor.web3.SystemProgram.transfer({
          fromPubkey: sender,
          toPubkey: receiverKp.publicKey,
          lamports: 2 * anchor.web3.LAMPORTS_PER_SOL,
        }),
      ),
      [],
      { commitment: "confirmed" },
    );
    await provider.connection.confirmTransaction(fundSig, "confirmed");

    const receiver = receiverKp.publicKey;
    const vault = deriveVault(sender, receiver);
    const vaultAuthority = deriveVaultAuthority();

    await program.methods
      // receiver, amount
      .initializeVault(receiver, new BN(20_000_000))
      .accounts({
        sender,
        receiver,
        vault,
        vaultAuthority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Use the workspace Program, but sign the transaction with the receiver keypair.
    await program.methods
      .claim()
      .accounts({
        receiver,
        vault,
        vaultAuthority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([receiverKp])
      .rpc();

    // Anchor's generic Program typing doesn't know our account namespace shape here.
    // The runtime account name is defined by the IDL.
    const vaultAccount = (program.account as any).vault;

    let threw = false;
    try {
      await vaultAccount.fetch(vault);
    } catch {
      threw = true;
    }
    expect(threw).to.eq(true);
  });

  it("initialize + cancel closes the vault", async () => {
    const sender = provider.wallet.publicKey;
    const receiver = anchor.web3.Keypair.generate().publicKey;

    const vault = deriveVault(sender, receiver);
    const vaultAuthority = deriveVaultAuthority();

    await program.methods
      .initializeVault(receiver, new BN(20_000_000))
      .accounts({
        sender,
        receiver,
        vault,
        vaultAuthority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .cancel()
      .accounts({
        sender,
        vault,
        vaultAuthority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const vaultAccount = (program.account as any).vault;

    let threw = false;
    try {
      await vaultAccount.fetch(vault);
    } catch {
      threw = true;
    }
    expect(threw).to.eq(true);
  });
});
