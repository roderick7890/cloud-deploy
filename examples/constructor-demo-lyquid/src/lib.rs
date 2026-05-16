use lyquid::prelude::*;

const DEMO_ABI: &str = r#"[
  {
    "type": "constructor",
    "inputs": [
      { "name": "owner", "type": "address", "internalType": "address" },
      { "name": "initialLabel", "type": "string", "internalType": "string" },
      { "name": "limit", "type": "uint256", "internalType": "uint256" }
    ]
  },
  {
    "type": "function",
    "name": "abi",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      { "name": "json", "type": "string", "internalType": "string" }
    ],
    "x-lyquid-transport": "off-chain"
  },
  {
    "type": "function",
    "name": "owner",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      { "name": "owner", "type": "address", "internalType": "address" }
    ]
  },
  {
    "type": "function",
    "name": "label",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      { "name": "label", "type": "string", "internalType": "string" }
    ]
  },
  {
    "type": "function",
    "name": "limit",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      { "name": "limit", "type": "uint256", "internalType": "uint256" }
    ]
  },
  {
    "type": "function",
    "name": "counter",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      { "name": "counter", "type": "uint256", "internalType": "uint256" }
    ]
  },
  {
    "type": "function",
    "name": "setLabel",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "nextLabel", "type": "string", "internalType": "string" }
    ],
    "outputs": [
      { "name": "ok", "type": "bool", "internalType": "bool" }
    ]
  },
  {
    "type": "function",
    "name": "increment",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "amount", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      { "name": "counter", "type": "uint256", "internalType": "uint256" }
    ]
  },
  {
    "type": "function",
    "name": "getState",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      { "name": "owner", "type": "address", "internalType": "address" },
      { "name": "label", "type": "string", "internalType": "string" },
      { "name": "limit", "type": "uint256", "internalType": "uint256" },
      { "name": "counter", "type": "uint256", "internalType": "uint256" }
    ]
  }
]"#;

state! {
    network owner: Address = Address::ZERO;
    network label: String = String::new();
    network limit: U256 = U256::ZERO;
    network counter: U256 = U256::ZERO;
}

#[method::network(export = eth)]
fn constructor(ctx: &mut _, owner: Address, initial_label: String, limit: U256) {
    *ctx.network.owner = owner;
    *ctx.network.label = initial_label;
    *ctx.network.limit = limit;
}

#[method::instance(export = eth)]
fn abi(_ctx: &_) -> LyquidResult<String> {
    Ok(DEMO_ABI.to_string())
}

#[method::network(export = eth)]
fn owner(ctx: &_) -> LyquidResult<Address> {
    Ok(*ctx.network.owner)
}

#[method::network(export = eth)]
fn label(ctx: &_) -> LyquidResult<String> {
    Ok(ctx.network.label.clone())
}

#[method::network(export = eth)]
fn limit(ctx: &_) -> LyquidResult<U256> {
    Ok(*ctx.network.limit)
}

#[method::network(export = eth)]
fn counter(ctx: &_) -> LyquidResult<U256> {
    Ok(*ctx.network.counter)
}

#[method::network(export = eth)]
fn setLabel(ctx: &mut _, next_label: String) -> LyquidResult<bool> {
    if ctx.caller != *ctx.network.owner {
        return Err(LyquidError::LyquidRuntime("only owner can set label".into()));
    }

    *ctx.network.label = next_label;
    Ok(true)
}

#[method::network(export = eth)]
fn increment(ctx: &mut _, amount: U256) -> LyquidResult<U256> {
    let next = *ctx.network.counter + amount;
    if next > *ctx.network.limit {
        return Err(LyquidError::LyquidRuntime("counter limit exceeded".into()));
    }

    *ctx.network.counter = next;
    Ok(next)
}

#[method::network(export = eth)]
fn getState(ctx: &_) -> LyquidResult<(Address, String, U256, U256)> {
    Ok((
        *ctx.network.owner,
        ctx.network.label.clone(),
        *ctx.network.limit,
        *ctx.network.counter,
    ))
}
