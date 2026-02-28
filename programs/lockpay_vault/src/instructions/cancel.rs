use anchor_lang::prelude::*;

use crate::{
    constants::VAULT_AUTHORITY_SEED,
    contexts::Cancel,
    errors::LockPayError,
    state::Vault,
    utils::system_transfer_signed,
};

pub fn handler(ctx: Context<Cancel>) -> Result<()> {
    let vault: &mut Account<Vault> = &mut ctx.accounts.vault;

    require_keys_eq!(ctx.accounts.sender.key(), vault.sender, LockPayError::Unauthorized);
    require!(!vault.claimed, LockPayError::AlreadyClaimed);

    let signer_seeds: &[&[u8]] = &[VAULT_AUTHORITY_SEED, &[ctx.bumps.vault_authority]];

    system_transfer_signed(
        ctx.accounts.vault_authority.to_account_info(),
        ctx.accounts.sender.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        vault.amount,
        signer_seeds,
    )?;

    Ok(())
}
