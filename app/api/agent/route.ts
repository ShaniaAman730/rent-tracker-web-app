import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type AgentContext = {
  currentUser: {
    id: string
    email: string
    full_name: string
    role: 'manager' | 'contributor'
  } | null
  landlord: {
    id: string
    name: string
    email: string | null
  } | null
  year: number
  summary: {
    properties: number
    units: number
    trackedUnits: number
    contracts: number
    signedContracts: number
    unsignedContracts: number
  }
  recentContracts: Array<{
    unitId: string
    tenantName: string
    rent: number
    signed: boolean
    year: number
  }>
  propertySnapshot: Array<{
    code: string
    name: string
    unitCount: number
    trackedUnitCount: number
  }>
}

type AgentResponse = {
  reply: string
  emailDraft: {
    to: string
    subject: string
    body: string
  } | null
}

function buildReportDraft(context: AgentContext) {
  if (!context.landlord?.email) return null

  const lines = [
    `Hello ${context.landlord.name},`,
    '',
    `Here is the latest report for ${context.year}:`,
    `- Total contracts: ${context.summary.contracts}`,
    `- Signed contracts: ${context.summary.signedContracts}`,
    `- Unsigned contracts: ${context.summary.unsignedContracts}`,
    `- Properties tracked: ${context.summary.properties}`,
    `- Units tracked: ${context.summary.units}`,
    '',
    'Recent contracts:',
    ...context.recentContracts.slice(0, 8).map((contract) => {
      return `- Unit ${contract.unitId}: ${contract.tenantName} | PHP ${contract.rent.toLocaleString()} | ${contract.signed ? 'Signed' : 'Unsigned'}`
    }),
    '',
    'Best regards,',
    'Rent Tracker Bot',
  ]

  return {
    to: context.landlord.email,
    subject: `Contract report for ${context.year}`,
    body: lines.join('\n'),
  }
}

function extractLatestUserMessage(messages: ChatMessage[]) {
  const reversed = [...messages].reverse()
  return reversed.find((message) => message.role === 'user')?.content || ''
}

function looksLikeWriteRequest(text: string) {
  return /\b(delete|remove|edit|update|modify|create|insert|overwrite|change)\b/i.test(text)
}

function looksLikeReportRequest(text: string) {
  return /\b(report|email|landlord|send)\b/i.test(text)
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { messages?: ChatMessage[]; context?: AgentContext }
    const messages = Array.isArray(body.messages) ? body.messages : []
    const context = body.context

    if (!context) {
      return NextResponse.json({ error: 'Missing app context' }, { status: 400 })
    }

    const latestUserMessage = extractLatestUserMessage(messages)
    const emailDraft = looksLikeReportRequest(latestUserMessage) ? buildReportDraft(context) : null

    if (looksLikeWriteRequest(latestUserMessage)) {
      const reply =
        'I cannot change records from chat. I can summarize the data, draft messages, or point you to the existing forms if you want to update something.'

      return NextResponse.json({ reply, emailDraft }) satisfies NextResponse<AgentResponse>
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      const reply =
        `OpenAI is not configured yet. I can still see this snapshot: ${context.summary.contracts} contracts, ${context.summary.signedContracts} signed, and ${context.summary.unsignedContracts} unsigned. ${context.landlord?.email ? 'I can draft a landlord report when you ask for one.' : 'Set up a landlord email to enable report drafts.'}`

      return NextResponse.json({ reply, emailDraft }) satisfies NextResponse<AgentResponse>
    }

    const systemPrompt = [
      'You are Rent Tracker Bot for a property management app.',
      'Follow these guardrails strictly:',
      '- Use only the provided context. Do not invent data.',
      '- Do not reveal government IDs, phone numbers, passwords, tokens, or other secrets.',
      '- Do not claim to have changed records or sent email. You can draft emails only.',
      '- If the user asks for a data change, explain that edits must happen through the app forms.',
      '- If the user asks for a landlord report, provide a concise summary and a professional email draft when a recipient exists.',
      '- If information is missing, say so clearly.',
      '- Keep the response concise, practical, and professional.',
      '',
      'Return strict JSON with this shape:',
      '{"reply":"string","emailDraft":null|{"to":"string","subject":"string","body":"string"}}',
      '',
      'App context:',
      JSON.stringify(context),
    ].join('\n')

    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        ],
      }),
    })

    if (!completion.ok) {
      const errorText = await completion.text()
      throw new Error(errorText || 'OpenAI request failed')
    }

    const data = await completion.json()
    const content = data?.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(content) as AgentResponse

    const sanitizedDraft = parsed.emailDraft && context.landlord?.email
      ? {
          to: context.landlord.email,
          subject: parsed.emailDraft.subject || `Contract report for ${context.year}`,
          body: parsed.emailDraft.body || '',
        }
      : emailDraft

    return NextResponse.json({
      reply: parsed.reply || 'No response returned.',
      emailDraft: sanitizedDraft,
    }) satisfies NextResponse<AgentResponse>
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to process the request.' },
      { status: 500 }
    )
  }
}