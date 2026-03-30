import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email, name } = await req.json()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const apiKey = process.env.SYSTEME_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  // Try to create contact
  const contactRes = await fetch('https://api.systeme.io/api/contacts', {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      firstName: name || '',
      fields: [],
      tags: ['academy-waitlist'],
    }),
  })

  // 201 = created, treat "already used" (422) as success too —
  // contact exists, so look them up and patch the tag on
  if (contactRes.status === 422) {
    const body = await contactRes.json()
    const alreadyExists = body?.violations?.some(
      (v: { message: string }) => v.message?.includes('already used')
    )
    if (alreadyExists) {
      // Look up the existing contact and add the tag
      const lookupRes = await fetch(
        `https://api.systeme.io/api/contacts?email=${encodeURIComponent(email)}`,
        { headers: { 'X-API-Key': apiKey } }
      )
      if (lookupRes.ok) {
        const data = await lookupRes.json()
        const contact = data?.items?.[0]
        if (contact?.id) {
          await fetch(`https://api.systeme.io/api/contacts/${contact.id}`, {
            method: 'PATCH',
            headers: {
              'X-API-Key': apiKey,
              'Content-Type': 'application/merge-patch+json',
            },
            body: JSON.stringify({ tags: ['academy-waitlist'] }),
          })
        }
      }
      return NextResponse.json({ success: true })
    }
  }

  if (!contactRes.ok) {
    const err = await contactRes.text()
    console.error('Systeme.io error:', err)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
