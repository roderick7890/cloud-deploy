export function shortHash(value: string | undefined) {
  if (!value) {
    return "Unavailable";
  }

  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
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
