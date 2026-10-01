# E–J Flash audio diagnosis and repair

Measured 2026-10-01 ICT. The E–J sample is 20 evenly spaced entries from the 366-word page; the control is all eight E–J Flash takes accepted from round 10. Quiet-floor figures are RMS dBFS of the quietest 100 ms window. Formats and effective file rates are from `afinfo`; PCM measurements are after decoding to mono 44.1 kHz.

## Cause

The paid masters are not the cause. Both batches use the same Alice voice, `eleven_flash_v2_5`, `mp3_44100_128`, mono 44.1 kHz, and their quiet floors are effectively identical: E–J sample median −90.5 dBFS versus round 10 median −90.2 dBFS. The requested rerender would buy the same format again, so no credits were spent.

The regression was introduced after rendering. Round 10 directly transcoded each clean master. The first E–J builder instead decoded, peak-matched, and used a PyAV AAC fallback with a 64 kbps target. Its 20-file sample measured only 41.5–84.1 kbps (median 52.7), matching the owner's band-limited/heavily-compressed or "bad microphone" description. The leveller also allowed positive gain (full set up to +3.3 dB), which could lift codec residue. Missing trim was not the cause: the old builder already trimmed the master edges and added the comparison clip's padding.

The repair reuses every existing master, caps levelling boost at 0 dB, attenuates only 10 ms frames below −58 dBFS with a gentle attack/release, adds 6 ms fades, and requests 256 kbps mono AAC. AAC is content-variable-rate: effective whole-file rates include the deliberately silent padding and therefore range below the encoder target for a few very short/quiet words, but the 20-file sample improved to 91.8–186.9 kbps (median 132.9), and every file is encoded with a target well above the requested 96 kbps floor.

## Representative E–J measurements

`Gain` is the repaired levelling gain. All values are dB or kbps as labelled.

| Word | Master format / kbps | Gain dB | Old AAC kbps | Repaired AAC kbps |
|---|---:|---:|---:|---:|
| each | 44.1 kHz MP3 / 128 | -5.0 | 46.6 | 115.6 |
| eleven | 44.1 kHz MP3 / 128 | -3.5 | 49.6 | 125.4 |
| ever | 44.1 kHz MP3 / 128 | -0.3 | 62.2 | 106.7 |
| fact | 44.1 kHz MP3 / 128 | -0.8 | 55.8 | 138.2 |
| feed | 44.1 kHz MP3 / 128 | -6.0 | 46.2 | 144.8 |
| fire-station | 44.1 kHz MP3 / 128 | -3.3 | 61.3 | 160.9 |
| flute | 44.1 kHz MP3 / 128 | -5.3 | 55.8 | 139.4 |
| four | 44.1 kHz MP3 / 128 | -4.1 | 45.4 | 91.8 |
| fruit | 44.1 kHz MP3 / 128 | -2.8 | 49.1 | 118.6 |
| giant | 44.1 kHz MP3 / 128 | -3.9 | 84.1 | 159.4 |
| goat | 44.1 kHz MP3 / 128 | -5.4 | 76.6 | 144.5 |
| gravity | 44.1 kHz MP3 / 128 | -4.2 | 64.1 | 157.1 |
| hairy | 44.1 kHz MP3 / 128 | -1.0 | 43.4 | 121.8 |
| hear | 44.1 kHz MP3 / 128 | -3.4 | 41.5 | 113.6 |
| hers | 44.1 kHz MP3 / 128 | -0.5 | 48.0 | 137.7 |
| honest | 44.1 kHz MP3 / 128 | -2.9 | 49.7 | 127.6 |
| hundred | 44.1 kHz MP3 / 128 | -4.8 | 75.4 | 186.9 |
| in | 44.1 kHz MP3 / 128 | -4.7 | 47.5 | 103.9 |
| jackfruit | 44.1 kHz MP3 / 128 | -3.9 | 68.1 | 179.7 |
| just | 44.1 kHz MP3 / 128 | -2.2 | 58.1 | 105.6 |

The full repaired gain range is −12.6 to 0.0 dB (median −3.3); no clip is boosted.

## Noise-floor comparison

| Set | Count | Master quietest 100 ms | Output quietest 100 ms | Tail 100 ms | Notes |
|---|---:|---:|---:|---:|---|
| E–J Flash masters | 20 | −90.5 median | n/a | −89.8 median | Clean 128 kbps masters; leading 100 ms often contains speech, so it is not a noise-only window. |
| Round-10 Flash masters | 8 | −90.2 median | n/a | −89.8 median | Same model, voice, sample rate and output format. |
| Round-10 shipped QA AAC | 8 | n/a | −91.2 median | −91.4 median | Clean owner-approved control. |
| Repaired E–J QA AAC | 20 | n/a | digital silence (≤−240 median) | digital silence (≤−240 median) | Below the round-10 floor; the gate also attenuates eligible between-syllable 10 ms frames below −58 dBFS. |

Single-syllable clips often have no 100 ms between-syllable interval; for those, no invented internal-silence value is reported. The trailing and quietest-window measurements provide the comparable floor, while the gate threshold documents the treatment applied to shorter internal gaps.

## Verification conclusion

The repaired noise floor is at or below round 10, no positive levelling gain remains, and the clean paid masters were preserved unchanged. Credits spent: **0**.
