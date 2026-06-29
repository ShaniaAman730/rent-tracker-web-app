'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getCurrentUser, getUsersMapByIds } from '@/lib/api/users'
import { getAllLandlords } from '@/lib/api/landlords'
import { getPropertiesWithUnits } from '@/lib/api/properties'
import { getContractsByYear } from '@/lib/api/tenants'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Bot, Loader2, Mail, Shield, Sparkles, Send } from 'lucide-react'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  emailDraft?: {
    to: string
    subject: string
    body: string
  } | null
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
    recordedBy: string | null
  }>
  propertySnapshot: Array<{
    code: string
    name: string
    unitCount: number
    trackedUnitCount: number
  }>
}

const QUICK_PROMPTS = [
  'Summarize the current app status.',
  'Draft a landlord report for this year.',
  'What should I review next?',
]

function buildFallbackEmailDraft(context: AgentContext) {
  if (!context.landlord?.email) return null

  const landlordName = context.landlord.name
  const bodyLines = [
    `Hello ${landlordName},`,
    '',
    `Here is the latest contract summary for ${context.year}:`,
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
    body: bodyLines.join('\n'),
  }
}

function formatContextForModel(context: AgentContext) {
  return JSON.stringify(
    {
      currentUser: context.currentUser,
      landlord: context.landlord,
      year: context.year,
      summary: context.summary,
      recentContracts: context.recentContracts,
      propertySnapshot: context.propertySnapshot,
    },
    null,
    2
  )
}

export function AgentConsole() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'I can summarize rent, utilities, contracts, and landlord reports. I can draft emails, but I will not change records from chat.',
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingContext, setLoadingContext] = useState(true)
  const [contextError, setContextError] = useState<string | null>(null)
  const [agentContext, setAgentContext] = useState<AgentContext | null>(null)
  const [lastDraft, setLastDraft] = useState<ChatMessage['emailDraft']>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const canSend = input.trim().length > 0 && !sending && !loadingContext && Boolean(agentContext)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, lastDraft])

  useEffect(() => {
    loadContext()
  }, [])

  async function loadContext() {
    try {
      setLoadingContext(true)
      setContextError(null)

      const currentYear = new Date().getFullYear()
      const [currentUser, landlords, properties, contracts] = await Promise.all([
        getCurrentUser(),
        getAllLandlords(),
        getPropertiesWithUnits(),
        getContractsByYear(currentYear),
      ])

      const landlord = landlords[0] || null
      const propertySnapshot = properties.map((property) => ({
        code: property.code,
        name: property.name,
        unitCount: property.units?.length || 0,
        trackedUnitCount: (property.units || []).filter((unit: any) => unit.track_utilities).length,
      }))
      const trackedUnits = properties
        .flatMap((property) => property.units || [])
        .filter((unit: any) => unit.track_utilities).length

      const userIds = contracts.map((contract: any) => contract.recorded_by_user_id).filter(Boolean)
      const recordedByNames = await getUsersMapByIds(userIds)

      const recentContracts = contracts
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 8)
        .map((contract: any) => ({
          unitId: contract.unit_id,
          tenantName: `${contract.first_name} ${contract.middle_name} ${contract.last_name}`.replace(/\s+/g, ' ').trim(),
          rent: Number(contract.rent || 0),
          signed: Boolean(contract.signed),
          year: Number(contract.year),
          recordedBy: contract.recorded_by_user_id ? recordedByNames.get(contract.recorded_by_user_id) || contract.recorded_by_user_id : null,
        }))

      setAgentContext({
        currentUser,
        landlord: landlord
          ? {
              id: landlord.id,
              name: `${landlord.name_prefix ? `${landlord.name_prefix} ` : ''}${landlord.first_name} ${landlord.middle_name} ${landlord.last_name}`.replace(/\s+/g, ' ').trim(),
              email: landlord.email,
            }
          : null,
        year: currentYear,
        summary: {
          properties: properties.length,
          units: properties.reduce((total, property) => total + (property.units?.length || 0), 0),
          trackedUnits,
          contracts: contracts.length,
          signedContracts: contracts.filter((contract: any) => contract.signed).length,
          unsignedContracts: contracts.filter((contract: any) => !contract.signed).length,
        },
        recentContracts,
        propertySnapshot,
      })

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            'Context loaded. Ask me for a summary, a landlord report draft, or a quick explanation of what needs attention.',
        },
      ])
    } catch (error) {
      setContextError(error instanceof Error ? error.message : 'Unable to load agent context.')
    } finally {
      setLoadingContext(false)
    }
  }

  async function handleSend(prompt?: string) {
    const messageText = (prompt || input).trim()
    if (!messageText || !agentContext || sending) return

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: messageText }]
    setMessages(nextMessages)
    setInput('')
    setSending(true)
    setLastDraft(null)

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          context: agentContext,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to reach the assistant.')
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.reply || 'No response returned.',
        emailDraft: data.emailDraft || null,
      }
      setMessages((current) => [...current, assistantMessage])
      setLastDraft(data.emailDraft || null)
    } catch (error) {
      const fallback = buildFallbackEmailDraft(agentContext)
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            error instanceof Error
              ? error.message
              : 'The assistant is temporarily unavailable.',
          emailDraft: fallback,
        },
      ])
      setLastDraft(fallback)
    } finally {
      setSending(false)
    }
  }

  const mailtoLink = useMemo(() => {
    if (!lastDraft) return null
    return `mailto:${encodeURIComponent(lastDraft.to)}?subject=${encodeURIComponent(lastDraft.subject)}&body=${encodeURIComponent(lastDraft.body)}`
  }, [lastDraft])

  const draftBody = lastDraft?.body || ''

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-cyan-950/20">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-300">
              <Bot size={18} />
              <span className="text-sm uppercase tracking-[0.25em]">AI Agent</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold text-white">Rent Tracker Assistant</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Ask for summaries, report drafts, or help understanding the current state of the app.
            </p>
          </div>
          <Button
            onClick={loadContext}
            variant="outline"
            className="border-slate-600 text-slate-200 hover:bg-slate-800"
            disabled={loadingContext}
          >
            {loadingContext ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Refresh context
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <Card className="border-slate-700 bg-slate-800/90 p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Chat</h2>
              <p className="text-sm text-slate-400">The assistant answers from the app context you load here.</p>
            </div>
            {sending && <Loader2 className="h-4 w-4 animate-spin text-slate-300" />}
          </div>

          {contextError ? (
            <div className="mt-4 rounded-lg border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-200">
              {contextError}
            </div>
          ) : null}

          <div className="mt-4 flex min-h-[420px] flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-cyan-600 text-white'
                        : 'border border-slate-700 bg-slate-800 text-slate-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.emailDraft && (
                      <div className="mt-3 rounded-xl border border-slate-600 bg-slate-900/70 p-3 text-xs text-slate-300">
                        <div className="flex items-center gap-2 text-cyan-300">
                          <Mail size={14} />
                          <span>Email draft ready</span>
                        </div>
                        <p className="mt-2 truncate">To: {message.emailDraft.to}</p>
                        <p className="truncate">Subject: {message.emailDraft.subject}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="space-y-3 border-t border-slate-700 pt-3">
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <Button
                    key={prompt}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800"
                    onClick={() => handleSend(prompt)}
                    disabled={!agentContext || loadingContext || sending}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>

              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask the assistant anything about the app..."
                className="min-h-28 border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500"
                disabled={loadingContext || sending}
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-400">
                  The assistant will not change records or expose sensitive IDs.
                </p>
                <Button
                  onClick={() => handleSend()}
                  className="bg-cyan-600 text-white hover:bg-cyan-700"
                  disabled={!canSend}
                >
                  {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-700 bg-slate-800 p-5">
            <div className="flex items-center gap-2 text-cyan-300">
              <Shield size={16} />
              <h2 className="font-semibold text-white">Guardrails</h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>Only answer from the context loaded from this app.</li>
              <li>No data edits, deletes, or hidden actions from chat.</li>
              <li>Do not reveal government IDs, phone numbers, passwords, or tokens.</li>
              <li>If a report is requested, draft it first and let the user review the email.</li>
              <li>If the assistant is unsure, it should say so instead of guessing.</li>
            </ul>
          </Card>

          <Card className="border-slate-700 bg-slate-800 p-5">
            <h2 className="font-semibold text-white">Context snapshot</h2>
            {!agentContext ? (
              <p className="mt-3 text-sm text-slate-400">Loading context...</p>
            ) : (
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <p>Current year: {agentContext.year}</p>
                <p>Properties: {agentContext.summary.properties}</p>
                <p>Units: {agentContext.summary.units}</p>
                <p>Tracked utility units: {agentContext.summary.trackedUnits}</p>
                <p>Contracts: {agentContext.summary.contracts}</p>
                <p>Signed contracts: {agentContext.summary.signedContracts}</p>
                <p>Unsigned contracts: {agentContext.summary.unsignedContracts}</p>
                <p>
                  Landlord: {agentContext.landlord?.name || 'Not set up'}
                  {agentContext.landlord?.email ? ` (${agentContext.landlord.email})` : ''}
                </p>
              </div>
            )}
          </Card>

          <Card className="border-slate-700 bg-slate-800 p-5">
            <h2 className="font-semibold text-white">Email draft</h2>
            {lastDraft ? (
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <p>To: {lastDraft.to}</p>
                <p>Subject: {lastDraft.subject}</p>
                <Textarea
                  readOnly
                  value={draftBody}
                  className="min-h-48 border-slate-700 bg-slate-950 text-slate-100"
                />
                {mailtoLink && (
                  <Button asChild className="w-full bg-cyan-600 text-white hover:bg-cyan-700">
                    <a href={mailtoLink}>Open in email client</a>
                  </Button>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">Ask for a landlord report and the draft will appear here.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}