import { NextResponse } from 'next/server'

const ACADEMY_WAITLIST_TAG_ID = 1943652

export const revalidate = 30 // cache for 30 seconds

export async function GET() {
  const apiKey = process.env.SYSTEME_API_KEY
  if (!apiKey) {
    return NextResponse.json({ count: 0 })
  }

  try {
    let count = 0
    let hasMore = true
    let afterId: number | null = null

    while (hasMore) {
      const url = new URL('https://api.systeme.io/api/contacts')
      url.searchParams.set('tagIds[]', String(ACADEMY_WAITLIST_TAG_ID))
      url.searchParams.set('limit', '100')
      if (afterId) url.searchParams.set('afterId', String(afterId))

      const res = await fetch(url.toString(), {
        headers: { 'X-API-Key': apiKey },
      })
      if (!res.ok) break

      const data = await res.json()
      const items = data?.items ?? []
      count += items.length
      hasMore = data?.hasMore ?? false
      if (hasMore && items.length > 0) {
        afterId = items[items.length - 1].id
      }
    }

    return NextResponse.json({ count })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
