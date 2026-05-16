use lyquid::prelude::*;
use lyquid::lyquor_primitives::B256;

const DEPLOYER_ABI: &str = r#"[
  {
    "type": "constructor",
    "inputs": [
      { "name": "name", "type": "string", "internalType": "string" },
      { "name": "version", "type": "string", "internalType": "string" }
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
    "name": "build",
    "stateMutability": "view",
    "inputs": [
      { "name": "project", "type": "bytes", "internalType": "bytes" },
      { "name": "constructorInput", "type": "bytes", "internalType": "bytes" },
      { "name": "projectName", "type": "string", "internalType": "string" }
    ],
    "outputs": [
      { "name": "code", "type": "bytes", "internalType": "bytes" },
      { "name": "sourceHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "artifactHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "targetAbi", "type": "string", "internalType": "string" }
    ],
    "x-lyquid-transport": "off-chain"
  },
  {
    "type": "function",
    "name": "deploy",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "code", "type": "bytes", "internalType": "bytes" },
      { "name": "constructorInput", "type": "bytes", "internalType": "bytes" },
      { "name": "sourceHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "artifactHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "targetAbi", "type": "string", "internalType": "string" },
      { "name": "repoHint", "type": "string", "internalType": "string" }
    ],
    "outputs": [
      { "name": "lyquidId", "type": "string", "internalType": "string" }
    ]
  },
  {
    "type": "function",
    "name": "deployedCount",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      { "name": "count", "type": "uint64", "internalType": "uint64" }
    ]
  },
  {
    "type": "function",
    "name": "latestDeploymentFor",
    "stateMutability": "view",
    "inputs": [
      { "name": "owner", "type": "address", "internalType": "address" }
    ],
    "outputs": [
      { "name": "deploymentId", "type": "uint64", "internalType": "uint64" }
    ]
  },
  {
    "type": "function",
    "name": "getDeployment",
    "stateMutability": "view",
    "inputs": [
      { "name": "deploymentId", "type": "uint64", "internalType": "uint64" }
    ],
    "outputs": [
      { "name": "owner", "type": "address", "internalType": "address" },
      { "name": "codeHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "artifactHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "lyquidId", "type": "string", "internalType": "string" },
      { "name": "codeSize", "type": "uint64", "internalType": "uint64" }
    ]
  }
]"#;

state! {
    network name: String = String::new();
    network version: String = String::new();
    network deployed_count: u64 = 0;
    network owners: HashMap<u64, Address> = new_hashmap();
    network code_hashes: HashMap<u64, B256> = new_hashmap();
    network source_hashes: HashMap<u64, B256> = new_hashmap();
    network artifact_hashes: HashMap<u64, B256> = new_hashmap();
    network constructor_hashes: HashMap<u64, B256> = new_hashmap();
    network code_sizes: HashMap<u64, u64> = new_hashmap();
    network abi_jsons: HashMap<u64, String> = new_hashmap();
    network repo_hints: HashMap<u64, String> = new_hashmap();
    network lyquid_ids: HashMap<u64, String> = new_hashmap();
    network latest_by_owner: HashMap<Address, u64> = new_hashmap();
    instance build_count: u64 = 0;
    instance last_source_hash_by_caller: HashMap<Address, B256> = new_hashmap();
    instance last_artifact_hash_by_caller: HashMap<Address, B256> = new_hashmap();
}

fn hash_bytes(bytes: &[u8]) -> B256 {
    B256::from(*blake3::hash(bytes).as_bytes())
}

fn artifact_hash(project: &[u8], constructor_input: &[u8], project_name: &str) -> B256 {
    let mut bytes = Vec::new();
    bytes.extend_from_slice(project);
    bytes.extend_from_slice(constructor_input);
    bytes.extend_from_slice(project_name.as_bytes());
    hash_bytes(&bytes)
}

fn build_code(project: &[u8], constructor_input: &[u8], project_name: &str) -> Bytes {
    let mut code = Vec::new();
    code.extend_from_slice(b"lyquid-code-v1:");
    code.extend_from_slice(project_name.as_bytes());
    code.extend_from_slice(b":");
    code.extend_from_slice(&(project.len() as u64).to_be_bytes());
    code.extend_from_slice(&(constructor_input.len() as u64).to_be_bytes());
    code.extend_from_slice(project);
    Bytes::from(code)
}

#[method::network(export = eth)]
fn constructor(ctx: &mut _, name: String, version: String) {
    *ctx.network.name = name;
    *ctx.network.version = version;
}

#[method::instance(export = eth)]
fn abi(_ctx: &_) -> LyquidResult<String> {
    Ok(DEPLOYER_ABI.to_string())
}

#[method::instance(export = eth)]
fn build(ctx: &mut _, project: Bytes, constructor_input: Bytes, project_name: String) -> LyquidResult<(Bytes, B256, B256, String)> {
    let source_hash = hash_bytes(&project);
    let artifact_hash = artifact_hash(&project, &constructor_input, &project_name);
    let code = build_code(&project, &constructor_input, &project_name);

    *ctx.instance.build_count.write() += 1;
    ctx.instance
        .last_source_hash_by_caller
        .write()
        .insert(ctx.caller, source_hash);
    ctx.instance
        .last_artifact_hash_by_caller
        .write()
        .insert(ctx.caller, artifact_hash);

    Ok((code, source_hash, artifact_hash, DEPLOYER_ABI.to_string()))
}

#[method::network(export = eth)]
fn deploy(
    ctx: &mut _, code: Bytes, constructor_input: Bytes, source_hash: B256, artifact_hash: B256, target_abi: String,
    repo_hint: String,
) -> LyquidResult<String> {
    let deployment_id = *ctx.network.deployed_count + 1;
    let owner = ctx.caller;
    let lyquid_id = LyquidID::from_owner_nonce(&owner, deployment_id - 1).to_string();

    *ctx.network.deployed_count = deployment_id;
    ctx.network.owners.insert(deployment_id, owner);
    ctx.network.code_hashes.insert(deployment_id, hash_bytes(&code));
    ctx.network.source_hashes.insert(deployment_id, source_hash);
    ctx.network.artifact_hashes.insert(deployment_id, artifact_hash);
    ctx.network
        .constructor_hashes
        .insert(deployment_id, hash_bytes(&constructor_input));
    ctx.network.code_sizes.insert(deployment_id, code.len() as u64);
    ctx.network.abi_jsons.insert(deployment_id, target_abi);
    ctx.network.repo_hints.insert(deployment_id, repo_hint);
    ctx.network.lyquid_ids.insert(deployment_id, lyquid_id.clone());
    ctx.network.latest_by_owner.insert(owner, deployment_id);

    Ok(lyquid_id)
}

#[method::network(export = eth)]
fn deployedCount(ctx: &_) -> LyquidResult<u64> {
    Ok(*ctx.network.deployed_count)
}

#[method::network(export = eth)]
fn latestDeploymentFor(ctx: &_, owner: Address) -> LyquidResult<u64> {
    Ok(ctx.network.latest_by_owner.get(&owner).copied().unwrap_or(0))
}

#[method::network(export = eth)]
fn getDeployment(ctx: &_, deployment_id: u64) -> LyquidResult<(Address, B256, B256, String, u64)> {
    let owner = ctx
        .network
        .owners
        .get(&deployment_id)
        .copied()
        .ok_or(LyquidError::LyquidRuntime("deployment does not exist".into()))?;
    let code_hash = ctx
        .network
        .code_hashes
        .get(&deployment_id)
        .copied()
        .ok_or(LyquidError::LyquidRuntime("deployment code hash missing".into()))?;
    let artifact_hash = ctx
        .network
        .artifact_hashes
        .get(&deployment_id)
        .copied()
        .ok_or(LyquidError::LyquidRuntime("deployment artifact hash missing".into()))?;
    let lyquid_id = ctx
        .network
        .lyquid_ids
        .get(&deployment_id)
        .cloned()
        .ok_or(LyquidError::LyquidRuntime("deployment lyquid id missing".into()))?;
    let code_size = ctx.network.code_sizes.get(&deployment_id).copied().unwrap_or(0);

    Ok((owner, code_hash, artifact_hash, lyquid_id, code_size))
}
