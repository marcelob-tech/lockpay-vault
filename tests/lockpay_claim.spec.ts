import { expect } from "chai";

async function flushMicrotasks(times = 5) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe("lockpay_claim.ts", () => {
  it("builds Claim ix and sends tx", async () => {
    jest.resetModules();

    const rpcMock = jest.fn(async () => "sig");
    const signersMock = jest.fn(() => ({ rpc: rpcMock }));
    const accountsMock = jest.fn(() => ({ signers: signersMock }));
    const claimMock = jest.fn(() => ({ accounts: accountsMock }));

    const methods = { claim: claimMock };

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
          fromSecretKey: () => ({ publicKey: new (PublicKey as any)("RECEIVER") }),
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
    process.argv = ["node", "claim_vault.ts"]; // use defaults

    jest.isolateModules(() => {
      require("../ts/cluster1/claim_vault");
    });

    await flushMicrotasks();

    expect(rpcMock.mock.calls.length).to.eq(1);

    logSpy.mockRestore();
    errSpy.mockRestore();
    process.argv = argvBak;
  });

  it("loads receiver keypair from wallet json path", async () => {
    jest.resetModules();

    const rpcMock = jest.fn(async () => "sig");
    const signersMock = jest.fn(() => ({ rpc: rpcMock }));
    const accountsMock = jest.fn(() => ({ signers: signersMock }));
    const claimMock = jest.fn(() => ({ accounts: accountsMock }));
    const methods = { claim: claimMock };

    jest.doMock("fs", () => {
      const actual = jest.requireActual("fs");
      return {
        ...actual,
        readFileSync: jest.fn(() => "[8,8,8]"),
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
            return { publicKey: new (PublicKey as any)(call === 3 ? "RECEIVER_FROM_PATH" : "SOMEONE") };
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
    jest.doMock("../../../target/idl/lockpay_vault.json", () => ({ address: "6Ywvmc" }), {
      virtual: true,
    });

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const argvBak = process.argv;
    process.argv = ["node", "claim_vault.ts", "", "./receiver.json"]; // receiverWalletPath

    jest.isolateModules(() => {
      require("../ts/cluster1/claim_vault");
    });

    await flushMicrotasks(20);

    expect(rpcMock.mock.calls.length).to.eq(1);
    expect(errSpy.mock.calls.length).to.eq(0);

    logSpy.mockRestore();
    errSpy.mockRestore();
    process.argv = argvBak;
  });

  it("errors on receiver signer mismatch", async () => {
    jest.resetModules();

    const rpcMock = jest.fn(async () => "sig");
    const signersMock = jest.fn(() => ({ rpc: rpcMock }));
    const accountsMock = jest.fn(() => ({ signers: signersMock }));
    const claimMock = jest.fn(() => ({ accounts: accountsMock }));
    const methods = { claim: claimMock };

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
          fromSecretKey: () => ({ publicKey: new (PublicKey as any)("RECEIVER_WALLET") }),
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
    process.argv = ["node", "claim_vault.ts", "RECEIVER_ARG_MISMATCH"]; // receiverArg provided

    jest.isolateModules(() => {
      require("../ts/cluster1/claim_vault");
    });

    await flushMicrotasks(20);

    expect(rpcMock.mock.calls.length).to.eq(0);
    expect(String(errSpy.mock.calls[0][0])).to.contain("Receiver signer mismatch");

    errSpy.mockRestore();
    process.argv = argvBak;
  });

  it("errors when vault is not initialized", async () => {
    jest.resetModules();

    const rpcMock = jest.fn(async () => "sig");
    const signersMock = jest.fn(() => ({ rpc: rpcMock }));
    const accountsMock = jest.fn(() => ({ signers: signersMock }));
    const claimMock = jest.fn(() => ({ accounts: accountsMock }));
    const methods = { claim: claimMock };

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
          fromSecretKey: () => ({ publicKey: new (PublicKey as any)("RECEIVER") }),
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
    process.argv = ["node", "claim_vault.ts"]; // defaults

    jest.isolateModules(() => {
      require("../ts/cluster1/claim_vault");
    });

    await flushMicrotasks(20);

    expect(rpcMock.mock.calls.length).to.eq(0);
    expect(String(errSpy.mock.calls[0][0])).to.contain("Vault PDA not initialized");

    errSpy.mockRestore();
    process.argv = argvBak;
  });

  it("errors when vault owner mismatches program", async () => {
    jest.resetModules();

    const rpcMock = jest.fn(async () => "sig");
    const signersMock = jest.fn(() => ({ rpc: rpcMock }));
    const accountsMock = jest.fn(() => ({ signers: signersMock }));
    const claimMock = jest.fn(() => ({ accounts: accountsMock }));
    const methods = { claim: claimMock };

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

      const owner = new (PublicKey as any)("OTHER_OWNER");

      return {
        Commitment: {} as any,
        Connection: function () {
          return {
            getAccountInfo: jest.fn(async () => ({ owner })),
          };
        },
        Keypair: {
          fromSecretKey: () => ({ publicKey: new (PublicKey as any)("RECEIVER") }),
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
    process.argv = ["node", "claim_vault.ts"]; // defaults

    jest.isolateModules(() => {
      require("../ts/cluster1/claim_vault");
    });

    await flushMicrotasks(20);

    expect(rpcMock.mock.calls.length).to.eq(0);
    expect(String(errSpy.mock.calls[0][0])).to.contain("Vault PDA owner is");

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
    const claimMock = jest.fn(() => ({ accounts: accountsMock }));
    const methods = { claim: claimMock };

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
          fromSecretKey: () => ({ publicKey: new (PublicKey as any)("RECEIVER") }),
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
    process.argv = ["node", "claim_vault.ts"]; // use defaults

    jest.isolateModules(() => {
      require("../ts/cluster1/claim_vault");
    });

    await flushMicrotasks();

    expect(rpcMock.mock.calls.length).to.eq(1);
    expect(errSpy.mock.calls.length).to.eq(1);
    expect(String(errSpy.mock.calls[0][0])).to.contain("Oops, something went wrong");

    errSpy.mockRestore();
    process.argv = argvBak;
  });
});
