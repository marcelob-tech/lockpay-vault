use anchor_lang::prelude::*;

use crate::{constants::MIN_VAULT_INIT_LAMPORTS, contexts::InitializeVault, errors::LockPayError, state::Vault};

pub fn handler(ctx: Context<InitializeVault>, receiver: Pubkey, amount: u64) -> Result<()> {
    let vault: &mut Account<Vault> = &mut ctx.accounts.vault;

    require_keys_eq!(ctx.accounts.receiver.key(), receiver, LockPayError::ReceiverMismatch);
    require!(amount >= MIN_VAULT_INIT_LAMPORTS, LockPayError::AmountBelowMinimum);

    let cpi_accounts = anchor_lang::system_program::Transfer {
        from: ctx.accounts.sender.to_account_info(),
        to: ctx.accounts.vault_authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.system_program.to_account_info(), cpi_accounts);
    anchor_lang::system_program::transfer(cpi_ctx, amount)?;

    vault.sender = ctx.accounts.sender.key();
    vault.receiver = receiver;
    vault.amount = amount;
    vault.claimed = false;
    vault.bump = ctx.bumps.vault;

    Ok(())
}
