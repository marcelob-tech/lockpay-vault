use anchor_lang::prelude::*;

#[account]
pub struct Vault {
    pub sender: Pubkey,
    pub receiver: Pubkey,
    pub amount: u64,
    pub claimed: bool,
    pub bump: u8,
}
