'use client';

import {useEffect, useState} from 'react';
import Logo from '@/components/ui/Logo';
import PredictionForm from '@/components/forms/PredictionForm';
import ConfirmPicksModal from '@/components/modals/ConfirmPicksModal';
import LoadingModal from '@/components/modals/LoadingModal';
import EntryReceivedModal from '@/components/modals/EntryReceivedModal';
import ErrorModal from '@/components/modals/ErrorModal';
import Button from '../ui/Button';

type SubmitResponse = {
  ok?: boolean;
  leaderboardUrl?: string;
  outboundMessage?: string;
  error?: string;
};

type Pick = 'H' | 'D' | 'A';
type Match = {
  id: string;
  weekId: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
};

export default function PredictionClient({token}: {token: string}) {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successCountdown, setSuccessCountdown] = useState<number | null>(null);

  const updatePick = (index: number, value: Pick) => {
    setPicks(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const confirmSubmit = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    setResult(null);
    setSuccessCountdown(null);

    console.log('[submit] sending picks:', picks);

    const res = await fetch(`/api/p/${token}/submit`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({picks})
    });

    const rawText = await res.text();
    console.log('[submit] response status:', res.status, 'body:', rawText);

    let data: SubmitResponse = {};
    try {
      data = JSON.parse(rawText) as SubmitResponse;
    } catch {
      data = {error: rawText || 'Something went wrong.'};
    }

    if (!res.ok) {
      console.error('[submit] failed:', data.error);
      setResult({error: data.error ?? 'Something went wrong.'});
    } else {
      console.log('[submit] success:', data);
      if (data.outboundMessage) {
        try {
          const payload = JSON.stringify({message: data.outboundMessage, ts: Date.now()});
          if ('BroadcastChannel' in window) {
            const channel = new BroadcastChannel('demo-outbound');
            channel.postMessage(payload);
            channel.close();
          }
        } catch {
          /* ignore */
        }
      }
      if (data.leaderboardUrl) setSuccessCountdown(3);
      setResult(data);
    }

    setSubmitting(false);
  };

  useEffect(() => {
    let active = true;
    fetch(`/api/matches?token=${encodeURIComponent(token)}`, {cache: 'no-store'})
      .then(res => res.json())
      .then((data: {matches?: Match[]}) => {
        if (!active) return;
        const nextMatches = Array.isArray(data?.matches) ? data.matches : [];
        setMatches(nextMatches);
        setPicks(nextMatches.map(() => 'H' as Pick));
      })
      .catch(() => {
        if (!active) return;
        setMatches([]);
        setPicks([]);
      })
      .finally(() => {
        if (!active) return;
        setMatchesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (successCountdown === null || successCountdown <= 0) return;
    const timer = window.setInterval(() => {
      setSuccessCountdown(prev => (prev ? prev - 1 : null));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [successCountdown]);

  useEffect(() => {
    if (successCountdown === 0) window.close();
  }, [successCountdown]);

  return (
    <main className="flex justify-center min-h-screen">
      <div className="w-full max-w-125 px-6 pb-10 flex flex-col items-center gap-8 bg-[url('/images/bg-purple.webp')] bg-cover bg-center">
        <Logo />

        <div className="relative w-full flex flex-col border-3 border-purple-light rounded-3xl bg-violet-dark px-3 pt-8 max-h-[60vh]">
          <h1 className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-2xl font-extrabold tracking-wide border-3 border-purple-light shadow-2xl rounded-2xl bg-violet-dark px-4 py-2 text-center z-10">Your Picks</h1>
          <div className="text-lg text-center font-bold text-white">Make Your Selections</div>
          {/* Scrollable matches list */}
          <div className="flex-1 min-h-0 mx-3 rounded-xl my-2 wkw-scrollbar">
            <PredictionForm matches={matches} picks={picks} matchesLoading={matchesLoading} onUpdatePickAction={updatePick} />
          </div>

          {/* Submit button — always visible */}
          {/* {result?.error && <p className="mx-3 mb-2 rounded-lg border border-rose-400/50 bg-rose-950/50 px-3 py-2 text-sm text-rose-300">{result.error}</p>} */}
        </div>
        <div className=" flex justify-center">
          <Button onClick={() => setConfirmOpen(true)}
            className="disabled:opacity-50"
            disabled={submitting || matchesLoading || matches.length === 0}
            color='purple'
          >
            Submit
          </Button>
        </div>
      </div>

      {submitting && <LoadingModal />}
      {confirmOpen && <ConfirmPicksModal onConfirm={confirmSubmit} onCancel={() => setConfirmOpen(false)} submitting={submitting} />}
      {result?.error && <ErrorModal title="Error" message={result.error} onClose={() => setResult(null)} />}
      {result?.leaderboardUrl && <EntryReceivedModal onClose={() => window.close()} />}
    </main>
  );
}
