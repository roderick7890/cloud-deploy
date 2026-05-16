function toHex(bytes: ArrayBuffer) {
  return `0x${Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

function sortForJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortForJson);
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortForJson(item)])
    );
  }

  return value;
}

async function sha256Bytes(bytes: Uint8Array) {
  const digestInput = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(digestInput).set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", digestInput);
  return toHex(digest);
}

async function hashStableJson(value: unknown) {
  return sha256Bytes(new TextEncoder().encode(JSON.stringify(sortForJson(value))));
}

export async function hashSource(source: Uint8Array) {
  return sha256Bytes(source);
}

export async function hashConstructorInput(values: Record<string, string>) {
  return hashStableJson(values);
}

export async function hashPayload(payload: unknown) {
  return hashStableJson(payload);
}
