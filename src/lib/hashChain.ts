// ============================================================================
// HASH CHAIN UTILITIES
// Evidence-first architecture: cryptographic proof of decision sequence
// ============================================================================

/**
 * Hash chain entry for audit trail.
 * Each entry contains a hash that chains to the previous entry,
 * creating a tamper-evident log.
 */
export interface HashChainEntry<T> {
  index: number;
  timestamp: string;
  previousHash: string;
  hash: string;
  data: T;
}

/**
 * Compute SHA-256 hash of data (browser-native).
 * Returns hex-encoded string.
 */
export async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create a new hash chain with a genesis entry.
 */
export async function createHashChain<T>(
  initialData: T
): Promise<HashChainEntry<T>[]> {
  const timestamp = new Date().toISOString();
  const dataStr = JSON.stringify({ timestamp, data: initialData });
  const hash = await computeHash("GENESIS:" + dataStr);

  return [
    {
      index: 0,
      timestamp,
      previousHash: "GENESIS",
      hash,
      data: initialData,
    },
  ];
}

/**
 * Append a new entry to the hash chain.
 * Returns the new entry (does not mutate chain).
 */
export async function appendToChain<T>(
  chain: HashChainEntry<T>[],
  data: T
): Promise<HashChainEntry<T>> {
  if (chain.length === 0) {
    throw new Error("Cannot append to empty chain - use createHashChain first");
  }

  const previousEntry = chain[chain.length - 1]!;
  const timestamp = new Date().toISOString();
  const index = previousEntry.index + 1;

  const dataStr = JSON.stringify({
    index,
    timestamp,
    previousHash: previousEntry.hash,
    data,
  });
  const hash = await computeHash(dataStr);

  return {
    index,
    timestamp,
    previousHash: previousEntry.hash,
    hash,
    data,
  };
}

/**
 * Verify the integrity of a hash chain.
 * Returns true if all hashes are valid and chain is unbroken.
 */
export async function verifyChain<T>(
  chain: HashChainEntry<T>[]
): Promise<{ valid: boolean; brokenAt?: number; error?: string }> {
  if (chain.length === 0) {
    return { valid: true };
  }

  // Verify genesis
  const genesis = chain[0]!;
  if (genesis.previousHash !== "GENESIS") {
    return { valid: false, brokenAt: 0, error: "Invalid genesis block" };
  }

  const genesisDataStr = JSON.stringify({
    timestamp: genesis.timestamp,
    data: genesis.data,
  });
  const expectedGenesisHash = await computeHash("GENESIS:" + genesisDataStr);
  if (genesis.hash !== expectedGenesisHash) {
    return { valid: false, brokenAt: 0, error: "Genesis hash mismatch" };
  }

  // Verify chain
  for (let i = 1; i < chain.length; i++) {
    const entry = chain[i]!;
    const previous = chain[i - 1]!;

    // Check link
    if (entry.previousHash !== previous.hash) {
      return { valid: false, brokenAt: i, error: "Chain link broken" };
    }

    // Verify hash
    const dataStr = JSON.stringify({
      index: entry.index,
      timestamp: entry.timestamp,
      previousHash: entry.previousHash,
      data: entry.data,
    });
    const expectedHash = await computeHash(dataStr);
    if (entry.hash !== expectedHash) {
      return { valid: false, brokenAt: i, error: "Hash mismatch" };
    }
  }

  return { valid: true };
}

/**
 * Export chain to JSON string for download/backup.
 */
export function exportChain<T>(chain: HashChainEntry<T>[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: "1.0.0",
      chainLength: chain.length,
      entries: chain,
    },
    null,
    2
  );
}

/**
 * Get chain summary for display.
 */
export function getChainSummary<T>(chain: HashChainEntry<T>[]): {
  length: number;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  lastHash: string | null;
} {
  if (chain.length === 0) {
    return {
      length: 0,
      firstTimestamp: null,
      lastTimestamp: null,
      lastHash: null,
    };
  }

  const first = chain[0]!;
  const last = chain[chain.length - 1]!;

  return {
    length: chain.length,
    firstTimestamp: first.timestamp,
    lastTimestamp: last.timestamp,
    lastHash: last.hash,
  };
}
