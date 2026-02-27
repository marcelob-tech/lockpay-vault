import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import { expect } from "chai";

describe("lockpay_vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const connection = provider.connection;

  const program = anchor.workspace.LockpayVault as any;

  const sender = anchor.web3.Keypair.generate();
  const receiver = anchor.web3.Keypair.generate();
  const attacker = anchor.web3.Keypair.generate();

  const fund = async (pubkey: anchor.web3.PublicKey, sol = 2) => {
    const lamports = Math.floor(sol * anchor.web3.LAMPORTS_PER_SOL);
    const sig = await connection.requestAirdrop(pubkey, lamports);
    await connection.confirmTransaction(sig, "confirmed");
  };

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

  before(async () => {
    await fund(sender.publicKey);
    await fund(receiver.publicKey);
    await fund(attacker.publicKey);
  });

  it("Successful initialization", async () => {
    const amount = new BN(0.05 * anchor.web3.LAMPORTS_PER_SOL);

    const vault = deriveVault(sender.publicKey, receiver.publicKey);
    const vaultAuthority = deriveVaultAuthority();

    const beforeAuthority = await connection.getBalance(vaultAuthority);

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

    const state: any = await program.account["vault"].fetch(vault);

    expect(state.sender.toBase58()).to.eq(sender.publicKey.toBase58());
    expect(state.receiver.toBase58()).to.eq(receiver.publicKey.toBase58());
    expect(state.amount.toNumber()).to.eq(amount.toNumber());
    expect(state.claimed).to.eq(false);

    const afterAuthority = await connection.getBalance(vaultAuthority);
    expect(afterAuthority - beforeAuthority).to.be.greaterThanOrEqual(amount.toNumber());
  });

  it("Successful claim", async () => {
    const vault = deriveVault(sender.publicKey, receiver.publicKey);
    const vaultAuthority = deriveVaultAuthority();

    const receiverBefore = await connection.getBalance(receiver.publicKey);

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

    const receiverAfter = await connection.getBalance(receiver.publicKey);
    expect(receiverAfter).to.be.greaterThan(receiverBefore);

    const state: any = await program.account["vault"].fetch(vault);
    expect(state.claimed).to.eq(true);
  });

  it("Prevent double claim", async () => {
    const vault = deriveVault(sender.publicKey, receiver.publicKey);
    const vaultAuthority = deriveVaultAuthority();

    let threw = false;
    try {
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
    } catch {
      threw = true;
    }

    expect(threw).to.eq(true);
  });

  it("Prevent cancel after claim", async () => {
    const vault = deriveVault(sender.publicKey, receiver.publicKey);
    const vaultAuthority = deriveVaultAuthority();

    let threw = false;
    try {
      await program.methods
        .cancel()
        .accounts({
          sender: sender.publicKey,
          vault,
          vaultAuthority,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([sender])
        .rpc();
    } catch {
      threw = true;
    }

    expect(threw).to.eq(true);
  });

  it("Unauthorized claim fails", async () => {
    const vault2Sender = anchor.web3.Keypair.generate();
    const vault2Receiver = anchor.web3.Keypair.generate();

    await fund(vault2Sender.publicKey);
    await fund(vault2Receiver.publicKey);

    const amount = new BN(0.025 * anchor.web3.LAMPORTS_PER_SOL);

    const vault = deriveVault(vault2Sender.publicKey, vault2Receiver.publicKey);
    const vaultAuthority = deriveVaultAuthority();

    await program.methods
      .initializeVault(vault2Receiver.publicKey, amount)
      .accounts({
        sender: vault2Sender.publicKey,
        receiver: vault2Receiver.publicKey,
        vault,
        vaultAuthority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([vault2Sender])
      .rpc();

    let threw = false;
    try {
      await program.methods
        .claim()
        .accounts({
          receiver: attacker.publicKey,
          vault,
          vaultAuthority,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([attacker])
        .rpc();
    } catch {
      threw = true;
    }

    expect(threw).to.eq(true);
  });

  it("Successful cancel", async () => {
    const vault3Sender = anchor.web3.Keypair.generate();
    const vault3Receiver = anchor.web3.Keypair.generate();

    await fund(vault3Sender.publicKey);
    await fund(vault3Receiver.publicKey);

    const amount = new BN(0.02 * anchor.web3.LAMPORTS_PER_SOL);

    const vault = deriveVault(vault3Sender.publicKey, vault3Receiver.publicKey);
    const vaultAuthority = deriveVaultAuthority();

    await program.methods
      .initializeVault(vault3Receiver.publicKey, amount)
      .accounts({
        sender: vault3Sender.publicKey,
        receiver: vault3Receiver.publicKey,
        vault,
        vaultAuthority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([vault3Sender])
      .rpc();

    const senderBefore = await connection.getBalance(vault3Sender.publicKey);

    await program.methods
      .cancel()
      .accounts({
        sender: vault3Sender.publicKey,
        vault,
        vaultAuthority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([vault3Sender])
      .rpc();

    const senderAfter = await connection.getBalance(vault3Sender.publicKey);
    expect(senderAfter).to.be.greaterThan(senderBefore);

    let closed = false;
    try {
      await program.account["vault"].fetch(vault);
    } catch {
      closed = true;
    }
    expect(closed).to.eq(true);
  });

  it("Unauthorized cancel fails", async () => {
    const vault4Sender = anchor.web3.Keypair.generate();
    const vault4Receiver = anchor.web3.Keypair.generate();

    await fund(vault4Sender.publicKey);
    await fund(vault4Receiver.publicKey);

    const amount = new BN(0.015 * anchor.web3.LAMPORTS_PER_SOL);

    const vault = deriveVault(vault4Sender.publicKey, vault4Receiver.publicKey);
    const vaultAuthority = deriveVaultAuthority();

    await program.methods
      .initializeVault(vault4Receiver.publicKey, amount)
      .accounts({
        sender: vault4Sender.publicKey,
        receiver: vault4Receiver.publicKey,
        vault,
        vaultAuthority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([vault4Sender])
      .rpc();

    let threw = false;
    try {
      await program.methods
        .cancel()
        .accounts({
          sender: attacker.publicKey,
          vault,
          vaultAuthority,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([attacker])
        .rpc();
    } catch {
      threw = true;
    }

    expect(threw).to.eq(true);
  });
});