# Narration — the voice, and how to render it

Two manifests, and the split matters.

`lines.json` is the **render** manifest and is **never published**: the lines
the voice brief, both candidate prompts, the audition text, the model-and-credits
note, and the provenance block that has to be filled before anything ships.

`clips.json` is the **runtime** manifest and is the one that goes public. It holds
`audioReady` and the map from a line of text to its file, and nothing else. The
game fetches this one.

Both are generated together — `python3 tools/build-narration.py` reads the planet
and moon tables straight out of `app.js`, so the game stays the single source of
truth for its own words. `build-audio.py` flips `audioReady` in both, because a
render that only reached one of them would leave the game silent.

They were one file until 2026-08-21, when the first publish was being prepared:
the game fetches its manifest at boot, so shipping `lines.json` would have served
the voice prompts, the voice ID and the internal reasoning from a public web
server. The math app had already split the same two jobs for the same reason.

**All 59 clips are rendered.** `audioReady` is `true`. The game refuses to speak
unless it is, so before the render it made no audio requests at all — the question
still arrived with its rising two-note chime and its words on screen, which is
also what happens on a device where sound is switched off.

## The voice

The owner's brief, 2026-08-21: **a different voice from the math app's narrator —
younger, male, with the personality of a children's television host who asks the
child a question and is happy to wait for the answer.**

The prompts in `lines.json` describe that manner and **name nobody**. That is
`AUDIO-DIRECTION.md` decision 1: never clone a real person's voice. A brief given
by naming a programme is fine between people; a *prompt* naming it is an
instruction to approximate a particular living performer, which is the thing the
rule forbids — and it is against the generator's terms as well. So the brief is
translated into what that host actually does with his voice: talks to the child
at their eye level, is genuinely curious rather than performing curiosity, asks
and then waits, stays warm and unhurried, and is delighted with the child rather
than impressed with himself.

The negative clauses — *never loud, never zany, never a cartoon character* — are
doing as much work as the positive ones. Left to itself a text-to-speech
children's voice over-performs.

**Two prompts, two accents.** The brief settled the personality and said nothing
about the accent, and it genuinely goes both ways: every other voice decided in
this repository is neutral English and the game's own copy is British, but the
manner being asked for is an American one. So both are generated and it is
settled by ear, which is how the math narrator was chosen too.

## The three commands

```bash
# 1. six candidates: three neutral English, three American
python3 solar-system-game/tools/design-voice.py --dry-run
python3 solar-system-game/tools/design-voice.py

# 2. listen to narration/voice-candidates/*.mp3, then name the winner.
#    This one calls the API: a preview has to be saved to the library before
#    it can be rendered with. Costs a voice add/edit operation, no credits.
python3 solar-system-game/tools/design-voice.py --choose american-2 --name "Solar System Host"

# 3. render, then encode
python3 solar-system-game/tools/render-narration.py --dry-run
python3 solar-system-game/tools/render-narration.py --limit 8   # a pilot, ~330 credits
python3 solar-system-game/tools/render-narration.py             # all 59
python3 solar-system-game/tools/build-audio.py
```

The key goes in `~/.config/children-games/secrets.env`, which is outside every
checkout — `python3 scripts/repo_secrets.py` prints the path for this machine, and
`AGENTS.md` → "Secrets and credentials" is canonical. It must **not** go in
`solar-system-game/.env` or `math-app/.env`: that is where the last key was lost,
because a git-ignored file inside a harness worktree dies with the worktree.
Exporting it in the shell still wins. **Never as a command-line argument**: that
puts it in your shell history.

The key needs three scopes, and a text-to-speech-only key will not do: **Text to
Speech** for the lines, **Voice Generation** for the design call, and **Voices:
Write** to save the chosen preview. A 401 or 403 from either call says which one
is missing. If designing over the API is not possible at all, the script prints
the prompt and the audition text so the voice can be designed in the ElevenLabs
web interface instead — that hands back a real voice ID, so it skips the save:

```bash
python3 solar-system-game/tools/design-voice.py --set-id <voiceId> --name "Solar System Host"
```

## What it costs

| Step | Characters | Credits |
|---|---|---|
| Voice Design, two accents | 379 each | **758, measured** |
| The 59 original lines | 2,784 | ~2,784 |
| Level 4's voice (2026-08-28, 18 lines) and moon parity (2026-08-29, 35 more, incl. the Makemake re-render) | | rendered as they landed; `lines.json`'s `count` is the current total |
| **Total** | | **~3,542** |

Voice Design bills **1 credit per audition character, per generation** — three
previews come free with each generation. Measured on 2026-08-21: the account went
from 16,853 to 17,611 for two generations of a 379-character audition, which is
379 x 2 exactly. The tool first guessed ~192 a generation, half the real price.
Shortening `auditionText` is the only lever on this cost — and it is the wrong one
to pull, because the hard moon names are the whole point of the audition.

Against the account, not a key cap: the Creator plan gives **131,000 credits a
month**, and on 2026-08-21 it had **~114,000 unused**, renewing on the 20th. The
whole job is under 3% of one month. An earlier note here read "~5,900 left" — that
was the headroom on the *old key's* usage cap, not the balance, and it made the
job look like a budget decision when it is not one.

Render the 8 level-1 questions first (`--limit 8`, ~330 credits) anyway. The reason
is quality, not money: hear the voice in the actual game, on the iPad, before
committing the other 51 lines to the same voice.

`eleven_flash_v2_5` is half the price and is **not** recommended here. The math
app rejected it as flatter on numbers; the objection here is different but
stronger — flatness is exactly what would destroy the unhurried, curious manner
the whole brief is about.

## What must not happen

- **No `speechSynthesis`, no OS `say` voices** as the shipped narration. Every
  built-in voice is an adult, and a "temporary" robot voice is how that decision
  gets quietly undone.
- **No text-to-speech call from anything a child touches**, and **no key in the
  app.** The Prohibited Use Policy restricts making the service available to
  under-13s; we are compliant only because a child never reaches it.
- **No cloning**, Instant or Professional. The subscription includes them and
  that changes nothing.

## Listening notes for choosing

In this order, because this is the order in which a candidate fails:

1. **The question-then-wait cadence.** It is the whole manner being asked for and
   the thing a generated voice most often ruins by rushing.
2. **The moon names.** Ganymede, Enceladus, Callisto, Miranda, Umbriel — words a
   four-year-old has never heard, which have to survive being said once.
3. **Uranus.** Listen for the stress on the first syllable.
4. **"Not that one."** It has to sound kind. A candidate that sounds disappointed
   there would undo the point of the whole design.

## When the clips land

1. `build-audio.py` encodes them to `assets/audio/*.m4a`, writes `audio-list.js`
   for the offline set, and flips `audioReady` — **all 59 or nothing**, so a
   half-rendered set stays silent rather than talking through half a level.
2. Fill `provenance.voiceId`, `voiceName`, `voiceOrigin` and `renderedOn`. A clip
   without provenance cannot be published.
3. Bump `CACHE_NAME` in `service-worker.js`, or installed copies stay silent.
4. Add `audio-list.js` and `assets/audio/**` to `[ship]` in `.publish-manifest`.
5. Confirm ElevenLabs' terms still permit public redistribution of speech in a
   free app. `AUDIO-DIRECTION.md` records this as checked for speech on
   2026-08-20; it blocks publication, not development.

Format is mono AAC in `.m4a`, 24 kHz, 32 kbps, peak −3 dBFS — copied from the
math app's numbers rather than re-derived, so a child moving between the two
games does not hear the level or the timbre change.
