import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const apiKey = process.env.SYSTEME_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  // Step 1: create or find contact
  const contactBody: Record<string, unknown> = { email, fields: [] }

  console.log('Sending to systeme.io:', JSON.stringify(contactBody))

  const contactRes = await fetch('https://api.systeme.io/api/contacts', {
    method: 'POST',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(contactBody),
  })

  console.log('Systeme.io status:', contactRes.status)

  let contactId: number | null = null

  if (contactRes.status === 201) {
    const data = await contactRes.json()
    console.log('Systeme.io 201 response:', JSON.stringify(data))
    contactId = data?.id ?? null

  } else if (contactRes.status === 422) {
    const body = await contactRes.json()
    console.log('422 body:', JSON.stringify(body))
    const alreadyExists = body?.violations?.some(
      (v: { message: string }) => v.message?.includes('already used')
    )
    if (alreadyExists) {
      const lookupRes = await fetch(
        `https://api.systeme.io/api/contacts?email=${encodeURIComponent(email)}`,
        { headers: { 'X-API-Key': apiKey } }
      )
      if (lookupRes.ok) {
        const data = await lookupRes.json()
        contactId = data?.items?.[0]?.id ?? null
      }
    }
  } else {
    const err = await contactRes.text()
    console.error('Systeme.io error:', err)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }

  // Step 2: apply academy-waitlist tag (tag ID: 1943652)
  if (contactId) {
    await fetch(`https://api.systeme.io/api/contacts/${contactId}/tags`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagId: 1943652 }),
    })
  }

  return NextResponse.json({ success: true })
}
