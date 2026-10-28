import { moreQuestions } from "./more-questions"

export type Topic = "history" | "science" | "geography" | "culture"
export type PathId = "general" | "history" | "science"

export type Question = {
  id: string
  topic: Topic
  label: string
  text: string
  options: [string, string, string, string]
  correctIndex: number
  explanation: string
}

export const PATHS: { id: PathId; title: string; blurb: string }[] = [
  {
    id: "general",
    title: "General knowledge",
    blurb: "A mix of history, science, places, and culture.",
  },
  {
    id: "history",
    title: "History",
    blurb: "People, places, and turning points.",
  },
  {
    id: "science",
    title: "Science",
    blurb: "How the world works, in plain language.",
  },
]

export const LEVEL_COUNT = 8
export const QUESTIONS_PER_LEVEL = 10
export const DAILY_COUNT = 5
export const MISTAKE_LIMIT = 3
export const QUESTION_SECONDS = 20
export const XP_BAND = 500

const baseQuestions: Question[] = [
  {
    id: "h1",
    topic: "history",
    label: "History · Africa",
    text: "In which city is the University of al-Qarawiyyin, founded in 859?",
    options: ["Cairo", "Timbuktu", "Fez", "Tunis"],
    correctIndex: 2,
    explanation:
      "Fatima al-Fihri founded the university in Fez, in present-day Morocco. It is often cited as the world's oldest existing university.",
  },
  {
    id: "h2",
    topic: "history",
    label: "History · Africa",
    text: "The stone city of Great Zimbabwe was built in which present-day country?",
    options: ["Ghana", "Zimbabwe", "Ethiopia", "Mali"],
    correctIndex: 1,
    explanation:
      "Great Zimbabwe was a medieval Shona city. Its stone walls still stand in the country that took its name.",
  },
  {
    id: "h3",
    topic: "history",
    label: "History · Africa",
    text: "Mansa Musa ruled which West African empire in the 14th century?",
    options: ["Mali", "Songhai", "Ashanti", "Benin"],
    correctIndex: 0,
    explanation:
      "Mansa Musa was mansa of the Mali Empire. His 1324 pilgrimage made Mali's wealth famous across North Africa and beyond.",
  },
  {
    id: "h4",
    topic: "history",
    label: "History · Nigeria",
    text: "In which year did Nigeria become independent from Britain?",
    options: ["1957", "1960", "1963", "1970"],
    correctIndex: 1,
    explanation:
      "Nigeria gained independence on 1 October 1960. It became a republic in 1963.",
  },
  {
    id: "h5",
    topic: "history",
    label: "History · Africa",
    text: "The Benin Bronzes were made for the royal court of a kingdom in which present-day country?",
    options: ["Nigeria", "Benin", "Cameroon", "Ghana"],
    correctIndex: 0,
    explanation:
      "The Kingdom of Benin was in what is now southern Nigeria, not the modern Republic of Benin. Its brass plaques and sculptures are world famous.",
  },
  {
    id: "h6",
    topic: "history",
    label: "History · World",
    text: "The Berlin Conference, which divided much of Africa among European powers, began in which year?",
    options: ["1789", "1884", "1914", "1945"],
    correctIndex: 1,
    explanation:
      "The conference met in Berlin from 1884 to 1885. African rulers were not invited to the talks that redrew the map.",
  },
  {
    id: "h7",
    topic: "history",
    label: "History · World",
    text: "Magna Carta was sealed by King John of England in which year?",
    options: ["1066", "1215", "1492", "1688"],
    correctIndex: 1,
    explanation:
      "Magna Carta was sealed in 1215 at Runnymede. Later generations treated it as a limit on royal power.",
  },
  {
    id: "h8",
    topic: "history",
    label: "History · World",
    text: "Constantinople fell to the Ottoman Empire in which year?",
    options: ["1204", "1453", "1517", "1683"],
    correctIndex: 1,
    explanation:
      "Sultan Mehmed II took the city in 1453. It later became known as Istanbul.",
  },
  {
    id: "h9",
    topic: "history",
    label: "History · Americas",
    text: "Haiti declared independence and became the first Black republic in which year?",
    options: ["1791", "1804", "1848", "1865"],
    correctIndex: 1,
    explanation:
      "After the Haitian Revolution, independence was declared on 1 January 1804. The uprising against slavery began in 1791.",
  },
  {
    id: "h10",
    topic: "history",
    label: "History · Asia",
    text: "British India was partitioned into India and Pakistan in which year?",
    options: ["1935", "1942", "1947", "1950"],
    correctIndex: 2,
    explanation:
      "Partition took effect in August 1947. India became a republic in 1950.",
  },
  {
    id: "h11",
    topic: "history",
    label: "History · Africa",
    text: "Nelson Mandela was released from prison in which year?",
    options: ["1976", "1986", "1990", "1994"],
    correctIndex: 2,
    explanation:
      "Mandela walked free on 11 February 1990. He was elected president of South Africa in 1994.",
  },
  {
    id: "h12",
    topic: "history",
    label: "History · Africa",
    text: "Timbuktu became famous as a centre of scholarship in which present-day country?",
    options: ["Morocco", "Mali", "Sudan", "Senegal"],
    correctIndex: 1,
    explanation:
      "Timbuktu, in present-day Mali, was a major centre of trade and learning in the Mali and Songhai empires.",
  },
  {
    id: "s1",
    topic: "science",
    label: "Science · Life",
    text: "Which gas do plants release during photosynthesis?",
    options: ["Nitrogen", "Carbon dioxide", "Oxygen", "Hydrogen"],
    correctIndex: 2,
    explanation:
      "Plants take in carbon dioxide and water, and release oxygen as they make sugars using light.",
  },
  {
    id: "s2",
    topic: "science",
    label: "Science · Physics",
    text: "About how fast does light travel in a vacuum?",
    options: [
      "300 kilometres per second",
      "300,000 kilometres per second",
      "300,000 kilometres per hour",
      "3,000 kilometres per second",
    ],
    correctIndex: 1,
    explanation:
      "Light in a vacuum travels at about 299,792 kilometres per second, usually rounded to 300,000.",
  },
  {
    id: "s3",
    topic: "science",
    label: "Science · Matter",
    text: "At standard sea-level pressure, pure water boils at which temperature?",
    options: ["90°C", "100°C", "110°C", "212°C"],
    correctIndex: 1,
    explanation:
      "At standard atmospheric pressure, water boils at 100°C. 212 is the Fahrenheit figure, not Celsius.",
  },
  {
    id: "s4",
    topic: "science",
    label: "Science · Life",
    text: "In DNA, adenine pairs with which base?",
    options: ["Cytosine", "Guanine", "Thymine", "Uracil"],
    correctIndex: 2,
    explanation:
      "Adenine pairs with thymine, and cytosine pairs with guanine. Uracil replaces thymine in RNA.",
  },
  {
    id: "s5",
    topic: "science",
    label: "Science · Space",
    text: "Which planet is closest to the Sun?",
    options: ["Venus", "Mars", "Mercury", "Earth"],
    correctIndex: 2,
    explanation:
      "Mercury is the innermost planet. Venus is next, then Earth.",
  },
  {
    id: "s6",
    topic: "science",
    label: "Science · Body",
    text: "About how many bones are in a typical adult human skeleton?",
    options: ["106", "206", "306", "256"],
    correctIndex: 1,
    explanation:
      "Adults usually have 206 bones. Babies start with more, because some later fuse.",
  },
  {
    id: "s7",
    topic: "science",
    label: "Science · Body",
    text: "Which organ produces most of the body's insulin?",
    options: ["Liver", "Pancreas", "Kidney", "Thyroid"],
    correctIndex: 1,
    explanation:
      "The pancreas releases insulin, which helps the body move sugar from the blood into cells.",
  },
  {
    id: "s8",
    topic: "science",
    label: "Science · Medicine",
    text: "Alexander Fleming is credited with discovering which medicine in 1928?",
    options: ["Aspirin", "Penicillin", "Insulin", "Quinine"],
    correctIndex: 1,
    explanation:
      "Fleming noticed that a mould, Penicillium, stopped bacteria growing. That observation led to penicillin.",
  },
  {
    id: "s9",
    topic: "science",
    label: "Science · Earth",
    text: "The distance around Earth at the equator is closest to which figure?",
    options: ["4,000 km", "12,700 km", "40,000 km", "400,000 km"],
    correctIndex: 2,
    explanation:
      "Earth's equatorial circumference is about 40,075 kilometres. 12,742 km is closer to the diameter.",
  },
  {
    id: "s10",
    topic: "science",
    label: "Science · Physics",
    text: "Why can sound not travel through outer space?",
    options: [
      "Space is too cold",
      "There is no air or other medium to carry it",
      "Gravity cancels the waves",
      "Light moves too fast for sound to keep up",
    ],
    correctIndex: 1,
    explanation:
      "Sound is a vibration in a material. Space is a near-vacuum, so there is almost nothing for the wave to move through.",
  },
  {
    id: "s11",
    topic: "science",
    label: "Science · Space",
    text: "Which is the largest planet in the Solar System?",
    options: ["Saturn", "Neptune", "Jupiter", "Uranus"],
    correctIndex: 2,
    explanation:
      "Jupiter is the largest planet. Saturn is next, famous for its rings.",
  },
  {
    id: "s12",
    topic: "science",
    label: "Science · Body",
    text: "A long-term lack of vitamin C can cause which illness?",
    options: ["Scurvy", "Rickets", "Malaria", "Anaemia from iron alone"],
    correctIndex: 0,
    explanation:
      "Scurvy comes from too little vitamin C. Rickets is linked to vitamin D, and malaria is an infection.",
  },
  {
    id: "g1",
    topic: "geography",
    label: "Geography · Americas",
    text: "What is the capital city of Canada?",
    options: ["Toronto", "Vancouver", "Ottawa", "Montreal"],
    correctIndex: 2,
    explanation:
      "Ottawa is the capital. Toronto and Montreal are larger cities, but neither is the capital.",
  },
  {
    id: "g2",
    topic: "geography",
    label: "Geography · Africa",
    text: "Mount Kilimanjaro stands in which country?",
    options: ["Kenya", "Tanzania", "Uganda", "Ethiopia"],
    correctIndex: 1,
    explanation:
      "Kilimanjaro is in northern Tanzania, near the Kenyan border. It is Africa's highest mountain.",
  },
  {
    id: "g3",
    topic: "geography",
    label: "Geography · Asia",
    text: "What is the capital of Japan?",
    options: ["Kyoto", "Osaka", "Tokyo", "Seoul"],
    correctIndex: 2,
    explanation:
      "Tokyo is the capital. Kyoto was an imperial capital for centuries before that.",
  },
  {
    id: "g4",
    topic: "geography",
    label: "Geography · Earth",
    text: "Which is the world's largest hot desert?",
    options: ["Gobi", "Kalahari", "Sahara", "Arabian"],
    correctIndex: 2,
    explanation:
      "The Sahara is the largest hot desert. Antarctica is a larger desert overall, but it is cold.",
  },
  {
    id: "g5",
    topic: "geography",
    label: "Geography · Americas",
    text: "Most of the Amazon rainforest is in which country?",
    options: ["Brazil", "Peru", "Colombia", "Ecuador"],
    correctIndex: 0,
    explanation:
      "The forest spreads across several countries, and the largest share is in Brazil.",
  },
  {
    id: "g6",
    topic: "geography",
    label: "Geography · Europe",
    text: "The United Kingdom is made up of Great Britain and which other country?",
    options: ["The Republic of Ireland", "Northern Ireland", "Iceland", "Wales only"],
    correctIndex: 1,
    explanation:
      "Great Britain is England, Scotland, and Wales. The United Kingdom adds Northern Ireland.",
  },
  {
    id: "g7",
    topic: "geography",
    label: "Geography · Africa",
    text: "Which city is the capital of Nigeria?",
    options: ["Lagos", "Abuja", "Kano", "Ibadan"],
    correctIndex: 1,
    explanation:
      "Abuja has been the capital since 1991. Lagos is the largest city and the former capital.",
  },
  {
    id: "g8",
    topic: "geography",
    label: "Geography · Africa",
    text: "Lake Victoria touches Uganda, Kenya, and which other country?",
    options: ["Tanzania", "Rwanda", "Ethiopia", "South Sudan"],
    correctIndex: 0,
    explanation:
      "Lake Victoria is shared by Tanzania, Uganda, and Kenya. It is Africa's largest lake by area.",
  },
  {
    id: "c1",
    topic: "culture",
    label: "Culture · Literature",
    text: "Who wrote the novel Things Fall Apart?",
    options: ["Wole Soyinka", "Chimamanda Ngozi Adichie", "Chinua Achebe", "Ben Okri"],
    correctIndex: 2,
    explanation:
      "Chinua Achebe published Things Fall Apart in 1958. It follows Okonkwo and the arrival of colonial rule.",
  },
  {
    id: "c2",
    topic: "culture",
    label: "Culture · Sport",
    text: "Which country won the first FIFA World Cup in 1930?",
    options: ["Brazil", "Italy", "Uruguay", "Argentina"],
    correctIndex: 2,
    explanation:
      "Uruguay hosted and won the 1930 tournament, beating Argentina in the final.",
  },
  {
    id: "c3",
    topic: "culture",
    label: "Culture · Sport",
    text: "How many interlocking rings are on the Olympic flag?",
    options: ["4", "5", "6", "7"],
    correctIndex: 1,
    explanation:
      "Five rings stand for the inhabited continents as the Olympic movement grouped them.",
  },
  {
    id: "c4",
    topic: "culture",
    label: "Culture · Film",
    text: "Nollywood refers to the film industry of which country?",
    options: ["Nigeria", "Ghana", "Kenya", "South Africa"],
    correctIndex: 0,
    explanation:
      "Nollywood is the popular name for Nigeria's film industry, one of the most prolific in the world.",
  },
  {
    id: "c5",
    topic: "culture",
    label: "Culture · Literature",
    text: "Which writer created the play Hamlet?",
    options: ["Christopher Marlowe", "William Shakespeare", "Jane Austen", "Oscar Wilde"],
    correctIndex: 1,
    explanation:
      "Shakespeare's Hamlet was written around 1600. The prince of Denmark is its central character.",
  },
]

// Every question in the game. New ones go in more-questions.ts.
export const questions: Question[] = [...baseQuestions, ...moreQuestions]

export function hashString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function seededShuffle<T>(items: T[], seed: string) {
  const copy = [...items]
  let state = hashString(seed) || 1
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    const current = copy[index]
    copy[index] = copy[swap]
    copy[swap] = current
  }
  return copy
}

export function poolFor(path: PathId) {
  if (path === "history") {
    return questions.filter((question) => question.topic === "history")
  }
  if (path === "science") {
    return questions.filter((question) => question.topic === "science")
  }
  return questions
}

export function pickQuestions(path: PathId, seed: string, count: number) {
  const pool = poolFor(path)
  const shuffled = seededShuffle(pool, seed)
  if (shuffled.length >= count) {
    return shuffled.slice(0, count)
  }
  const extra = seededShuffle(questions, `${seed}:extra`).filter(
    (question) => !shuffled.some((picked) => picked.id === question.id)
  )
  return [...shuffled, ...extra].slice(0, count)
}

// The questions for one level. Each path is put in one fixed order, and level 1
// takes the first ten, level 2 the next ten, and so on, so two levels never
// share a question until the pool runs out and the order wraps around.
// Replaying a finished level moves on by one full set of levels, so a replay
// brings fresh questions too. The seed only changes the order inside the round.
export function levelQuestions(path: PathId, level: number, replay: boolean, seed: string) {
  const pool = poolFor(path)
  if (pool.length < QUESTIONS_PER_LEVEL) return pickQuestions(path, seed, QUESTIONS_PER_LEVEL)
  const order = seededShuffle(pool, `facts-finder|${path}|order`)
  const sets = level - 1 + (replay ? LEVEL_COUNT : 0)
  const start = (sets * QUESTIONS_PER_LEVEL) % order.length
  const picked = Array.from(
    { length: QUESTIONS_PER_LEVEL },
    (_, step) => order[(start + step) % order.length]
  )
  return seededShuffle(picked, seed)
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function yesterdayKey(date = new Date()) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() - 1)
  return todayKey(copy)
}
