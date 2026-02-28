pub const VAULT_SEED: &[u8] = b"vault";
pub const VAULT_AUTHORITY_SEED: &[u8] = b"vault_authority";

pub const MIN_VAULT_INIT_LAMPORTS: u64 = 20_000_000;

// Mirrors Vault layout: 32 + 32 + 8 + 1 + 1
pub const VAULT_SPACE: usize = 32 + 32 + 8 + 1 + 1;

// Account discriminator (8 bytes) is added by Anchor.
pub const VAULT_ACCOUNT_SPACE: usize = 8 + VAULT_SPACE;
