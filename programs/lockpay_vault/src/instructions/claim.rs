use anchor_lang::prelude::*;

use crate::{
    constants::VAULT_AUTHORITY_SEED,
    contexts::Claim,
    errors::LockPayError,
    state::Vault,
    utils::system_transfer_signed,
};

pub fn handler(ctx: Context<Claim>) -> Result<()> {
    let vault: &mut Account<Vault> = &mut ctx.accounts.vault;

    require_keys_eq!(ctx.accounts.receiver.key(), vault.receiver, LockPayError::Unauthorized);
    require!(!vault.claimed, LockPayError::AlreadyClaimed);

    let signer_seeds: &[&[u8]] = &[VAULT_AUTHORITY_SEED, &[ctx.bumps.vault_authority]];

    system_transfer_signed(
        ctx.accounts.vault_authority.to_account_info(),
        ctx.accounts.receiver.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        vault.amount,
        signer_seeds,
    )?;

    vault.claimed = true;
    vault.amount = 0;

    Ok(())
}
