use anchor_lang::prelude::*;

use crate::{
    constants::{VAULT_AUTHORITY_SEED, VAULT_SEED},
    errors::LockPayError,
    state::Vault,
};

#[derive(Accounts)]
pub struct Cancel<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    #[account(
        mut,
        close = sender,
        seeds = [VAULT_SEED, vault.sender.as_ref(), vault.receiver.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    /// CHECK: PDA derived from static seed ["vault_authority"], used only as a system-owned lamport custodian.
    #[account(
        mut,
        seeds = [VAULT_AUTHORITY_SEED],
        bump,
        constraint = *vault_authority.owner == anchor_lang::system_program::ID @ LockPayError::InvalidState
    )]
    pub vault_authority: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
