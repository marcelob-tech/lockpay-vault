import { expect } from "chai";

async function flushMicrotasks(times = 5) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe("lockpay_cancel.ts", () => {
  it("runs cancel script and calls rpc", async () => {
    jest.resetModules();

    const rpcMock = jest.fn(async () => "sig");
    const signersMock = jest.fn(() => ({ rpc: rpcMock }));
    const accountsMock = jest.fn(() => ({ signers: signersMock }));
    const cancelMock = jest.fn(() => ({ accounts: accountsMock }));

    const methods = { cancel: cancelMock };

    jest.doMock("@solana/web3.js", () => {
      class PublicKey {
        _v: string;
        constructor(v: string) {
          this._v = v;
        }
        toBase58() {
          return this._v;
        }
        toBuffer() {
          return Buffer.from(this._v);
        }
        equals(other: any) {
          return other && other.toBase58 && other.toBase58() === this._v;
        }
        static findProgramAddressSync() {
          return [new (this as any)("VAULT_PDA"), 255];
        }
      }

      return {
        Commitment: {} as any,
        Connection: function () {
          return {
            getAccountInfo: jest.fn(async () => ({ owner: { equals: () => true, toBase58: () => "OWNER" } })),
          };
        },
        Keypair: {
          fromSecretKey: () => ({ publicKey: new (PublicKey as any)("SENDER") }),
        },
        PublicKey,
        SystemProgram: { programId: { toBase58: () => "11111111111111111111111111111111" } },
      };
    });

    jest.doMock("@coral-xyz/anchor", () => {
      return {
        AnchorProvider: class {
          constructor() {}
        },
        Wallet: class {
          constructor() {}
        },
        Program: class {
          methods = methods;
          constructor() {}
        },
      };
    });

    jest.doMock("../../turbin3-wallet.json", () => [1, 2, 3], { virtual: true });
    jest.doMock("../../receiver-wallet.json", () => [4, 5, 6], { virtual: true });
    jest.doMock("../../../target/idl/lockpay_vault.json", () => ({ address: "6Ywvmc" }), {
      virtual: true,
    });

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const argvBak = process.argv;
    process.argv = ["node", "cancel_lock_vault.ts", "SENDER"]; // satisfy usage check

    jest.isolateModules(() => {
      require("../ts/cluster1/cancel_lock_vault");
    });

    await flushMicrotasks(20);

    if (rpcMock.mock.calls.length !== 1) {
      throw new Error(
        `rpc() was not called. console.error calls: ${JSON.stringify(errSpy.mock.calls)}`,
      );
    }
    expect(errSpy.mock.calls.length).to.eq(0);

    logSpy.mockRestore();
    errSpy.mockRestore();
    process.argv = argvBak;
  });

  it("logs error on missing sender arg (usage)", async () => {
    jest.resetModules();

    jest.doMock("@solana/web3.js", () => {
      class PublicKey {
        _v: string;
        constructor(v: string) {
          this._v = v;
        }
        toBase58() {
          return this._v;
        }
        toBuffer() {
          return Buffer.from(this._v);
        }
        equals(other: any) {
          return other && other.toBase58 && other.toBase58() === this._v;
        }
        static findProgramAddressSync() {
          return [new (this as any)("VAULT_PDA"), 255];
        }
      }

      return {
        Commitment: {} as any,
        Connection: function () {
          return {
            getAccountInfo: jest.fn(async () => null),
          };
        },
        Keypair: {
          fromSecretKey: () => ({ publicKey: new (PublicKey as any)("SENDER") }),
        },
        PublicKey,
        SystemProgram: { programId: { toBase58: () => "11111111111111111111111111111111" } },
      };
    });

    jest.doMock("@coral-xyz/anchor", () => {
      return {
        AnchorProvider: class {
          constructor() {}
        },
        Wallet: class {
          constructor() {}
        },
        Program: class {
          constructor() {}
        },
      };
    });

    jest.doMock("../../turbin3-wallet.json", () => [1, 2, 3], { virtual: true });
    jest.doMock("../../receiver-wallet.json", () => [4, 5, 6], { virtual: true });
    jest.doMock("../../../target/idl/lockpay_vault.json", () => ({ address: "6Ywvmc" }), { virtual: true });

    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const argvBak = process.argv;
    process.argv = ["node", "cancel_lock_vault.ts"]; // missing sender

    jest.isolateModules(() => {
      require("../ts/cluster1/cancel_lock_vault");
    });

    await flushMicrotasks(20);
    expect(String(errSpy.mock.calls[0][0])).to.contain("Usage: yarn ts:cancel");

    errSpy.mockRestore();
    process.argv = argvBak;
  });

  it("logs error on sender signer mismatch", async () => {
    jest.resetModules();

    const rpcMock = jest.fn(async () => "sig");
    const signersMock = jest.fn(() => ({ rpc: rpcMock }));
    const accountsMock = jest.fn(() => ({ signers: signersMock }));
    const cancelMock = jest.fn(() => ({ accounts: accountsMock }));
    const methods = { cancel: cancelMock };

    jest.doMock("@solana/web3.js", () => {
      class PublicKey {
        _v: string;
        constructor(v: string) {
          this._v = v;
        }
        toBase58() {
          return this._v;
        }
        toBuffer() {
          return Buffer.from(this._v);
        }
        equals(other: any) {
          return other && other.toBase58 && other.toBase58() === this._v;
        }
        static findProgramAddressSync() {
          return [new (this as any)("VAULT_PDA"), 255];
        }
      }

      return {
        Commitment: {} as any,
        Connection: function () {
          return {
            getAccountInfo: jest.fn(async () => ({ owner: { equals: () => true, toBase58: () => "OWNER" } })),
          };
        },
        Keypair: {
          fromSecretKey: () => ({ publicKey: new (PublicKey as any)("SIGNER_WALLET") }),
        },
        PublicKey,
        SystemProgram: { programId: { toBase58: () => "11111111111111111111111111111111" } },
      };
    });

    jest.doMock("@coral-xyz/anchor", () => {
      return {
        AnchorProvider: class {
          constructor() {}
        },
        Wallet: class {
          constructor() {}
        },
        Program: class {
          methods = methods;
          constructor() {}
        },
      };
    });

    jest.doMock("../../turbin3-wallet.json", () => [1, 2, 3], { virtual: true });
    jest.doMock("../../receiver-wallet.json", () => [4, 5, 6], { virtual: true });
    jest.doMock("../../../target/idl/lockpay_vault.json", () => ({ address: "6Ywvmc" }), { virtual: true });

    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const argvBak = process.argv;
    process.argv = ["node", "cancel_lock_vault.ts", "SENDER_ARG"]; // mismatch with SIGNER_WALLET

    jest.isolateModules(() => {
      require("../ts/cluster1/cancel_lock_vault");
    });

    await flushMicrotasks(20);
    expect(rpcMock.mock.calls.length).to.eq(0);
    expect(String(errSpy.mock.calls[0][0])).to.contain("Sender signer mismatch");

    errSpy.mockRestore();
    process.argv = argvBak;
  });

  it("logs error when vault PDA is not initialized", async () => {
    jest.resetModules();

    const rpcMock = jest.fn(async () => "sig");
    const signersMock = jest.fn(() => ({ rpc: rpcMock }));
    const accountsMock = jest.fn(() => ({ signers: signersMock }));
    const cancelMock = jest.fn(() => ({ accounts: accountsMock }));
    const methods = { cancel: cancelMock };

    jest.doMock("@solana/web3.js", () => {
      class PublicKey {
        _v: string;
        constructor(v: string) {
          this._v = v;
        }
        toBase58() {
          return this._v;
        }
        toBuffer() {
          return Buffer.from(this._v);
        }
        equals(other: any) {
          return other && other.toBase58 && other.toBase58() === this._v;
        }
        static findProgramAddressSync() {
          return [new (this as any)("VAULT_PDA"), 255];
        }
      }

      return {
        Commitment: {} as any,
        Connection: function () {
          return {
            getAccountInfo: jest.fn(async () => null),
          };
        },
        Keypair: {
          fromSecretKey: () => ({ publicKey: new (PublicKey as any)("SENDER") }),
        },
        PublicKey,
        SystemProgram: { programId: { toBase58: () => "11111111111111111111111111111111" } },
      };
    });

    jest.doMock("@coral-xyz/anchor", () => {
      return {
        AnchorProvider: class {
          constructor() {}
        },
        Wallet: class {
          constructor() {}
        },
        Program: class {
          methods = methods;
          constructor() {}
        },
      };
    });

    jest.doMock("../../turbin3-wallet.json", () => [1, 2, 3], { virtual: true });
    jest.doMock("../../receiver-wallet.json", () => [4, 5, 6], { virtual: true });
    jest.doMock("../../../target/idl/lockpay_vault.json", () => ({ address: "6Ywvmc" }), { virtual: true });

    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const argvBak = process.argv;
    process.argv = ["node", "cancel_lock_vault.ts", "SENDER"]; // signer matches

    jest.isolateModules(() => {
      require("../ts/cluster1/cancel_lock_vault");
    });

    await flushMicrotasks(20);
    expect(rpcMock.mock.calls.length).to.eq(0);
    expect(String(errSpy.mock.calls[0][0])).to.contain("Vault PDA not initialized");

    errSpy.mockRestore();
    process.argv = argvBak;
  });

  it("logs error when vault owner mismatches program", async () => {
    jest.resetModules();

    const rpcMock = jest.fn(async () => "sig");
    const signersMock = jest.fn(() => ({ rpc: rpcMock }));
    const accountsMock = jest.fn(() => ({ signers: signersMock }));
    const cancelMock = jest.fn(() => ({ accounts: accountsMock }));
    const methods = { cancel: cancelMock };

    jest.doMock("@solana/web3.js", () => {
      class PublicKey {
        _v: string;
        constructor(v: string) {
          this._v = v;
        }
        toBase58() {
          return this._v;
        }
        toBuffer() {
          return Buffer.from(this._v);
        }
        equals(other: any) {
          return other && other.toBase58 && other.toBase58() === this._v;
        }
        static findProgramAddressSync() {
          return [new (this as any)("VAULT_PDA"), 255];
        }
      }

      const otherOwner = new (PublicKey as any)("OTHER_OWNER");

      return {
        Commitment: {} as any,
        Connection: function () {
          return {
            getAccountInfo: jest.fn(async () => ({ owner: otherOwner })),
          };
        },
        Keypair: {
          fromSecretKey: () => ({ publicKey: new (PublicKey as any)("SENDER") }),
        },
        PublicKey,
        SystemProgram: { programId: { toBase58: () => "11111111111111111111111111111111" } },
      };
    });

    jest.doMock("@coral-xyz/anchor", () => {
      return {
        AnchorProvider: class {
          constructor() {}
        },
        Wallet: class {
          constructor() {}
        },
        Program: class {
          methods = methods;
          constructor() {}
        },
      };
    });

    jest.doMock("../../turbin3-wallet.json", () => [1, 2, 3], { virtual: true });
    jest.doMock("../../receiver-wallet.json", () => [4, 5, 6], { virtual: true });
    jest.doMock("../../../target/idl/lockpay_vault.json", () => ({ address: "6Ywvmc" }), { virtual: true });

    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const argvBak = process.argv;
    process.argv = ["node", "cancel_lock_vault.ts", "SENDER"]; // signer matches

    jest.isolateModules(() => {
      require("../ts/cluster1/cancel_lock_vault");
    });

    await flushMicrotasks(20);
    expect(rpcMock.mock.calls.length).to.eq(0);
    expect(String(errSpy.mock.calls[0][0])).to.contain("Vault PDA owner is");

    errSpy.mockRestore();
    process.argv = argvBak;
  });

  it("loads sender keypair from provided wallet json path", async () => {
    jest.resetModules();

    const rpcMock = jest.fn(async () => "sig");
    const signersMock = jest.fn(() => ({ rpc: rpcMock }));
    const accountsMock = jest.fn(() => ({ signers: signersMock }));
    const cancelMock = jest.fn(() => ({ accounts: accountsMock }));
    const methods = { cancel: cancelMock };

    jest.doMock("fs", () => {
      const actual = jest.requireActual("fs");
      return {
        ...actual,
        readFileSync: jest.fn(() => "[6,6,6]"),
      };
    });

    jest.doMock("@solana/web3.js", () => {
      class PublicKey {
        _v: string;
        constructor(v: string) {
          this._v = v;
        }
        toBase58() {
          return this._v;
        }
        toBuffer() {
          return Buffer.from(this._v);
        }
        equals(other: any) {
          return other && other.toBase58 && other.toBase58() === this._v;
        }
        static findProgramAddressSync() {
          return [new (this as any)("VAULT_PDA"), 255];
        }
      }

      let call = 0;
      return {
        Commitment: {} as any,
        Connection: function () {
          return {
            getAccountInfo: jest.fn(async () => ({ owner: { equals: () => true, toBase58: () => "OWNER" } })),
          };
        },
        Keypair: {
          fromSecretKey: () => {
            call++;
            // call #1: defaultReceiverPubkey (top-level const)
            // call #2: loadKeypair(senderWalletPath) inside the async IIFE
            return { publicKey: new (PublicKey as any)(call === 2 ? "SENDER_FROM_PATH" : "RECEIVER") };
          },
        },
        PublicKey,
        SystemProgram: { programId: { toBase58: () => "11111111111111111111111111111111" } },
      };
    });

    jest.doMock("@coral-xyz/anchor", () => {
      return {
        AnchorProvider: class {
          constructor() {}
        },
        Wallet: class {
          constructor() {}
        },
        Program: class {
          methods = methods;
          constructor() {}
        },
      };
    });

    jest.doMock("../../turbin3-wallet.json", () => [1, 2, 3], { virtual: true });
    jest.doMock("../../receiver-wallet.json", () => [4, 5, 6], { virtual: true });
    jest.doMock("../../../target/idl/lockpay_vault.json", () => ({ address: "6Ywvmc" }), { virtual: true });

    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const argvBak = process.argv;
    process.argv = ["node", "cancel_lock_vault.ts", "SENDER_FROM_PATH", "./sender.json", "RECEIVER"]; // senderWalletPath

    jest.isolateModules(() => {
      require("../ts/cluster1/cancel_lock_vault");
    });

    await flushMicrotasks(20);
    expect(rpcMock.mock.calls.length).to.eq(1);
    expect(errSpy.mock.calls.length).to.eq(0);

    errSpy.mockRestore();
    process.argv = argvBak;
  });

  it("logs error when send fails", async () => {
    jest.resetModules();

    const rpcMock = jest.fn(async () => {
      throw new Error("boom");
    });
    const signersMock = jest.fn(() => ({ rpc: rpcMock }));
    const accountsMock = jest.fn(() => ({ signers: signersMock }));
    const cancelMock = jest.fn(() => ({ accounts: accountsMock }));
    const methods = { cancel: cancelMock };

    jest.doMock("@solana/web3.js", () => {
      class PublicKey {
        _v: string;
        constructor(v: string) {
          this._v = v;
        }
        toBase58() {
          return this._v;
        }
        toBuffer() {
          return Buffer.from(this._v);
        }
        equals(other: any) {
          return other && other.toBase58 && other.toBase58() === this._v;
        }
        static findProgramAddressSync() {
          return [new (this as any)("VAULT_PDA"), 255];
        }
      }

      return {
        Commitment: {} as any,
        Connection: function () {
          return {
            getAccountInfo: jest.fn(async () => ({ owner: { equals: () => true, toBase58: () => "OWNER" } })),
          };
        },
        Keypair: {
          fromSecretKey: () => ({ publicKey: new (PublicKey as any)("SENDER") }),
        },
        PublicKey,
        SystemProgram: { programId: { toBase58: () => "11111111111111111111111111111111" } },
      };
    });

    jest.doMock("@coral-xyz/anchor", () => {
      return {
        AnchorProvider: class {
          constructor() {}
        },
        Wallet: class {
          constructor() {}
        },
        Program: class {
          methods = methods;
          constructor() {}
        },
      };
    });

    jest.doMock("../../turbin3-wallet.json", () => [1, 2, 3], { virtual: true });
    jest.doMock("../../receiver-wallet.json", () => [4, 5, 6], { virtual: true });
    jest.doMock("../../../target/idl/lockpay_vault.json", () => ({ address: "6Ywvmc" }), {
      virtual: true,
    });

    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const argvBak = process.argv;
    process.argv = ["node", "cancel_lock_vault.ts", "SENDER"]; // satisfy usage check

    jest.isolateModules(() => {
      require("../ts/cluster1/cancel_lock_vault");
    });

    await flushMicrotasks();

    if (rpcMock.mock.calls.length !== 1) {
      throw new Error(
        `rpc() was not called (error-path test). console.error calls: ${JSON.stringify(errSpy.mock.calls)}`,
      );
    }
    expect(errSpy.mock.calls.length).to.be.greaterThan(0);
    expect(String(errSpy.mock.calls[0][0])).to.contain("Oops, something went wrong");

    errSpy.mockRestore();
    process.argv = argvBak;
  });

  it("covers success logs when not running under Jest", async () => {
    jest.resetModules();

    const rpcMock = jest.fn(async () => "sig");
    const signersMock = jest.fn(() => ({ rpc: rpcMock }));
    const accountsMock = jest.fn(() => ({ signers: signersMock }));
    const cancelMock = jest.fn(() => ({ accounts: accountsMock }));
    const methods = { cancel: cancelMock };

    jest.doMock("@solana/web3.js", () => {
      class PublicKey {
        _v: string;
        constructor(v: string) {
          this._v = v;
        }
        toBase58() {
          return this._v;
        }
        toBuffer() {
          return Buffer.from(this._v);
        }
        equals(other: any) {
          return other && other.toBase58 && other.toBase58() === this._v;
        }
        static findProgramAddressSync() {
          return [new (this as any)("VAULT_PDA"), 255];
        }
      }

      return {
        Commitment: {} as any,
        Connection: function () {
          return {
            getAccountInfo: jest.fn(async () => ({ owner: { equals: () => true, toBase58: () => "OWNER" } })),
          };
        },
        Keypair: {
          fromSecretKey: () => ({ publicKey: new (PublicKey as any)("SENDER") }),
        },
        PublicKey,
        SystemProgram: { programId: { toBase58: () => "11111111111111111111111111111111" } },
      };
    });

    jest.doMock("@coral-xyz/anchor", () => {
      return {
        AnchorProvider: class {
          constructor() {}
        },
        Wallet: class {
          constructor() {}
        },
        Program: class {
          methods = methods;
          constructor() {}
        },
      };
    });

    jest.doMock("../../turbin3-wallet.json", () => [1, 2, 3], { virtual: true });
    jest.doMock("../../receiver-wallet.json", () => [4, 5, 6], { virtual: true });
    jest.doMock("../../../target/idl/lockpay_vault.json", () => ({ address: "6Ywvmc" }), { virtual: true });

    const jestBak = process.env.JEST_WORKER_ID;
    delete process.env.JEST_WORKER_ID;

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const { main } = require("../ts/cluster1/cancel_lock_vault");
    await main(["node", "cancel_lock_vault.ts", "SENDER"]);

    expect(rpcMock.mock.calls.length).to.eq(1);
    expect(errSpy.mock.calls.length).to.eq(0);
    expect(logSpy.mock.calls.length).to.be.greaterThan(0);

    logSpy.mockRestore();
    errSpy.mockRestore();

    if (jestBak) process.env.JEST_WORKER_ID = jestBak;
  });
});
