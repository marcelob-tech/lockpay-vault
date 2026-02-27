import { expect } from "chai";

async function flushMicrotasks(times = 5) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe("lockpay_claim.ts", () => {
  it("builds Claim ix and sends tx", async () => {
    jest.resetModules();

    let capturedTx: any;
    const sendMock = jest.fn(async (_connection: any, tx: any) => {
      capturedTx = tx;
      return "sig";
    });

    jest.doMock("@solana/web3.js", () => {
      const actual = jest.requireActual("@solana/web3.js");
      return {
        ...actual,
        sendAndConfirmTransaction: sendMock,
      };
    });

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    jest.isolateModules(() => {
      require("../cluster1/lockpay_claim");
    });

    await flushMicrotasks();

    expect(sendMock.mock.calls.length).to.eq(1);
    expect(capturedTx.instructions).to.have.length(1);

    const ix = capturedTx.instructions[0];
    expect(ix.programId.toBase58()).to.eq("4e8sbrp3VH4HnrC3tgy6fQ1AnzYXG5jsLZC4CQFnayER");
    expect(ix.data.length).to.eq(8);

    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it("logs error when send fails", async () => {
    jest.resetModules();

    const sendMock = jest.fn(async () => {
      throw new Error("boom");
    });

    jest.doMock("@solana/web3.js", () => {
      const actual = jest.requireActual("@solana/web3.js");
      return {
        ...actual,
        sendAndConfirmTransaction: sendMock,
      };
    });

    const errSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    jest.isolateModules(() => {
      require("../cluster1/lockpay_claim");
    });

    await flushMicrotasks();

    expect(sendMock.mock.calls.length).to.eq(1);
    expect(errSpy.mock.calls.length).to.eq(1);
    expect(String(errSpy.mock.calls[0][0])).to.contain("Oops, something went wrong");

    errSpy.mockRestore();
  });
});
