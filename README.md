# Skycourier — Island Run

A complete, original flight game for the make.fun "Make the best flight game"
bounty. Fly a little turboprop over a voxel-rendered archipelago, thread a
course of glowing rings, mind your fuel, and bring her home to Runway 18.

## Play

```
node serve.ts        # serves game/ on http://localhost:8080
```

Open http://localhost:8080 in desktop Chrome. No network requests, no build
step — the game is plain static files under `game/`.

## Controls

- **↑ / ↓ (W / S)** — pitch up / down
- **← / → (A / D)** — bank left / right
- **Shift / Ctrl** — throttle up / down
- **B** — airbrake
- **Mouse** — steer by moving the pointer; wheel works the throttle
- **1 / 2 / 3** — pick a sortie on the title screen
- **Enter** — start · **R** — retry · **T** — title · **P** — pause · **M** — mute

## Sorties

1. **Island Hop** — six rings over the islands, then land. No clock.
2. **Coastal Dash** — eight rings in under four minutes, smaller tank.
3. **Storm Run** — seven rings hung low over the sea in a gusty crosswind.

## What a sortie asks of you

Throttle sets speed, pitch trades speed for altitude, and a banked turn is
how the nose follows. Below stall speed the wing gives up and the plane
sinks. Fuel drains with throttle, so full power the whole way home is a
choice, not a freebie. Landings are judged: on the strip, slow, gentle,
wings level, nose on the centreline. Ditch in the sea or clip a hillside and
the sortie is over.

## Scoring

100 points a ring, 250 for the landing, 100 for the centreline, 100 for a
greased touchdown, plus a time bonus on the timed dash. Your best score is
kept on the machine.

## Layout

- `game/index.html` + `game/style.css` — the page
- `game/src/main.js` — bootstrap, loop, phase machine
- `game/src/config.js` — tuning and mission definitions
- `game/src/random.js` — seeded RNG and value noise
- `game/src/terrain.js` — the archipelago heightfield and its colours
- `game/src/physics.js` — the flight model and landing judgement
- `game/src/missions.js` — ring courses and scoring
- `game/src/render.js` — voxel ground, sky, clouds, rings, aircraft
- `game/src/hud.js` — glass-cockpit instruments and screens
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised engine, wind and chimes (WebAudio)
- `game/src/shots.js` — deterministic screenshot poses (`?shot=start|play|end`)
- `main.ts` — the hand-in program (Node 22), writes `/output`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

## Screenshots

The three screenshots in `screenshots/` are real frames of the game, taken
in headless Chrome with `?shot=start`, `?shot=play` and `?shot=end`.
