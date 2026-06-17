//! Cloud Deploy Lyquid wrapper.
//!
//! The deployable UI is packaged from `assets/`. The contract surface is kept minimal; Cloud
//! Deploy's browser app owns deployment workflows through user-selected endpoints and wallets.

use lyquid::prelude::*;

const APP_NAME: &str = "cloud-deploy";
const APP_VERSION: &str = "0.1.0";

state! {
    network deployed_by: Address = Address::ZERO;
}

#[method::network(export = eth)]
fn constructor(ctx: &mut _) {
    *ctx.network.deployed_by = ctx.caller;
}

#[method::network(export = eth)]
fn get_app_info(ctx: &_) -> LyquidResult<String> {
    Ok(format!(
        "{{\"name\":\"{}\",\"version\":\"{}\",\"deployedBy\":\"{:?}\"}}",
        APP_NAME, APP_VERSION, ctx.network.deployed_by
    ))
}
