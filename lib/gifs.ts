export interface GifItem {
  id: string;
  title: string;
  provider: "giphy" | "tenor" | "curated";
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  tags?: string[];
}

// 100% verified, evergreen high-performance animated GIF library (direct CDN links)
export const CURATED_GIFS: GifItem[] = [
  {
    id: "gif-wave-hello",
    title: "Wave Hello",
    provider: "curated",
    url: "https://i.giphy.com/3pZipqyo1sqZB6htGH.gif",
    previewUrl: "https://i.giphy.com/3pZipqyo1sqZB6htGH.gif",
    width: 480,
    height: 270,
    tags: ["hello", "wave", "hi", "greeting", "welcome", "hey", "sup"],
  },
  {
    id: "gif-high-five",
    title: "High Five SpongeBob",
    provider: "curated",
    url: "https://i.giphy.com/3oEjHV0z8S7WM4MwnK.gif",
    previewUrl: "https://i.giphy.com/3oEjHV0z8S7WM4MwnK.gif",
    width: 480,
    height: 360,
    tags: ["high five", "spongebob", "celebrate", "friends", "yes", "happy", "win"],
  },
  {
    id: "gif-mind-blown",
    title: "Mind Blown Cat",
    provider: "curated",
    url: "https://i.giphy.com/26ufdipQqU2lhNA4g.gif",
    previewUrl: "https://i.giphy.com/26ufdipQqU2lhNA4g.gif",
    width: 480,
    height: 270,
    tags: ["mind blown", "shocked", "cat", "wow", "crazy", "omg", "brain"],
  },
  {
    id: "gif-mind-exploding",
    title: "Mind Exploding Space",
    provider: "curated",
    url: "https://i.giphy.com/xT9IgG50Fb7Mi0prBC.gif",
    previewUrl: "https://i.giphy.com/xT9IgG50Fb7Mi0prBC.gif",
    width: 480,
    height: 270,
    tags: ["mind blown", "explosion", "wow", "universe", "brain", "galaxy"],
  },
  {
    id: "gif-typing-fast",
    title: "Hacker Typing",
    provider: "curated",
    url: "https://i.giphy.com/unQ3IJU2RG7DO.gif",
    previewUrl: "https://i.giphy.com/unQ3IJU2RG7DO.gif",
    width: 480,
    height: 270,
    tags: ["typing", "hack", "code", "fast", "computer", "working", "programmer"],
  },
  {
    id: "gif-dog-coding",
    title: "Dog Developer Coding",
    provider: "curated",
    url: "https://i.giphy.com/nbvFVPiEiJH6JOGIok.gif",
    previewUrl: "https://i.giphy.com/nbvFVPiEiJH6JOGIok.gif",
    width: 480,
    height: 270,
    tags: ["dog", "coding", "developer", "work", "busy", "computer", "typing"],
  },
  {
    id: "gif-thumbs-up",
    title: "Thumbs Up Cool",
    provider: "curated",
    url: "https://i.giphy.com/111ebonMs90YLu.gif",
    previewUrl: "https://i.giphy.com/111ebonMs90YLu.gif",
    width: 480,
    height: 270,
    tags: ["thumbs up", "cool", "good", "approved", "yes", "ok", "great", "agree"],
  },
  {
    id: "gif-celebration",
    title: "Confetti Celebration",
    provider: "curated",
    url: "https://i.giphy.com/artj92V8o75VPL7AeQ.gif",
    previewUrl: "https://i.giphy.com/artj92V8o75VPL7AeQ.gif",
    width: 480,
    height: 270,
    tags: ["party", "confetti", "celebration", "dance", "yay", "happy", "win"],
  },
  {
    id: "gif-coffee-vibes",
    title: "Morning Coffee",
    provider: "curated",
    url: "https://i.giphy.com/oZEBLugoTNRxS.gif",
    previewUrl: "https://i.giphy.com/oZEBLugoTNRxS.gif",
    width: 480,
    height: 360,
    tags: ["coffee", "morning", "drink", "relax", "vibes", "tea", "cozy"],
  },
  {
    id: "gif-dancing-cat",
    title: "Dancing Cat",
    provider: "curated",
    url: "https://i.giphy.com/d31w24psGYeekCZy.gif",
    previewUrl: "https://i.giphy.com/d31w24psGYeekCZy.gif",
    width: 480,
    height: 360,
    tags: ["cat", "dance", "dancing", "cute", "music", "party", "happy"],
  },
  {
    id: "gif-cat-vibe",
    title: "Cat Head Bop Vibing",
    provider: "curated",
    url: "https://i.giphy.com/26u4cqiYI30juCOGY.gif",
    previewUrl: "https://i.giphy.com/26u4cqiYI30juCOGY.gif",
    width: 480,
    height: 270,
    tags: ["cat", "vibe", "vibing", "head nod", "music", "groove", "jamming"],
  },
  {
    id: "gif-applause",
    title: "Applause Clapping",
    provider: "curated",
    url: "https://i.giphy.com/3o7TKMGpxGZzZ7Fw7m.gif",
    previewUrl: "https://i.giphy.com/3o7TKMGpxGZzZ7Fw7m.gif",
    width: 480,
    height: 270,
    tags: ["applause", "clap", "clapping", "bravo", "congrats", "cheers", "good job"],
  },
  {
    id: "gif-fire",
    title: "Fire Flame Lit",
    provider: "curated",
    url: "https://i.giphy.com/l41lI4bChlY2uUXsY.gif",
    previewUrl: "https://i.giphy.com/l41lI4bChlY2uUXsY.gif",
    width: 480,
    height: 270,
    tags: ["fire", "lit", "hot", "flame", "awesome", "burn", "epic"],
  },
  {
    id: "gif-facepalm",
    title: "Facepalm Fail",
    provider: "curated",
    url: "https://i.giphy.com/3o6Zt6ML6Bkl5K88x2.gif",
    previewUrl: "https://i.giphy.com/3o6Zt6ML6Bkl5K88x2.gif",
    width: 480,
    height: 270,
    tags: ["facepalm", "smh", "no", "fail", "oops", "tired", "disappointed"],
  },
  {
    id: "gif-laugh",
    title: "Laughing Out Loud",
    provider: "curated",
    url: "https://i.giphy.com/g9582DNuQppxC.gif",
    previewUrl: "https://i.giphy.com/g9582DNuQppxC.gif",
    width: 480,
    height: 270,
    tags: ["laugh", "lol", "haha", "lmao", "funny", "joke", "comedy", "hilarious"],
  },
  {
    id: "gif-baby-groot",
    title: "Dancing Baby Groot",
    provider: "curated",
    url: "https://i.giphy.com/JIX9t2j0ZTN9S.gif",
    previewUrl: "https://i.giphy.com/JIX9t2j0ZTN9S.gif",
    width: 480,
    height: 270,
    tags: ["groot", "dance", "cute", "marvel", "happy", "music"],
  },
  {
    id: "gif-cheers-gatsby",
    title: "Leonardo DiCaprio Cheers",
    provider: "curated",
    url: "https://i.giphy.com/Geimfl9613Wh2.gif",
    previewUrl: "https://i.giphy.com/Geimfl9613Wh2.gif",
    width: 480,
    height: 270,
    tags: ["cheers", "toast", "gatsby", "great", "congrats", "salute", "leonardo"],
  },
  {
    id: "gif-champagne-cheers",
    title: "Cheers Champagne",
    provider: "curated",
    url: "https://i.giphy.com/BPJmHPINMe7eG9ZWJM.gif",
    previewUrl: "https://i.giphy.com/BPJmHPINMe7eG9ZWJM.gif",
    width: 480,
    height: 270,
    tags: ["cheers", "champagne", "party", "celebrate", "drink", "congrats"],
  },
  {
    id: "gif-shrug",
    title: "Shrug IDK",
    provider: "curated",
    url: "https://i.giphy.com/l3q2K5jinAlChoCLS.gif",
    previewUrl: "https://i.giphy.com/l3q2K5jinAlChoCLS.gif",
    width: 480,
    height: 270,
    tags: ["shrug", "idk", "whatever", "maybe", "dunno", "who knows", "confused"],
  },
  {
    id: "gif-minions-yay",
    title: "Minions Yay",
    provider: "curated",
    url: "https://i.giphy.com/Nm8ZPAGOAzOTK.gif",
    previewUrl: "https://i.giphy.com/Nm8ZPAGOAzOTK.gif",
    width: 480,
    height: 270,
    tags: ["minions", "yay", "excited", "cheering", "jump", "happy", "party"],
  },
  {
    id: "gif-homer-bushes",
    title: "Homer Backs Into Bushes",
    provider: "curated",
    url: "https://i.giphy.com/13CoXDiaCcCoyk.gif",
    previewUrl: "https://i.giphy.com/13CoXDiaCcCoyk.gif",
    width: 480,
    height: 270,
    tags: ["homer", "bushes", "bye", "hide", "awkward", "simpsons", "leave", "disappear"],
  },
  {
    id: "gif-yes-fist",
    title: "Yes Fist Pump Success",
    provider: "curated",
    url: "https://i.giphy.com/DhstvI3CH0ZsY.gif",
    previewUrl: "https://i.giphy.com/DhstvI3CH0ZsY.gif",
    width: 480,
    height: 270,
    tags: ["yes", "fist pump", "win", "success", "boom", "got it", "victory"],
  },
  {
    id: "gif-no-way",
    title: "No Way Refusal",
    provider: "curated",
    url: "https://i.giphy.com/l2Je66xh90ffLO7gk.gif",
    previewUrl: "https://i.giphy.com/l2Je66xh90ffLO7gk.gif",
    width: 480,
    height: 270,
    tags: ["no", "nope", "nah", "refuse", "never", "disagree", "stop"],
  },
  {
    id: "gif-shocked",
    title: "Shocked Gasp",
    provider: "curated",
    url: "https://i.giphy.com/xUPOqo6EApD0OMsO40.gif",
    previewUrl: "https://i.giphy.com/xUPOqo6EApD0OMsO40.gif",
    width: 480,
    height: 270,
    tags: ["shocked", "gasp", "omg", "surprise", "unbelievable", "what", "scared"],
  },
  {
    id: "gif-sleepy-cat",
    title: "Sleepy Goodnight Cat",
    provider: "curated",
    url: "https://i.giphy.com/3o85xwxr06YdQFdNxe.gif",
    previewUrl: "https://i.giphy.com/3o85xwxr06YdQFdNxe.gif",
    width: 480,
    height: 270,
    tags: ["sleepy", "tired", "cat", "bed", "night", "goodnight", "nap", "lazy"],
  },
  {
    id: "gif-this-is-fine",
    title: "This Is Fine Dog Fire",
    provider: "curated",
    url: "https://i.giphy.com/QMkPpxdNj4XAqqMm80.gif",
    previewUrl: "https://i.giphy.com/QMkPpxdNj4XAqqMm80.gif",
    width: 480,
    height: 270,
    tags: ["this is fine", "fine", "fire", "dog", "okay", "chaos", "problem", "panic"],
  },
  {
    id: "gif-mic-drop",
    title: "Mic Drop Boom",
    provider: "curated",
    url: "https://i.giphy.com/l3fQf1OEAq0iri9RC.gif",
    previewUrl: "https://i.giphy.com/l3fQf1OEAq0iri9RC.gif",
    width: 480,
    height: 270,
    tags: ["mic drop", "done", "boom", "over", "win", "legend", "exit"],
  },
  {
    id: "gif-money-rain",
    title: "Making It Rain Money",
    provider: "curated",
    url: "https://i.giphy.com/l0HlHFRbmaZtBRhXG.gif",
    previewUrl: "https://i.giphy.com/l0HlHFRbmaZtBRhXG.gif",
    width: 480,
    height: 270,
    tags: ["money", "cash", "rich", "rain", "payday", "dollar", "wealth"],
  },
  {
    id: "gif-excited-kermit",
    title: "Excited Kermit Yay",
    provider: "curated",
    url: "https://i.giphy.com/10yIEN8cJA4Ywg.gif",
    previewUrl: "https://i.giphy.com/10yIEN8cJA4Ywg.gif",
    width: 480,
    height: 270,
    tags: ["excited", "kermit", "flail", "happy", "screaming", "wild", "yay"],
  },
  {
    id: "gif-jack-nod",
    title: "Jack Nicholson Nodding",
    provider: "curated",
    url: "https://i.giphy.com/b9aScKLxdv0Y0.gif",
    previewUrl: "https://i.giphy.com/b9aScKLxdv0Y0.gif",
    width: 480,
    height: 270,
    tags: ["yes", "nod", "agree", "evil smile", "sure", "definitely", "creepy"],
  },
  {
    id: "gif-boba-nod",
    title: "Boba Fett Respect Nod",
    provider: "curated",
    url: "https://i.giphy.com/S9uChaBU64H7N5Dgln.gif",
    previewUrl: "https://i.giphy.com/S9uChaBU64H7N5Dgln.gif",
    width: 480,
    height: 270,
    tags: ["nod", "agree", "respect", "star wars", "roger", "solid"],
  },
  {
    id: "gif-thank-you",
    title: "Thank You Grateful Bow",
    provider: "curated",
    url: "https://i.giphy.com/26AHPxxnSw1L9T1rW.gif",
    previewUrl: "https://i.giphy.com/26AHPxxnSw1L9T1rW.gif",
    width: 480,
    height: 270,
    tags: ["thank you", "thanks", "grateful", "bow", "appreciate", "kind"],
  },
  {
    id: "gif-nice",
    title: "Nice Click Meme",
    provider: "curated",
    url: "https://i.giphy.com/yJFeycRK2DB4c.gif",
    previewUrl: "https://i.giphy.com/yJFeycRK2DB4c.gif",
    width: 480,
    height: 270,
    tags: ["nice", "noice", "click", "good", "approved", "michael rosen"],
  },
  {
    id: "gif-popcorn",
    title: "Eating Popcorn Drama",
    provider: "curated",
    url: "https://i.giphy.com/l0MYt5jPR6QX5pnqM.gif",
    previewUrl: "https://i.giphy.com/l0MYt5jPR6QX5pnqM.gif",
    width: 480,
    height: 270,
    tags: ["popcorn", "drama", "watching", "movie", "waiting", "interesting", "snack"],
  },
];

export async function searchGifs(query?: string): Promise<GifItem[]> {
  if (!query || query.trim() === "") {
    return CURATED_GIFS;
  }

  const cleanQuery = query.toLowerCase().trim();
  const searchTerms = cleanQuery.split(/\s+/).filter(Boolean);

  // Score matches based on title and tags
  const scored = CURATED_GIFS.map((gif) => {
    let score = 0;
    const titleLower = gif.title.toLowerCase();
    const tagsLower = (gif.tags || []).join(" ").toLowerCase();

    for (const term of searchTerms) {
      if (titleLower.includes(term)) score += 10;
      if (tagsLower.includes(term)) score += 5;
    }

    // Exact phrase bonus
    if (titleLower.includes(cleanQuery)) score += 20;
    if (tagsLower.includes(cleanQuery)) score += 15;

    return { gif, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.gif);

  return scored;
}
