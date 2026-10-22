import { useNavigate } from "react-router-dom"
import { Faxi } from "@/components/faxi"
import { Overline } from "@/components/shell"
import { PATHS, questions } from "@/data/questions"

const topics = [
  { title: "History", path: "history", detail: "Africa, empires, and turning points." },
  { title: "Science", path: "science", detail: "Bodies, planets, and how things work." },
  { title: "Places", path: "general", detail: "Capitals, deserts, and rivers in the mix." },
  { title: "Culture", path: "general", detail: "Books, sport, and film, folded into general play." },
]

export function Discover() {
  const navigate = useNavigate()
  const spotlight = questions[0]

  return (
    <main className="flex flex-col gap-4 px-5 pt-6">
      <div className="flex items-center gap-3">
        <Faxi pose="surprised" alt="" className="h-16 w-16 shrink-0" />
        <div>
          <Overline>Browse</Overline>
          <h1 className="font-display text-[28px] font-extrabold">Discover</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {questions.length} facts in this preview. Each player gets a different draw.
          </p>
        </div>
      </div>
      <article className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
        <Faxi pose="idea" alt="" className="h-16 w-16 shrink-0" />
        <div>
          <Overline>{spotlight.label}</Overline>
          <p className="font-display mt-2 text-xl font-extrabold">{spotlight.text}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {spotlight.explanation}
          </p>
        </div>
      </article>
      <ul className="flex flex-col gap-3">
        {topics.map((topic) => (
          <li key={topic.title}>
            <button
              type="button"
              className="w-full rounded-2xl border border-border bg-card p-4 text-left"
              onClick={() => navigate(`/play?path=${topic.path}`)}
            >
              <p className="font-display text-lg font-extrabold">{topic.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{topic.detail}</p>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        {PATHS.map((path) => path.title).join(" · ")}
      </p>
    </main>
  )
}
