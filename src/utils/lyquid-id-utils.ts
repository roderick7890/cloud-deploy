import { bytesToHex, getAddress, isAddress, sha256, type Address } from "viem";

const lyquidPrefix = "Lyquid-";
const base58Alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function decodeBase58(value: string) {
  const bytes = [0];

  for (const character of value) {
    const alphabetIndex = base58Alphabet.indexOf(character);

    if (alphabetIndex < 0) {
      throw new Error("Invalid Lyquid ID encoding.");
    }

    let carry = alphabetIndex;
    for (let index = 0; index < bytes.length; index += 1) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
    }

    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  for (const character of value) {
    if (character !== "1") {
      break;
    }

    bytes.push(0);
  }

  return Uint8Array.from(bytes.reverse());
}

export function lyquidIdToAddress(value: string): Address {
  const trimmedValue = value.trim();

  if (isAddress(trimmedValue)) {
    return getAddress(trimmedValue);
  }

  if (!trimmedValue.startsWith(lyquidPrefix)) {
    throw new Error("Lyquid ID must start with `Lyquid-`.");
  }

  const decoded = decodeBase58(trimmedValue.slice(lyquidPrefix.length));
  if (decoded.length !== 24) {
    throw new Error("Invalid Lyquid ID length.");
  }

  const payload = decoded.slice(0, 20);
  const checksum = decoded.slice(20);
  const expectedChecksum = sha256(payload).slice(-8);

  if (bytesToHex(checksum).slice(2) !== expectedChecksum) {
    throw new Error("Invalid Lyquid ID checksum.");
  }

  return bytesToHex(payload);
}
