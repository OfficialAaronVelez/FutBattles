// Fetch player portrait thumbnails from Wikipedia's free REST API.
// Results are cached in-memory so each title is only fetched once per session.

const cache = new Map<string, string>()
const inflight = new Map<string, Promise<string | null>>()

export async function getWikiImage(title: string): Promise<string | null> {
  if (cache.has(title)) return cache.get(title)!
  if (inflight.has(title)) return inflight.get(title)!

  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  const p = fetch(url)
    .then(r => r.json())
    .then((data): string | null => {
      const src = data?.thumbnail?.source ?? null
      if (src) cache.set(title, src)
      return src
    })
    .catch(() => null)
    .finally(() => inflight.delete(title))

  inflight.set(title, p)
  return p
}
