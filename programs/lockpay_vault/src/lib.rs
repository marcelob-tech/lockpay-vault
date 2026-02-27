use anchor_lang::prelude::*;

declare_id!("6YwvmcWvd2ijBN3ecMhi3VJ2ghmgRbvuWMboHk3JSkPu");

#[program]
pub mod lockpay_vault {
    use super::*;

    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        receiver: Pubkey,
        amount: u64,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;

        require_keys_eq!(ctx.accounts.receiver.key(), receiver, LockPayError::InvalidState);

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

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;

        require_keys_eq!(
            ctx.accounts.receiver.key(),
            vault.receiver,
            LockPayError::Unauthorized
        );
        require!(!vault.claimed, LockPayError::AlreadyClaimed);

        let signer_seeds: &[&[u8]] = &[b"vault_authority", &[ctx.bumps.vault_authority]];

        let ix = anchor_lang::solana_program::system_instruction::transfer(
            ctx.accounts.vault_authority.key,
            ctx.accounts.receiver.key,
            vault.amount,
        );

        anchor_lang::solana_program::program::invoke_signed(
            &ix,
            &[
                ctx.accounts.vault_authority.to_account_info(),
                ctx.accounts.receiver.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[signer_seeds],
        )?;

        vault.claimed = true;
        vault.amount = 0;
        Ok(())
    }

    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;

        require_keys_eq!(
            ctx.accounts.sender.key(),
            vault.sender,
            LockPayError::Unauthorized
        );
        require!(!vault.claimed, LockPayError::AlreadyClaimed);

        let signer_seeds: &[&[u8]] = &[b"vault_authority", &[ctx.bumps.vault_authority]];

        let ix = anchor_lang::solana_program::system_instruction::transfer(
            ctx.accounts.vault_authority.key,
            ctx.accounts.sender.key,
            vault.amount,
        );

        anchor_lang::solana_program::program::invoke_signed(
            &ix,
            &[
                ctx.accounts.vault_authority.to_account_info(),
                ctx.accounts.sender.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[signer_seeds],
        )?;

        Ok(())
    }
}

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
        space = 8 + Vault::SPACE,
        seeds = [b"vault", sender.key().as_ref(), receiver.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        init_if_needed,
        payer = sender,
        space = 0,
        seeds = [b"vault_authority"],
        bump,
        owner = anchor_lang::system_program::ID
    )]
    /// CHECK: PDA derived from static seed ["vault_authority"], used only as a system-owned lamport custodian.
    pub vault_authority: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub receiver: Signer<'info>,
    #[account(
        mut,
        close = receiver,
        seeds = [b"vault", vault.sender.as_ref(), vault.receiver.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
    /// CHECK: PDA derived from static seed ["vault_authority"], used only as a system-owned lamport custodian.
    #[account(
        mut,
        seeds = [b"vault_authority"],
        bump,
        constraint = *vault_authority.owner == anchor_lang::system_program::ID @ LockPayError::InvalidState
    )]
    pub vault_authority: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Cancel<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    #[account(
        mut,
        close = sender,
        seeds = [b"vault", vault.sender.as_ref(), vault.receiver.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,
    /// CHECK: PDA derived from static seed ["vault_authority"], used only as a system-owned lamport custodian.
    #[account(
        mut,
        seeds = [b"vault_authority"],
        bump,
        constraint = *vault_authority.owner == anchor_lang::system_program::ID @ LockPayError::InvalidState
    )]
    pub vault_authority: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Vault {
    pub sender: Pubkey,
    pub receiver: Pubkey,
    pub amount: u64,
    pub claimed: bool,
    pub bump: u8,
}

impl Vault {
    pub const SPACE: usize = 32 + 32 + 8 + 1 + 1;
}

#[error_code]
pub enum LockPayError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("Invalid state")]
    InvalidState,
}