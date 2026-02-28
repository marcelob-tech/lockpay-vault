use anchor_lang::prelude::*;

use crate::{
    constants::{VAULT_AUTHORITY_SEED, VAULT_SEED, VAULT_SPACE},
    state::Vault,
};

#[derive(Accounts)]
#[instruction(receiver: Pubkey)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    /// CHECK: Receiver is recorded into the Vault state.
    pub receiver: UncheckedAccount<'info>,

    #[account(
        init,
        payer = sender,
        space = 8 + VAULT_SPACE,
        seeds = [VAULT_SEED, sender.key().as_ref(), receiver.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        init_if_needed,
        payer = sender,
        space = 0,
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
        owner = anchor_lang::system_program::ID
    )]
    /// CHECK: PDA derived from static seed ["vault_authority"], used only as a system-owned lamport custodian.
    pub vault_authority: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
