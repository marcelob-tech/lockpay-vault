use anchor_lang::prelude::*;

declare_id!("6YwvmcWvd2ijBN3ecMhi3VJ2ghmgRbvuWMboHk3JSkPu");

pub mod constants;
pub mod contexts;
pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

pub use contexts::*;

#[program]
pub mod lockpay_vault {
    use super::*;

    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        receiver: Pubkey,
        amount: u64,
    ) -> Result<()> {
        instructions::initialize_vault::handler(ctx, receiver, amount)
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        instructions::claim::handler(ctx)
    }

    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        instructions::cancel::handler(ctx)
    }
}