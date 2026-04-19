export function getDiceBearAvatarUrl(seed: string) {
  const normalizedSeed = seed.trim() || "flowsense";
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(normalizedSeed)}`;
}