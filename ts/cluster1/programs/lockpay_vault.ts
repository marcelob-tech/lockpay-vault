import idl from "../../../target/idl/lockpay_vault.json";

export type LockpayVault = typeof idl;

// Anchor's Idl type is stricter than the generated JSON typing (pda seed "kind" etc.).
// For cluster scripts we treat the IDL as runtime data.
export const IDL: any = idl as any;
