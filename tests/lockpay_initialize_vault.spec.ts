import { expect } from "chai";

async function flushMicrotasks(times = 5) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe("vault_init.ts", () => {
  it("runs initialize script and calls rpc", async () => {
    jest.resetModules();

    const rpcMock = jest.fn(async () => "sig");
    const signersMock = jest.fn(() => ({ rpc: rpcMock }));
    const accountsMock = jest.fn(() => ({ signers: signersMock }));
    const initializeVaultMock = jest.fn(() => ({ accounts: accountsMock }));

    const methods = { initializeVault: initializeVaultMock };

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
        BN: class {
          constructor() {}
          toString() {
            return "0";
          }
        },
      };
    });

    jest.doMock("../../turbin3-wallet.json", () => [1, 2, 3], { virtual: true });
    jest.doMock("../../receiver-wallet.json", () => [4, 5, 6], { virtual: true });
    jest.doMock(
      "../../../target/idl/lockpay_vault.json",
      () => ({ address: "6YwvmcWvd2ijBN3ecMhi3VJ2ghmgRbvuWMboHk3JSkPu" }),
      {
        virtual: true,
      },
    );

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const argvBak = process.argv;
    process.argv = ["node", "vault_init.ts"]; // use defaults

    jest.isolateModules(() => {
      require("../ts/cluster1/vault_init");
    });

    await flushMicrotasks();

    expect(rpcMock.mock.calls.length).to.eq(1);

    logSpy.mockRestore();
    errSpy.mockRestore();
    process.argv = argvBak;
  });

  it("loads sender keypair from provided wallet json path", async () => {
    jest.resetModules();

    const rpcMock = jest.fn(async () => "sig");
    const signersMock = jest.fn(() => ({ rpc: rpcMock }));
    const accountsMock = jest.fn(() => ({ signers: signersMock }));
    const initializeVaultMock = jest.fn(() => ({ accounts: accountsMock }));

    const methods = { initializeVault: initializeVaultMock };

    jest.doMock("fs", () => {
      const actual = jest.requireActual("fs");
      return {
        ...actual,
        readFileSync: jest.fn(() => "[7,7,7]"),
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
            getAccountInfo: jest.fn(async () => null),
          };
        },
        Keypair: {
          fromSecretKey: () => {
            call++;
            return { publicKey: new (PublicKey as any)(call === 1 ? "SENDER_FROM_PATH" : "RECEIVER") };
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
        BN: class {
          constructor() {}
          toString() {
            return "0";
          }
        },
      };
    });

    jest.doMock("../../turbin3-wallet.json", () => [1, 2, 3], { virtual: true });
    jest.doMock("../../receiver-wallet.json", () => [4, 5, 6], { virtual: true });
    jest.doMock(
      "../../../target/idl/lockpay_vault.json",
      () => ({ address: "6YwvmcWvd2ijBN3ecMhi3VJ2ghmgRbvuWMboHk3JSkPu" }),
      { virtual: true },
    );

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const argvBak = process.argv;
    process.argv = ["node", "vault_init.ts", "RECEIVER", "1", "./sender.json"]; // senderWalletPath present

    jest.isolateModules(() => {
      require("../ts/cluster1/vault_init");
    });

    await flushMicrotasks(20);

    expect(rpcMock.mock.calls.length).to.eq(1);
    expect(errSpy.mock.calls.length).to.eq(0);

    logSpy.mockRestore();
    errSpy.mockRestore();
    process.argv = argvBak;
  });

  it("parses receiver arg from wallet json path", async () => {
    jest.resetModules();

    const rpcMock = jest.fn(async () => "sig");
    const signersMock = jest.fn(() => ({ rpc: rpcMock }));
    const accountsMock = jest.fn(() => ({ signers: signersMock }));
    const initializeVaultMock = jest.fn(() => ({ accounts: accountsMock }));
    const methods = { initializeVault: initializeVaultMock };

    jest.doMock("fs", () => {
      const actual = jest.requireActual("fs");
      return {
        ...actual,
        existsSync: jest.fn(() => true),
        readFileSync: jest.fn(() => "[9,9,9]"),
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

      return {
        Commitment: {} as any,
        Connection: function () {
          return {
            getAccountInfo: jest.fn(async () => null),
          };
        },
        Keypair: {
          fromSecretKey: (_u8: Uint8Array) => ({ publicKey: new (PublicKey as any)("RECEIVER_FROM_FILE") }),
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
        BN: class {
          constructor() {}
          toString() {
            return "0";
          }
        },
      };
    });

    jest.doMock("../../turbin3-wallet.json", () => [1, 2, 3], { virtual: true });
    jest.doMock("../../receiver-wallet.json", () => [4, 5, 6], { virtual: true });
    jest.doMock(
      "../../../target/idl/lockpay_vault.json",
      () => ({ address: "6YwvmcWvd2ijBN3ecMhi3VJ2ghmgRbvuWMboHk3JSkPu" }),
      {
        virtual: true,
      },
    );

    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const argvBak = process.argv;
    process.argv = ["node", "vault_init.ts", "./receiver.json"]; // receiverArg as path

    jest.isolateModules(() => {
      require("../ts/cluster1/vault_init");
    });

    await flushMicrotasks(20);

    expect(rpcMock.mock.calls.length).to.eq(1);
    expect(errSpy.mock.calls.length).to.eq(0);

    errSpy.mockRestore();
    process.argv = argvBak;
  });

  it("parses receiver arg as pubkey string", async () => {
    jest.resetModules();

    const rpcMock = jest.fn(async () => "sig");
    const signersMock = jest.fn(() => ({ rpc: rpcMock }));
    const accountsMock = jest.fn(() => ({ signers: signersMock }));
    const initializeVaultMock = jest.fn(() => ({ accounts: accountsMock }));
    const methods = { initializeVault: initializeVaultMock };

    jest.doMock("fs", () => {
      const actual = jest.requireActual("fs");
      return {
        ...actual,
        existsSync: jest.fn(() => false),
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

      return {
        Commitment: {} as any,
        Connection: function () {
          return {
            getAccountInfo: jest.fn(async () => null),
          };
        },
        Keypair: {
          fromSecretKey: (_u8: Uint8Array) => ({ publicKey: new (PublicKey as any)("SENDER") }),
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
        BN: class {
          constructor() {}
          toString() {
            return "0";
          }
        },
      };
    });

    jest.doMock("../../turbin3-wallet.json", () => [1, 2, 3], { virtual: true });
    jest.doMock("../../receiver-wallet.json", () => [4, 5, 6], { virtual: true });
    jest.doMock(
      "../../../target/idl/lockpay_vault.json",
      () => ({ address: "6YwvmcWvd2ijBN3ecMhi3VJ2ghmgRbvuWMboHk3JSkPu" }),
      {
        virtual: true,
      },
    );

    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const argvBak = process.argv;
    process.argv = ["node", "vault_init.ts", "RECEIVER_PUBKEY_STRING"]; // receiverArg as pubkey

    jest.isolateModules(() => {
      require("../ts/cluster1/vault_init");
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
    const initializeVaultMock = jest.fn(() => ({ accounts: accountsMock }));
    const methods = { initializeVault: initializeVaultMock };

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
        BN: class {
          constructor() {}
          toString() {
            return "0";
          }
        },
      };
    });

    jest.doMock("../../turbin3-wallet.json", () => [1, 2, 3], { virtual: true });
    jest.doMock("../../receiver-wallet.json", () => [4, 5, 6], { virtual: true });
    jest.doMock(
      "../../../target/idl/lockpay_vault.json",
      () => ({ address: "6YwvmcWvd2ijBN3ecMhi3VJ2ghmgRbvuWMboHk3JSkPu" }),
      {
        virtual: true,
      },
    );

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const argvBak = process.argv;
    process.argv = ["node", "vault_init.ts"]; // use defaults

    jest.isolateModules(() => {
      require("../ts/cluster1/vault_init");
    });

    await flushMicrotasks();

    expect(rpcMock.mock.calls.length).to.eq(1);
    expect(errSpy.mock.calls.length).to.eq(1);
    expect(String(errSpy.mock.calls[0][0])).to.contain("Oops, something went wrong");

    errSpy.mockRestore();
    process.argv = argvBak;
  });

  it("covers success logs when not running under Jest", async () => {
    jest.resetModules();

    const rpcMock = jest.fn(async () => "sig");
    const signersMock = jest.fn(() => ({ rpc: rpcMock }));
    const accountsMock = jest.fn(() => ({ signers: signersMock }));
    const initializeVaultMock = jest.fn(() => ({ accounts: accountsMock }));
    const methods = { initializeVault: initializeVaultMock };

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
        BN: class {
          constructor() {}
          toString() {
            return "0";
          }
        },
      };
    });

    jest.doMock("../../turbin3-wallet.json", () => [1, 2, 3], { virtual: true });
    jest.doMock("../../receiver-wallet.json", () => [4, 5, 6], { virtual: true });
    jest.doMock(
      "../../../target/idl/lockpay_vault.json",
      () => ({ address: "6YwvmcWvd2ijBN3ecMhi3VJ2ghmgRbvuWMboHk3JSkPu" }),
      { virtual: true },
    );

    const jestBak = process.env.JEST_WORKER_ID;
    delete process.env.JEST_WORKER_ID;

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const { main } = require("../ts/cluster1/vault_init");
    await main(["node", "vault_init.ts"]);

    expect(rpcMock.mock.calls.length).to.eq(1);
    expect(errSpy.mock.calls.length).to.eq(0);
    expect(logSpy.mock.calls.length).to.be.greaterThan(0);

    logSpy.mockRestore();
    errSpy.mockRestore();

    if (jestBak) process.env.JEST_WORKER_ID = jestBak;
  });
});
