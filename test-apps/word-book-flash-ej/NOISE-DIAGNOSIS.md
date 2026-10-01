
## Second repair — 2026-10-01 10:45 ICT (controller, Claude Code on the Mac)

Owner after the first repair: "although sound right ... it still sound like bad microphone. it's
like the voice is not clear." The first repair was right that the masters are clean, but its
measurement missed the real fault: in the Codex sandbox `afconvert` could not encode, so every clip
went through the PyAV (FFmpeg built-in) AAC encoder, which added broadband hiss. On `eagle` the
16–22 kHz band was **−40.9 dB** in the staged clip against **−91.7 dB** in the master and −84.1 dB in
the shipped clip. The identical levelling/gate/fade chain encoded with AudioToolbox on the host gives
−84.8 dB and otherwise matches the master band for band. All 366 Flash clips were rebuilt on the
host (worst whole-clip 16–22 kHz band −63.4 dB on `first`, which is the /f/ and /s/, median −79.2).
The PyAV encode fallback is removed: the builder now stops if `afconvert` cannot encode. 0 credits.
