use anchor_lang::prelude::*;

pub fn system_transfer_signed<'info>(
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    system_program: AccountInfo<'info>,
    lamports: u64,
    signer_seeds: &[&[u8]],
) -> Result<()> {
    let ix = anchor_lang::solana_program::system_instruction::transfer(from.key, to.key, lamports);

    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[from, to, system_program],
        &[signer_seeds],
    )?;

    Ok(())
}
