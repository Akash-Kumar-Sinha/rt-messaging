"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { PickerSurface, PickerSearch, PickerTabs, PickerTab, PickerContent } from "./picker-surface";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
  emojis: string[];
}

const DEFAULT_RECENTS = [
  "😀", "😂", "🔥", "❤️", "👍", "🙌", "✨", "🎉",
  "👀", "🚀", "💯", "🙏", "😭", "😎", "🫡", "💀",
];

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "smileys",
    name: "Smileys",
    icon: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "🥹", "😊", "😇", "🙂", "🙃", "😉", "😌",
      "😍", "🥰", "😘", "😗", "😚", "😋", "😛", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳",
      "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😮‍💨", "😤",
      "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🫣", "🤭",
      "🫢", "🫡", "🤫", "🫠", "🤥", "😶", "😐", "😑", "😬", "🫨", "😯", "😦", "😧", "😮", "😲", "🥱",
      "😴", "🤤", "😪", "😵", "😵‍💫", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤑", "🤠", "😈", "👿",
      "👻", "💀", "☠️", "👽", "👾", "🤖", "💩",
    ],
  },
  {
    id: "people",
    name: "People",
    icon: "👍",
    emojis: [
      "👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "✌️", "🫰", "🤟", "🤘", "👌", "🤌", "🤏", "👈", "👉",
      "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤙", "🫲", "🫱", "🫵", "🤝", "✍️", "👏", "🙌",
      "👐", "🤲", "🙏", "💅", "🤳", "💪", "👀", "👁️", "🧠", "🫀", "🙋", "🤷", "🤦", "🙆", "🙅", "🙇",
    ],
  },
  {
    id: "animals",
    name: "Animals",
    icon: "🐾",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔",
      "🐧", "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞",
      "🐜", "🪲", "🕷️", "🦂", "🐢", "🐍", "🦎", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬",
      "🐳", "🦈", "🦭", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘",
      "🌸", "🌺", "🌹", "🌻", "🌼", "🌷", "🌱", "🌲", "🌳", "🌴", "🌵", "🍀", "🍁", "🍂", "🍃", "🍄",
    ],
  },
  {
    id: "food",
    name: "Food",
    icon: "🍔",
    emojis: [
      "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥",
      "🥝", "🍅", "🥑", "🥦", "🥬", "🥒", "🌶️", "🌽", "🥕", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞",
      "🥖", "🥨", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🌭", "🍔", "🍟", "🍕",
      "🥪", "🥙", "🌮", "🌯", "🥗", "🥘", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙", "🍚",
      "🍘", "🍥", "🥠", "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🍫", "🍬", "🍭", "🍮", "🍯",
      "☕", "🫖", "🍵", "🧃", "🥤", "🧋", "🍶", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🍾", "🧊",
    ],
  },
  {
    id: "activities",
    name: "Activities",
    icon: "⚽",
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍",
      "🏏", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸️", "🥌", "🎿",
      "⛷️", "🏂", "🏋️", "🤼", "🤸", "🤺", "🧗", "🧘", "🏇", "🚴", "🚵", "🏆", "🥇", "🥈", "🥉", "🏅",
      "🎖️", "🎫", "🎟️", "🎪", "🎭", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🎷", "🎺", "🎸", "🪕",
      "🎮", "🕹️", "🎲", "🧩", "🎯", "🎳", "🪄", "🪅", "♟️", "🃏",
    ],
  },
  {
    id: "travel",
    name: "Travel",
    icon: "🚗",
    emojis: [
      "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🛵", "🏍️",
      "🚲", "🛴", "🚨", "🚔", "✈️", "🛫", "🛬", "🛩️", "🚀", "🛸", "🚁", "🛶", "⛵", "🚤", "🛳️", "⛴️",
      "🚢", "⚓", "⛽", "🚧", "🚦", "🚥", "🗺️", "🗿", "🗽", "🗼", "🏰", "🏯", "🏟️", "🎡", "🎢", "🎠",
      "⛲", "⛱️", "🏖️", "🏝️", "🏜️", "🌋", "⛰️", "🏔️", "🏕️", "⛺", "🏠", "🏡", "🏢", "🏣", "🏥", "🏦",
    ],
  },
  {
    id: "objects",
    name: "Objects",
    icon: "💡",
    emojis: [
      "💡", "🔦", "🕯️", "🪔", "📱", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "📷", "📸", "📹", "📼", "🔍", "🔎",
      "🔬", "🔭", "📡", "⏰", "⏱️", "⏲️", "⏳", "⌛", "📦", "📫", "📬", "💌", "📧", "📝", "📁", "📂",
      "📅", "📆", "📊", "📈", "📉", "📌", "📍", "📎", "📏", "📐", "✂️", "🔒", "🔓", "🔏", "🔑", "🗝️",
      "🔨", "🪓", "🔧", "🪛", "🔩", "⚙️", "🧰", "🧲", "🪜", "🧪", "🧫", "🧬", "🩺", "🩹", "💊", "💉",
    ],
  },
  {
    id: "symbols",
    name: "Symbols",
    icon: "❤️",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓",
      "💗", "💖", "💘", "💝", "💟", "🔥", "✨", "🌟", "⭐", "🎉", "🎊", "💯", "🎯", "⚡", "💥", "💫",
      "💬", "💭", "🗯️", "💤", "🔔", "🔕", "🎵", "🎶", "⚠️", "⛔", "🚫", "✅", "❌", "❓", "❗", "‼️",
    ],
  },
];

// Keyword search dictionary for instant lookups
const EMOJI_KEYWORDS: Record<string, string[]> = {
  "😀": ["smile", "happy", "grin", "face"],
  "😃": ["smile", "happy", "joy", "grin"],
  "😄": ["laugh", "happy", "grin", "joy"],
  "😁": ["beam", "grin", "teeth", "smile"],
  "😆": ["laugh", "haha", "xd", "funny"],
  "😅": ["sweat", "nervous", "relief", "smile"],
  "😂": ["laugh", "cry", "joy", "lol", "funny", "haha", "rofl", "tears"],
  "🤣": ["rofl", "rolling", "laughing", "lol", "funny"],
  "🥲": ["grateful", "smile", "tear", "proud"],
  "🥹": ["pleading", "teary", "eyes", "proud", "moved"],
  "😊": ["blush", "smile", "warm", "happy"],
  "😇": ["angel", "halo", "innocent", "pure"],
  "🙂": ["smile", "slight", "ok", "fine"],
  "🙃": ["upside down", "sarcasm", "silly", "irony"],
  "😉": ["wink", "flirt", "joke"],
  "😌": ["relieved", "calm", "peaceful", "zen"],
  "😍": ["love", "heart eyes", "crush", "adore"],
  "🥰": ["love", "hearts", "affection", "warm"],
  "😘": ["kiss", "love", "blow kiss"],
  "😋": ["delicious", "yummy", "tongue", "food"],
  "😛": ["tongue", "silly", "playful"],
  "😜": ["wink", "tongue", "crazy", "joke"],
  "🤪": ["zany", "wild", "crazy", "goofy"],
  "🤨": ["raised eyebrow", "suspicious", "skeptical"],
  "🧐": ["monocle", "curious", "inspect", "hmm"],
  "🤓": ["nerd", "geek", "glasses", "smart"],
  "😎": ["cool", "sunglasses", "chill", "boss"],
  "🥳": ["party", "hat", "birthday", "celebrate", "tada"],
  "😏": ["smirk", "flirt", "sly", "clever"],
  "😒": ["unamused", "annoyed", "bored"],
  "😞": ["disappointed", "sad", "down"],
  "😔": ["pensive", "sad", "thoughtful", "sorry"],
  "😟": ["worried", "nervous", "anxious"],
  "😕": ["confused", "puzzled", "uncertain"],
  "🥺": ["pleading", "puppy eyes", "please", "beg"],
  "😢": ["crying", "sad", "tear"],
  "😭": ["cry", "sad", "sob", "tears", "bawling"],
  "😤": ["huff", "triumph", "frustrated", "proud"],
  "😠": ["angry", "mad", "annoyed"],
  "😡": ["rage", "furious", "mad", "red"],
  "🤬": ["curse", "swear", "angry", "censored"],
  "🤯": ["mind blown", "shocked", "explode", "brain"],
  "😳": ["flushed", "embarrassed", "shocked", "wide eyes"],
  "🥵": ["hot", "sweat", "spicy", "summer"],
  "🥶": ["cold", "freezing", "ice", "winter"],
  "😱": ["scream", "shocked", "scared", "fear"],
  "😨": ["fearful", "scared", "nervous"],
  "😰": ["anxious", "cold sweat", "scared"],
  "😥": ["relieved", "phew", "sweat"],
  "😓": ["downcast", "sweat", "tired"],
  "🤗": ["hug", "open arms", "embrace"],
  "🤔": ["thinking", "hmm", "ponder", "curious"],
  "🫣": ["peeking", "shy", "cover eyes"],
  "🫡": ["salute", "respect", "yes sir", "duty"],
  "🤫": ["shh", "quiet", "secret", "silence"],
  "🫠": ["melting", "dissolving", "embarrassed"],
  "🤥": ["liar", "pinocchio", "nose"],
  "😶": ["silent", "no mouth", "speechless"],
  "😐": ["neutral", "poker face", "meh"],
  "😑": ["expressionless", "straight face", "unmoved"],
  "😬": ["grimace", "awkward", "teeth", "yikes"],
  "😴": ["sleep", "tired", "zzz", "snore"],
  "🤤": ["drool", "hungry", "craving"],
  "😵": ["dizzy", "knocked out", "dead"],
  "😵‍💫": ["spiral eyes", "hypnotized", "disoriented"],
  "🤐": ["zipper", "zipped", "secret", "quiet"],
  "🥴": ["woozy", "tipsy", "drunk", "dizzy"],
  "🤢": ["nauseated", "sick", "green", "gross"],
  "🤮": ["vomit", "puke", "sick", "disgust"],
  "🤧": ["sneeze", "cold", "tissue"],
  "😷": ["mask", "sick", "covid", "doctor"],
  "🤒": ["thermometer", "fever", "sick"],
  "🤑": ["money", "rich", "cash", "dollar"],
  "🤠": ["cowboy", "hat", "western"],
  "😈": ["devil", "evil", "purple", "smile"],
  "👿": ["devil", "angry", "demon"],
  "👻": ["ghost", "spooky", "halloween", "boo"],
  "💀": ["skull", "dead", "died", "skeleton", "death"],
  "☠️": ["pirate", "danger", "crossbones", "poison"],
  "👽": ["alien", "ufo", "space"],
  "🤖": ["robot", "bot", "ai", "machine"],
  "💩": ["poop", "poo", "crap", "dung"],
  "👍": ["thumbsup", "yes", "ok", "good", "agree", "like"],
  "👎": ["thumbsdown", "no", "dislike", "bad"],
  "👊": ["fist bump", "punch", "solid"],
  "✊": ["raised fist", "power", "solidarity"],
  "🤞": ["fingers crossed", "luck", "hope"],
  "✌️": ["peace", "victory", "two"],
  "🫰": ["hand heart", "kpop", "love"],
  "🤟": ["love you", "rock on", "sign"],
  "🤘": ["rock", "metal", "horns"],
  "👌": ["ok", "perfect", "good", "fine"],
  "🤌": ["italian", "pinched fingers", "what do you mean"],
  "🤏": ["pinching hand", "little", "tiny", "small"],
  "👈": ["left", "point left", "that way"],
  "👉": ["right", "point right", "look here"],
  "👆": ["up", "point up", "this"],
  "👇": ["down", "point down", "below"],
  "☝️": ["index up", "one", "listen", "point"],
  "✋": ["hand", "stop", "high five"],
  "🤚": ["raised back of hand", "stop"],
  "🖐️": ["five", "splayed hand", "palm"],
  "🖖": ["vulcan", "spock", "star trek"],
  "👋": ["wave", "hello", "hi", "bye", "goodbye"],
  "🤙": ["call me", "shaka", "hang loose"],
  "🤝": ["handshake", "deal", "agree", "partner"],
  "✍️": ["write", "pencil", "signature", "draft"],
  "👏": ["clap", "applause", "bravo", "praise"],
  "🙌": ["hands", "hooray", "celebrate", "praise"],
  "👐": ["open hands", "hug"],
  "🤲": ["palms together", "pray", "receiving"],
  "🙏": ["pray", "please", "thanks", "thank you", "hope", "namaste"],
  "💅": ["nail polish", "slay", "sassy", "queen"],
  "🤳": ["selfie", "camera", "photo"],
  "💪": ["muscle", "flex", "strong", "power"],
  "👀": ["eyes", "look", "see", "watching", "sneaky"],
  "👁️": ["eye", "see", "vision"],
  "🧠": ["brain", "smart", "mind", "think"],
  "🫀": ["heart", "organ", "cardio"],
  "🐶": ["dog", "puppy", "pet", "bark"],
  "🐱": ["cat", "kitty", "kitten", "meow"],
  "🐭": ["mouse", "rat", "cheese"],
  "🐹": ["hamster", "rodent", "pet"],
  "🐰": ["rabbit", "bunny", "cute", "easter"],
  "🦊": ["fox", "clever", "wild"],
  "🐻": ["bear", "grizzly", "teddy"],
  "🐼": ["panda", "bear", "bamboo"],
  "🐨": ["koala", "australia"],
  "🐯": ["tiger", "wild", "stripes"],
  "🦁": ["lion", "king", "roar", "wild"],
  "🐮": ["cow", "moo", "milk"],
  "🐷": ["pig", "oink", "bacon"],
  "🐸": ["frog", "toad", "ribbit"],
  "🐵": ["monkey", "ape", "banana"],
  "🐔": ["chicken", "hen", "rooster"],
  "🐧": ["penguin", "cold", "bird", "antarctica"],
  "🐦": ["bird", "fly", "tweet"],
  "🐤": ["chick", "baby bird", "yellow"],
  "🦆": ["duck", "quack", "water"],
  "🦅": ["eagle", "bird", "freedom", "usa"],
  "🦉": ["owl", "night", "wise", "bird"],
  "🦇": ["bat", "vampire", "night", "halloween"],
  "🐺": ["wolf", "howl", "pack"],
  "🐗": ["boar", "pig", "wild"],
  "🐴": ["horse", "pony", "ride"],
  "🦄": ["unicorn", "magic", "fantasy"],
  "🐝": ["bee", "honey", "buzz", "sting"],
  "🐛": ["bug", "caterpillar", "insect"],
  "🦋": ["butterfly", "wings", "pretty", "nature"],
  "🐌": ["snail", "slow", "shell"],
  "🐞": ["ladybug", "beetle", "lucky"],
  "🐜": ["ant", "bug", "worker"],
  "🕷️": ["spider", "web", "creepy"],
  "🦂": ["scorpion", "sting", "desert"],
  "🐢": ["turtle", "slow", "shell"],
  "🐍": ["snake", "serpent", "slither"],
  "🦎": ["lizard", "gecko", "reptile"],
  "🐙": ["octopus", "tentacles", "sea"],
  "🦑": ["squid", "ocean", "tentacles"],
  "🦐": ["shrimp", "prawn", "seafood"],
  "🦞": ["lobster", "seafood", "claws"],
  "🦀": ["crab", "seafood", "beach"],
  "🐡": ["blowfish", "pufferfish", "spikes"],
  "🐠": ["tropical fish", "aquarium", "swim"],
  "🐟": ["fish", "seafood", "water"],
  "🐬": ["dolphin", "ocean", "sea"],
  "🐳": ["whale", "ocean", "spout"],
  "🦈": ["shark", "ocean", "jaws", "fin"],
  "🦭": ["seal", "sea", "cute"],
  "🐊": ["crocodile", "alligator", "reptile"],
  "🐅": ["tiger", "stripes", "wild"],
  "🐆": ["leopard", "spots", "cheetah"],
  "🦓": ["zebra", "stripes", "africa"],
  "🦍": ["gorilla", "ape", "strong"],
  "🦧": ["orangutan", "ape", "jungle"],
  "🐘": ["elephant", "trunk", "big"],
  "🦛": ["hippo", "water", "heavy"],
  "🦏": ["rhino", "horn", "africa"],
  "🐪": ["camel", "desert", "hump"],
  "🐫": ["camel", "two humps", "desert"],
  "🦒": ["giraffe", "tall", "neck"],
  "🦘": ["kangaroo", "australia", "jump"],
  "🌸": ["cherry blossom", "flower", "spring", "sakura"],
  "🌺": ["hibiscus", "flower", "tropical"],
  "🌹": ["rose", "flower", "red", "love", "romance"],
  "🌻": ["sunflower", "flower", "summer", "yellow"],
  "🌼": ["blossom", "daisy", "flower"],
  "🌷": ["tulip", "flower", "spring"],
  "🌱": ["seedling", "plant", "grow", "sprout"],
  "🌲": ["evergreen", "tree", "pine", "forest"],
  "🌳": ["tree", "nature", "oak", "green"],
  "🌴": ["palm tree", "beach", "tropical", "vacation"],
  "🌵": ["cactus", "desert", "plant"],
  "🍀": ["four leaf clover", "lucky", "luck", "ireland"],
  "🍁": ["maple leaf", "fall", "autumn", "canada"],
  "🍂": ["fallen leaf", "autumn", "fall"],
  "🍃": ["leaves", "wind", "blow", "green"],
  "🍄": ["mushroom", "fungus", "toadstool"],
  "🍏": ["green apple", "fruit", "healthy"],
  "🍎": ["red apple", "fruit", "healthy"],
  "🍐": ["pear", "fruit"],
  "🍊": ["tangerine", "orange", "citrus", "fruit"],
  "🍋": ["lemon", "sour", "citrus", "yellow"],
  "🍌": ["banana", "fruit", "yellow"],
  "🍉": ["watermelon", "summer", "fruit", "melon"],
  "🍇": ["grapes", "fruit", "wine"],
  "🍓": ["strawberry", "berry", "fruit", "red"],
  "🫐": ["blueberries", "berry", "fruit"],
  "🍈": ["melon", "cantaloupe", "fruit"],
  "🍒": ["cherries", "fruit", "red"],
  "🍑": ["peach", "fruit", "booty"],
  "🥭": ["mango", "tropical", "fruit"],
  "🍍": ["pineapple", "tropical", "fruit"],
  "🥥": ["coconut", "tropical", "fruit"],
  "🥝": ["kiwi", "fruit"],
  "🍅": ["tomato", "salad", "red"],
  "🥑": ["avocado", "guacamole", "healthy"],
  "🥦": ["broccoli", "vegetable", "green"],
  "🥬": ["leafy green", "lettuce", "salad"],
  "🥒": ["cucumber", "pickle", "vegetable"],
  "🌶️": ["hot pepper", "spicy", "chili"],
  "🌽": ["corn", "maize", "popcorn"],
  "🥕": ["carrot", "vegetable", "orange"],
  "🧄": ["garlic", "cooking", "spice"],
  "🧅": ["onion", "cooking", "vegetable"],
  "🥔": ["potato", "fries", "spud"],
  "🍠": ["sweet potato", "yam"],
  "🥐": ["croissant", "pastry", "french", "bread"],
  "🥯": ["bagel", "breakfast", "bread"],
  "🍞": ["bread", "toast", "loaf", "bakery"],
  "🥖": ["baguette", "french bread", "bakery"],
  "🥨": ["pretzel", "snack", "bavarian"],
  "🧀": ["cheese", "cheddar", "dairy"],
  "🥚": ["egg", "breakfast", "cooking"],
  "🍳": ["fried egg", "cooking", "breakfast"],
  "🧈": ["butter", "dairy", "cooking"],
  "🥞": ["pancakes", "syrup", "breakfast"],
  "🧇": ["waffle", "breakfast"],
  "🥓": ["bacon", "meat", "breakfast", "pork"],
  "🥩": ["meat", "steak", "beef", "bbq"],
  "🍗": ["poultry leg", "chicken", "drumstick", "turkey"],
  "🍖": ["meat on bone", "bbq"],
  "🌭": ["hot dog", "sausage", "bbq", "fast food"],
  "🍔": ["burger", "hamburger", "cheeseburger", "fast food"],
  "🍟": ["french fries", "fries", "fast food"],
  "🍕": ["pizza", "cheese", "slice", "italian"],
  "🥪": ["sandwich", "lunch", "deli"],
  "🥙": ["stuffed flatbread", "pita", "falafel"],
  "🌮": ["taco", "mexican", "food"],
  "🌯": ["burrito", "wrap", "mexican"],
  "🥗": ["green salad", "healthy", "vegan"],
  "🥘": ["shallow pan of food", "paella", "casserole"],
  "🍜": ["steaming bowl", "ramen", "noodles", "soup"],
  "🍲": ["pot of food", "stew", "soup"],
  "🍛": ["curry rice", "indian", "japanese"],
  "🍣": ["sushi", "japanese", "salmon", "raw fish"],
  "🍱": ["bento box", "japanese", "lunch"],
  "🥟": ["dumpling", "gyoza", "dim sum"],
  "🦪": ["oyster", "seafood", "shellfish"],
  "🍤": ["fried shrimp", "tempura", "seafood"],
  "🍙": ["rice ball", "onigiri", "japanese"],
  "🍚": ["cooked rice", "bowl"],
  "🍘": ["rice cracker", "snack"],
  "🍥": ["fish cake", "narutomaki", "ramen"],
  "🥠": ["fortune cookie", "chinese"],
  "🍦": ["soft ice cream", "cone", "dessert"],
  "🍧": ["shaved ice", "dessert", "sweet"],
  "🍨": ["ice cream", "dessert", "gelato"],
  "🍩": ["doughnut", "donut", "sweet", "pastry"],
  "🍪": ["cookie", "chocolate chip", "biscuit"],
  "🎂": ["birthday cake", "celebrate", "party"],
  "🍰": ["shortcake", "cake", "slice", "dessert"],
  "🧁": ["cupcake", "dessert", "sweet", "icing"],
  "🍫": ["chocolate bar", "sweet", "candy"],
  "🍬": ["candy", "sweet", "sugar"],
  "🍭": ["lollipop", "candy", "sweet"],
  "🍮": ["custard", "pudding", "dessert"],
  "🍯": ["honey pot", "sweet", "bee"],
  "☕": ["coffee", "tea", "hot beverage", "espresso", "latte"],
  "🫖": ["teapot", "tea"],
  "🍵": ["matcha", "green tea", "tea"],
  "🧃": ["beverage box", "juice"],
  "🥤": ["cup with straw", "soda", "drink"],
  "🧋": ["bubble tea", "boba", "tea"],
  "🍶": ["sake", "japanese", "bottle"],
  "🍺": ["beer", "cheers", "drink", "pub", "bar"],
  "🍻": ["beers", "cheers", "toast", "celebrate"],
  "🥂": ["clinking glasses", "champagne", "toast", "celebration"],
  "🍷": ["wine glass", "red wine", "alcohol"],
  "🥃": ["tumbler glass", "whiskey", "bourbon", "liquor"],
  "🍸": ["cocktail glass", "martini", "bar"],
  "🍹": ["tropical drink", "cocktail", "vacation"],
  "🍾": ["champagne bottle", "popping", "celebrate"],
  "🧊": ["ice cube", "cold", "frozen"],
  "⚽": ["soccer", "football", "ball", "sport"],
  "🏀": ["basketball", "nba", "ball", "sport"],
  "🏈": ["american football", "nfl", "ball"],
  "⚾": ["baseball", "mlb", "ball"],
  "🥎": ["softball", "ball"],
  "🎾": ["tennis", "ball", "racket"],
  "🏐": ["volleyball", "beach", "ball"],
  "🎱": ["billiards", "pool", "8 ball", "game"],
  "🏓": ["ping pong", "table tennis", "paddle"],
  "🏸": ["badminton", "shuttlecock", "racket"],
  "🥊": ["boxing glove", "fight", "punch"],
  "🛹": ["skateboard", "skating", "skater"],
  "🚴": ["biking", "bicycle", "cycling"],
  "🏆": ["trophy", "winner", "first", "award", "champion"],
  "🥇": ["1st place medal", "gold medal", "winner"],
  "🥈": ["2nd place medal", "silver medal"],
  "🥉": ["3rd place medal", "bronze medal"],
  "🎖️": ["military medal", "honor", "award"],
  "🎟️": ["admission tickets", "movie", "concert"],
  "🎪": ["circus tent", "carnival"],
  "🎭": ["performing arts", "theater", "drama", "masks"],
  "🎨": ["artist palette", "paint", "art", "creative"],
  "🎬": ["clapper board", "movie", "film", "cinema"],
  "🎤": ["microphone", "sing", "karaoke", "podcast"],
  "🎧": ["headphone", "music", "listen", "audio"],
  "🎼": ["musical score", "notes", "music"],
  "🎹": ["musical keyboard", "piano", "notes"],
  "🥁": ["drum", "music", "beat"],
  "🎷": ["saxophone", "jazz", "music"],
  "🎺": ["trumpet", "brass", "music"],
  "🎸": ["guitar", "rock", "music"],
  "🎮": ["video game", "controller", "gaming", "playstation", "xbox"],
  "🕹️": ["joystick", "arcade", "game"],
  "🎲": ["game die", "dice", "random", "board game"],
  "🧩": ["puzzle piece", "jigsaw", "problem"],
  "🎯": ["bullseye", "dart", "target", "goal"],
  "🎳": ["bowling", "strike", "pins"],
  "🪄": ["magic wand", "wizard", "spell"],
  "♟️": ["chess pawn", "strategy", "game"],
  "🚗": ["car", "automobile", "drive", "vehicle"],
  "🚕": ["taxi", "cab", "uber", "yellow"],
  "🚙": ["suv", "car", "drive"],
  "🚌": ["bus", "school bus", "transit"],
  "🏎️": ["racing car", "f1", "fast", "race"],
  "🚓": ["police car", "cops", "emergency"],
  "🚑": ["ambulance", "emergency", "hospital"],
  "🚒": ["fire engine", "fire truck", "emergency"],
  "🚚": ["delivery truck", "package", "cargo"],
  "🛵": ["motor scooter", "vespa", "moped"],
  "🏍️": ["motorcycle", "bike", "racing"],
  "🚲": ["bicycle", "bike", "cycling"],
  "🛴": ["kick scooter", "ride"],
  "🚨": ["police car light", "alarm", "emergency", "warning", "siren"],
  "✈️": ["airplane", "flight", "plane", "travel", "vacation"],
  "🛫": ["airplane departure", "takeoff", "flight"],
  "🛬": ["airplane arrival", "landing", "flight"],
  "🚀": ["rocket", "ship", "fast", "launch", "moon", "space"],
  "🛸": ["flying saucer", "ufo", "alien"],
  "🚁": ["helicopter", "flight", "chopper"],
  "⛵": ["sailboat", "boat", "yacht", "sea"],
  "🚤": ["speedboat", "boat", "lake"],
  "🚢": ["ship", "cruise", "boat", "ocean"],
  "⚓": ["anchor", "ship", "sailor"],
  "⛽": ["fuel pump", "gas", "petrol"],
  "🗺️": ["world map", "travel", "geography"],
  "🗿": ["moai", "easter island", "stone", "statue"],
  "🗽": ["statue of liberty", "new york", "usa"],
  "🗼": ["tokyo tower", "japan", "landmark"],
  "🏰": ["castle", "disney", "royal", "fairytale"],
  "🏖️": ["beach with umbrella", "sand", "ocean", "vacation", "summer"],
  "🏝️": ["desert island", "tropical", "palm"],
  "🌋": ["volcano", "lava", "eruption"],
  "⛰️": ["mountain", "hiking", "nature"],
  "🏔️": ["snow-capped mountain", "winter", "alps"],
  "🏕️": ["camping", "tent", "outdoors"],
  "🏠": ["house", "home", "building"],
  "🏢": ["office building", "work", "corporate"],
  "💡": ["light bulb", "idea", "bright", "smart", "innovation"],
  "🔦": ["flashlight", "torch", "light"],
  "🕯️": ["candle", "light", "flame"],
  "📱": ["mobile phone", "iphone", "smartphone", "screen"],
  "💻": ["laptop", "computer", "code", "dev", "tech", "macbook"],
  "⌨️": ["keyboard", "typing", "computer"],
  "🖥️": ["desktop computer", "monitor", "pc"],
  "🖨️": ["printer", "print", "paper"],
  "🖱️": ["computer mouse", "click"],
  "📷": ["camera", "photo", "picture"],
  "📸": ["camera with flash", "photo", "paparazzi"],
  "📹": ["video camera", "record", "movie"],
  "🔍": ["magnifying glass", "search", "find", "zoom"],
  "🔎": ["magnifying glass right", "search", "lookup"],
  "🔬": ["microscope", "science", "lab", "biology"],
  "🔭": ["telescope", "space", "stars", "astronomy"],
  "📡": ["satellite antenna", "signal", "dish"],
  "⏰": ["alarm clock", "wake up", "time", "morning"],
  "⏱️": ["stopwatch", "timer", "fast", "speed"],
  "⏲️": ["timer clock", "kitchen", "countdown"],
  "⏳": ["hourglass not done", "time", "sand", "waiting"],
  "⌛": ["hourglass done", "time is up", "finished"],
  "📦": ["package", "box", "delivery", "amazon", "shipping"],
  "📫": ["closed mailbox", "mail", "post"],
  "📬": ["open mailbox with flag", "mail", "letter"],
  "💌": ["love letter", "heart", "envelope", "romance"],
  "📧": ["e-mail", "email", "electronic mail"],
  "📝": ["memo", "note", "pencil", "write", "paper"],
  "📁": ["file folder", "directory", "files"],
  "📂": ["open file folder", "documents"],
  "📅": ["calendar", "date", "schedule"],
  "📆": ["tear-off calendar", "day", "date"],
  "📊": ["bar chart", "analytics", "growth", "stats"],
  "📈": ["chart increasing", "stonks", "profit", "up"],
  "📉": ["chart decreasing", "loss", "down"],
  "📌": ["pushpin", "pin", "pinned", "location"],
  "📍": ["round pushpin", "location", "map", "gps"],
  "📎": ["paperclip", "attachment", "office"],
  "📏": ["straight ruler", "measure", "length"],
  "📐": ["triangular ruler", "math", "geometry"],
  "✂️": ["scissors", "cut", "snip"],
  "🔒": ["locked", "security", "padlock", "safe"],
  "🔓": ["unlocked", "open", "insecure"],
  "🔑": ["key", "lock", "password", "access"],
  "🗝️": ["old key", "antique", "secret"],
  "🔨": ["hammer", "tool", "build", "fix"],
  "🪓": ["axe", "wood", "chop"],
  "🔧": ["wrench", "tool", "settings", "repair"],
  "🪛": ["screwdriver", "tool", "fix"],
  "🔩": ["nut and bolt", "hardware", "fix"],
  "⚙️": ["gear", "settings", "options", "cog", "mechanical"],
  "🧰": ["toolbox", "tools", "kit"],
  "🧲": ["magnet", "attract", "physics"],
  "🪜": ["ladder", "climb", "step"],
  "🧪": ["test tube", "chemistry", "science", "experiment"],
  "🧫": ["petri dish", "lab", "biology"],
  "🧬": ["dna", "genetics", "biology", "science"],
  "🩺": ["stethoscope", "doctor", "medical", "health"],
  "🩹": ["adhesive bandage", "bandaid", "heal", "wound"],
  "💊": ["pill", "medicine", "drugs", "health"],
  "💉": ["syringe", "shot", "vaccine", "doctor"],
  "❤️": ["red heart", "love", "like", "favorite"],
  "🧡": ["orange heart", "love", "friendship"],
  "💛": ["yellow heart", "love", "happiness"],
  "💚": ["green heart", "love", "nature"],
  "💙": ["blue heart", "love", "trust"],
  "💜": ["purple heart", "love", "bts"],
  "🖤": ["black heart", "dark", "love"],
  "🤍": ["white heart", "pure", "peace"],
  "🤎": ["brown heart", "love"],
  "💔": ["broken heart", "heartbreak", "sad", "breakup"],
  "❤️‍🔥": ["heart on fire", "passion", "love", "hot"],
  "❤️‍🩹": ["mending heart", "healing", "recovery"],
  "❣️": ["heart exclamation", "love", "punctuation"],
  "💕": ["two hearts", "love", "pink"],
  "💞": ["revolving hearts", "love", "crush"],
  "💓": ["beating heart", "love", "heartbeat"],
  "💗": ["growing heart", "excited", "love"],
  "💖": ["sparkling heart", "shiny", "love"],
  "💘": ["heart with arrow", "cupid", "love"],
  "💝": ["heart with ribbon", "gift", "valentine"],
  "💟": ["heart decoration", "purple"],
  "🔥": ["fire", "hot", "lit", "flame", "trend"],
  "✨": ["sparkles", "magic", "clean", "star", "glow", "special"],
  "🌟": ["glowing star", "shine", "sparkle"],
  "⭐": ["star", "rating", "favorite", "yellow"],
  "🎉": ["party popper", "tada", "celebration", "congrats"],
  "🎊": ["confetti ball", "party", "celebrate"],
  "💯": ["100", "score", "perfect", "hundred"],
  "⚡": ["lightning", "zap", "electric", "fast", "power"],
  "💥": ["collision", "boom", "explosion", "bang"],
  "💫": ["dizzy", "star", "sparkle"],
  "💬": ["speech balloon", "comment", "message", "chat"],
  "💭": ["thought balloon", "thinking", "dream"],
  "🗯️": ["anger bubble", "shout", "mad"],
  "💤": ["zzz", "sleeping", "tired", "rest"],
  "🔔": ["bell", "notification", "ring", "alert"],
  "🔕": ["bell with slash", "mute", "silent", "notifications off"],
  "🎵": ["musical note", "song", "music"],
  "🎶": ["musical notes", "melody", "sound"],
  "⚠️": ["warning", "caution", "danger", "alert"],
  "⛔": ["no entry", "stop", "restricted"],
  "🚫": ["prohibited", "banned", "no"],
  "✅": ["check mark button", "done", "correct", "verified", "yes"],
  "❌": ["cross mark", "wrong", "no", "cancel", "error"],
  "❓": ["question mark", "help", "what", "confused"],
  "❗": ["exclamation mark", "alert", "important", "danger"],
  "‼️": ["double exclamation", "urgent", "attention"],
};

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("recent");
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("signalpulse_recent_emojis");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_RECENTS;
  });
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Handle emoji selection + save to recents
  const handleSelect = useCallback(
    (emoji: string) => {
      try {
        const updated = [emoji, ...recentEmojis.filter((e) => e !== emoji)].slice(0, 16);
        setRecentEmojis(updated);
        localStorage.setItem("signalpulse_recent_emojis", JSON.stringify(updated));
      } catch {}
      onSelect(emoji);
    },
    [onSelect, recentEmojis]
  );

  // Filter emojis based on search query
  const filteredEmojis = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;

    const results: string[] = [];
    for (const [emoji, keywords] of Object.entries(EMOJI_KEYWORDS)) {
      if (keywords.some((k) => k.includes(q)) || emoji.includes(q)) {
        results.push(emoji);
      }
    }

    // Also match category name
    if (results.length === 0) {
      for (const cat of EMOJI_CATEGORIES) {
        if (cat.name.toLowerCase().includes(q)) {
          for (const emoji of cat.emojis) {
            if (!results.includes(emoji)) {
              results.push(emoji);
            }
          }
        }
      }
    }

    return results;
  }, [search]);

  // Jump to category
  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    const targetEl = categoryRefs.current[catId];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <PickerSurface
      title="Emoji"
      onClose={onClose}
      className="-left-20 sm:-left-16 md:left-0 w-[320px] sm:w-[336px] max-w-[calc(100vw-24px)]"
    >
      <PickerSearch
        value={search}
        onChange={setSearch}
        onClear={() => setSearch("")}
        placeholder="Search emoji..."
      />

      {/* Icon-based category navigation */}
      {!search && (
        <PickerTabs className="justify-between border-b border-border px-2.5 py-1">
          {recentEmojis.length > 0 && (
            <PickerTab
              active={activeCategory === "recent"}
              onClick={() => scrollToCategory("recent")}
              title="Recently Used"
              className="size-7 justify-center px-0 text-[13px]"
            >
              <span>✨</span>
            </PickerTab>
          )}

          {EMOJI_CATEGORIES.map((cat) => (
            <PickerTab
              key={cat.id}
              active={activeCategory === cat.id}
              onClick={() => scrollToCategory(cat.id)}
              title={cat.name}
              className="size-7 justify-center px-0 text-[13px]"
            >
              <span>{cat.icon}</span>
            </PickerTab>
          ))}
        </PickerTabs>
      )}

      {/* 8-column emoji grid */}
      <PickerContent className="px-2.5 py-1">
        {filteredEmojis !== null ? (
          filteredEmojis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center text-xs text-muted-foreground">
              <span>No emoji found for &ldquo;{search}&rdquo;</span>
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-0.5 py-1">
              {filteredEmojis.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => handleSelect(emoji)}
                  className="flex size-[34px] cursor-pointer items-center justify-center rounded-[8px] text-[18px] transition-all duration-150 select-none hover:scale-110 hover:bg-accent active:scale-95"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-2 pb-2">
            {/* Recently Used Section */}
            {recentEmojis.length > 0 && (
              <div
                ref={(el) => {
                  categoryRefs.current["recent"] = el;
                }}
              >
                <div className="sticky top-0 z-10 bg-card/95 px-1 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase backdrop-blur-xs">
                  Recent
                </div>
                <div className="grid grid-cols-8 gap-0.5">
                  {recentEmojis.map((emoji) => (
                    <button
                      type="button"
                      key={`recent-${emoji}`}
                      onClick={() => handleSelect(emoji)}
                      className="flex size-[34px] cursor-pointer items-center justify-center rounded-[8px] text-[18px] transition-all duration-150 select-none hover:scale-110 hover:bg-accent active:scale-95"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Main Category Sections */}
            {EMOJI_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                ref={(el) => {
                  categoryRefs.current[cat.id] = el;
                }}
              >
                <div className="sticky top-0 z-10 bg-card/95 px-1 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase backdrop-blur-xs">
                  {cat.name}
                </div>
                <div className="grid grid-cols-8 gap-0.5">
                  {cat.emojis.map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => handleSelect(emoji)}
                      className="flex size-[34px] cursor-pointer items-center justify-center rounded-[8px] text-[18px] transition-all duration-150 select-none hover:scale-110 hover:bg-accent active:scale-95"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </PickerContent>
    </PickerSurface>
  );
}
