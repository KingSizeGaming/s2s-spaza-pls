'use client';

import {useEffect, useState} from 'react';
import Logo from '@/components/ui/Logo';
import PredictionForm from '@/components/forms/PredictionForm';
import ConfirmPicksModal from '@/components/modals/ConfirmPicksModal';
import LoadingModal from '@/components/modals/LoadingModal';
import EntryReceivedModal from '@/components/modals/EntryReceivedModal';
import ErrorModal from '@/components/modals/ErrorModal';
// import Button from '../ui/Button';

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

export default function PredictionClient({token, fontClass}: {token: string; fontClass: string}) {
  const [picks, setPicks] = useState<(Pick | null)[]>([]);
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
        setPicks(nextMatches.map(() => null));
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
      <div className="w-full max-w-125 px-4 sm:px-6 flex flex-col items-center bg-[url('/images/bg-purple.webp')] bg-cover bg-center">
        <Logo />

        {/* <div className="relative w-full flex flex-col border-3 border-purple-light rounded-3xl bg-violet-dark px-3 pt-8 max-h-[60vh]">
          <h1 className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-2xl font-extrabold tracking-wide border-3 border-purple-light shadow-2xl rounded-2xl bg-violet-dark px-4 py-2 text-center z-10">Your Picks</h1>
          <div className="text-xl text-center font-medium text-white">Make Your Selections</div>
          <div className="flex-1 min-h-0 mx-3 rounded-xl my-2 wkw-scrollbar">
            <PredictionForm matches={matches} picks={picks} matchesLoading={matchesLoading} onUpdatePickAction={updatePick} />
          </div>
        </div>
        <div className=" flex justify-center">
          <Button onClick={() => setConfirmOpen(true)}
            className="disabled:opacity-50"
            disabled={submitting || matchesLoading || matches.length === 0}
            color='purple'
          >
            Submit
          </Button>
        </div> */}

        <div className={`relative w-full flex flex-col max-h-[80vh] mt-2 ${fontClass}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/big_frame_panel.png" alt="" className="absolute inset-0 w-full h-full object-fill" />
          <div className="relative z-10 flex flex-col px-3 flex-1 min-h-0">
            <div className="mx-auto -mt-2 relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/header_text_bg_panel.png" alt="" className="w-48 h-auto" />
              <span className="absolute inset-0 flex items-center justify-center text-xl font-extrabold tracking-wide"></span>
            </div>
            <div className="text-lg sm:text-xl text-center font-medium text-white shrink-0">Make Your Selections</div>
            <div className="flex-1 max-h-[76%] predict-width sm:mx-8 overflow-y-auto wkw-scrollbar">
              <PredictionForm matches={matches} picks={picks} matchesLoading={matchesLoading} onUpdatePickAction={updatePick} />
            </div>
          </div>
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={submitting || matchesLoading || matches.length === 0}
            className="-mt-5 w-32 h-12 sm:w-40 sm:h-14 bg-[url('/images/submit_button_untapped.png')] bg-contain bg-center bg-no-repeat active:bg-[url('/images/submit_button_tapped.png')] disabled:opacity-50 transition"
          />
        </div>
      </div>

      {submitting && <LoadingModal />}
      {confirmOpen && <ConfirmPicksModal onConfirm={confirmSubmit} onCancel={() => setConfirmOpen(false)} submitting={submitting} />}
      {result?.error && <ErrorModal title="Error" message={result.error} onClose={() => setResult(null)} />}
      {result?.leaderboardUrl && <EntryReceivedModal onClose={() => window.close()} />}
              
      {/* For testing to show success modal*/}
      {/* {true && <EntryReceivedModal onClose={() => window.close()} />} */}

    </main>
  );
}
