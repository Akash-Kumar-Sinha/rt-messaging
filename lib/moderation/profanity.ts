/**
 * Server-Side Profanity Moderation Service
 * Features:
 * - Robust input normalization against bypass techniques
 * - Leetspeak & phonetic character substitution mapping
 * - Repetition collapsing (e.g., "fuuuuck" -> "fuck")
 * - Punctuation & zero-width character stripping (e.g., "f.u.c.k", "b a d")
 * - Word boundary and sub-token pattern detection
 */

export interface ProfanityCheckResult {
  passed: boolean;
  score: number; // 0.0 (safe) to 1.0 (severe profanity)
  reason?: string;
  matchedWords: string[];
  normalizedText: string;
}

// Canonical blocklist of profane / abusive terms
const BLOCKED_WORDS = [
  "fuck",
  "fucking",
  "fucker",
  "fucked",
  "shit",
  "shitty",
  "bitch",
  "bitches",
  "asshole",
  "bastard",
  "dick",
  "cunt",
  "pussy",
  "whore",
  "slut",
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "cock",
  "blowjob",
  "motherfucker",
  "bullshit",
  "nazi",
  "hitler",
];

// Allowed words list to prevent false positives in benign compound words
const ALLOWED_WORDS = new Set([
  "cocktail",
  "cocktails",
  "cockatiel",
  "cockatiels",
  "peacock",
  "peacocks",
  "shuttlecock",
  "shuttlecocks",
  "cockpit",
  "cockpits",
  "hitchcock",
  "document",
  "documents",
  "documentation",
  "pass",
  "passion",
  "passive",
  "asset",
  "assets",
  "assessment",
  "assess",
  "assume",
  "class",
  "classic",
  "glass",
  "grass",
  "bass",
  "mass",
  "compass",
  "embassy",
  "assemble",
  "assembly",
  "assistance",
  "assistant",
  "associate",
  "association",
  "pushpin",
  "scraping",
  "scunthorpe",
  "snigger",
  "penistone",
]);

// Leetspeak and symbol substitution table
const LEET_MAP: Record<string, string> = {
  "@": "a",
  "4": "a",
  "/\\": "a",
  "/-\\": "a",
  "8": "b",
  "13": "b",
  "(": "c",
  "<": "c",
  "{": "c",
  "[": "c",
  "3": "e",
  "€": "e",
  "6": "g",
  "9": "g",
  "#": "h",
  "|-|": "h",
  "!": "i",
  "1": "i",
  "|": "i",
  "l": "l",
  "0": "o",
  "()": "o",
  "[]": "o",
  "5": "s",
  "$": "s",
  "§": "s",
  "7": "t",
  "+": "t",
  "†": "t",
  "\\/": "v",
  "\\/\\/": "w",
  "vv": "w",
  "2": "z",
};

/**
 * Normalizes text to counter obfuscation and bypass attempts
 */
export function normalizeProfanityText(raw: string): {
  collapsed: string;
  wordsNormalized: string[];
  reconstructed: string[];
  substituted: string;
} {
  if (!raw) return { collapsed: "", wordsNormalized: [], reconstructed: [], substituted: "" };

  // 1. Lowercase
  let text = raw.toLowerCase();

  // 2. Strip zero-width, control characters and combining diacritics
  text = text.normalize("NFKD").replace(/[\u0300-\u036f\u200B-\u200D\uFEFF]/g, "");

  // 3. Replace multi-character leet representations first
  text = text.replace(/\|-\|/g, "h").replace(/\\\/\//g, "w").replace(/\/-\\/g, "a");

  // 4. Character by character leet substitution
  let substituted = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    substituted += LEET_MAP[char] || char;
  }

  // 5. Build words list by splitting on standard spaces and punctuation
  const wordsNormalized = substituted
    .split(/[\s\-_.,/\\!@#$%^&*()+=~`[\]{}|:;"'<>?]+/i)
    .map((w) => w.replace(/(.)\1{2,}/g, "$1$1")) // Collapse 3+ repeats to 2 (e.g. fuuuuck -> fuuck)
    .filter(Boolean);

  // 6. Reconstruct words from spaced-out / punctuation-separated single characters (e.g. "f u c k" -> "fuck")
  const reconstructed: string[] = [];
  let buffer = "";
  for (const w of wordsNormalized) {
    if (w.length === 1) {
      buffer += w;
    } else {
      if (buffer) {
        reconstructed.push(buffer);
        buffer = "";
      }
      reconstructed.push(w);
    }
  }
  if (buffer) reconstructed.push(buffer);

  // 7. Fully collapsed string (removes all punctuation, spaces and separators)
  let fullyCollapsed = substituted.replace(/[^a-z0-9]/gi, "");
  fullyCollapsed = fullyCollapsed.replace(/(.)\1{2,}/g, "$1$1");

  return {
    collapsed: fullyCollapsed,
    wordsNormalized,
    reconstructed,
    substituted,
  };
}

/**
 * Checks a text payload against the profanity filter
 */
export function checkProfanity(rawText: string): ProfanityCheckResult {
  if (!rawText || rawText.trim().length === 0) {
    return {
      passed: true,
      score: 0.0,
      matchedWords: [],
      normalizedText: "",
    };
  }

  const { collapsed, wordsNormalized, reconstructed, substituted } = normalizeProfanityText(rawText);
  const matchedSet = new Set<string>();
  const allTokens = [...new Set([...wordsNormalized, ...reconstructed])];

  for (const blocked of BLOCKED_WORDS) {
    const blockedSingle = blocked.replace(/(.)\1+/g, "$1");

    for (const token of allTokens) {
      if (ALLOWED_WORDS.has(token)) continue;

      if (token === blocked) {
        matchedSet.add(blocked);
        continue;
      }
      const tokenSingle = token.replace(/(.)\1+/g, "$1");
      if (tokenSingle === blockedSingle) {
        matchedSet.add(blocked);
        continue;
      }

      // If token contains a severe blocked word and is not in allowed list
      if (
        ["fuck", "shit", "bitch", "cunt", "nigger", "faggot", "asshole", "motherfucker"].includes(blocked) &&
        token.includes(blocked)
      ) {
        matchedSet.add(blocked);
      }
    }

    // Word boundary check in original substituted text
    const boundaryRegex = new RegExp(`\\b${blocked}\\b`, "i");
    if (boundaryRegex.test(substituted)) {
      matchedSet.add(blocked);
    }
  }

  const matchedWords = Array.from(matchedSet);
  const passed = matchedWords.length === 0;
  const score = passed ? 0.0 : Math.min(1.0, 0.75 + matchedWords.length * 0.1);

  return {
    passed,
    score,
    reason: passed ? undefined : `Message rejected: prohibited profanity detected (${matchedWords.join(", ")})`,
    matchedWords,
    normalizedText: collapsed,
  };
}
