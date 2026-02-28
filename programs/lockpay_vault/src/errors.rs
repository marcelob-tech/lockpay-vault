use anchor_lang::prelude::*;

#[error_code]
pub enum LockPayError {
    #[msg("Receiver mismatch")]
    ReceiverMismatch,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("Invalid state")]
    InvalidState,
}
