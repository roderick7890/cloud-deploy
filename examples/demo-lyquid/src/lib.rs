use lyquid::prelude::*;

state! {
    network greeting: String = String::new();
    network greet_count: u64 = 0;
    instance per_user_count: HashMap<Address, u64> = new_hashmap();
}

#[method::network(export = eth)]
fn constructor(ctx: &mut _, greeting: String) {
    *ctx.network.greeting = greeting;
}

#[method::network(export = eth)]
fn set_greeting(ctx: &mut _, greeting: String) -> LyquidResult<bool> {
    *ctx.network.greeting = greeting;
    Ok(true)
}

#[method::network(export = eth)]
fn greet(ctx: &mut _) -> LyquidResult<bool> {
    *ctx.network.greet_count += 1;
    Ok(true)
}

#[method::network(export = eth)]
fn get_greeting_message(ctx: &_) -> LyquidResult<String> {
    Ok(format!(
        "{} I've greeted {} times to on-chain users",
        ctx.network.greeting, ctx.network.greet_count
    ))
}

#[method::instance(export = eth)]
fn greet_me(ctx: &mut _) -> LyquidResult<String> {
    let mut per_user_count = ctx.instance.per_user_count.write();
    let user = per_user_count.entry(ctx.caller).or_default();
    *user += 1;
    Ok(format!(
        "{} I've greeted {} times to on-chain users, and {} times to you",
        ctx.network.greeting, ctx.network.greet_count, *user
    ))
}
