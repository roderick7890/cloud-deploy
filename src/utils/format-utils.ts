export function shortHash(value: string | undefined) {
  if (!value) {
    return "Unavailable";
  }

  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function shortAddress(value: string | undefined) {
  return shortHash(value);
}

export function formatStatus(value: string | undefined) {
  if (!value) {
    return "Unknown";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}
