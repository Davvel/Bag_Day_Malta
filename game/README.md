# Sort & Learn — optional game, version 1.0.35

This folder is a standalone game. It owns its HTML, JavaScript, CSS, item rules, SVG illustrations, progress key and service worker. It imports no Bag Day styles, methods, data or graphics. Bag Day does not import any game code.

## Remove the game

1. Change `Game_Enabled=true` to `Game_Enabled=false` in the root `game_config.txt` and publish that file.
2. Optionally delete this entire `game/` folder and publish the deletion.

The launcher checks the switch on page load, when returning to the tab, and every 30 seconds. Disabling it hides the entry button and closes an open game. Bag Day works when this folder is physically absent. If a visitor has a stale enabled switch while the folder is gone, the launcher offers a safe return to Bag Day.

The root `game-launcher.js`, `game-launcher.css`, hidden button/layer markup and switch file form the small optional integration boundary. They can remain after the game is removed. They are not needed by the collection app's offline cache. Root service-worker exclusions keep game requests outside the app's cache.

## Entry and isolation

Every root opening or refresh shows normal Bag Day. Clicking the game button creates an iframe. Back to Bag Day destroys it and restores focus; it never saves game mode in the URL or settings. Opening `game/index.html` directly redirects to Bag Day. Parent/child communication consists only of ready and close messages, checked against the iframe and origin. While the game is open, the main app is inert and its active-use Support reminder clock is paused.

Game progress uses only `sort-belt-highest-unlocked-v1` in local storage. No game analytics are added. The own worker, scoped to `game/`, uses `sort-belt-game-1.0.35`; it only caches this folder's runtime files and illustrations. Core and game workers delete only their own cache prefixes. Game entry requires the live switch check; do not promise game availability offline.

## Gameplay

Organic is left, Mixed is middle, and Recyclables is right. Every item starts in the middle and falls naturally. Sideways pushes change lane; downward pushes accelerate it or send it to the bag. Upward movement is blocked. Untouched items are accepted into Mixed. Tap an item then a bag, or use left/right/down keys, as alternatives.

Timed rounds last one minute. At least 80% correct unlocks the next level; higher levels increase belt speed and introduce more items. Players can choose any unlocked level, choose level 1 without losing progress, or confirm a full progress reset. Relaxed practice has no timer and unlocks no levels. Backgrounding, resizing or pressing Pause stops the belt and timer.

The game uses 18 independently illustrated household items. Rules were checked against https://www.wastecollection.mt/ on 3 October 2026. Glass, batteries and other separate-disposal categories are excluded. Update the game's own `items.js` if official sorting guidance changes.

Version 1.0.32 enlarges game cards, object graphics, labels, bags, score and timer with compact-screen overrides. The timer has a Time left label. The Start at 1 shortcut is removed; level 1 remains available in the level selector. The glove is only an idle demonstration after more than eight seconds without clicks/touches, keys or scrolling; input immediately hides it and restarts the delay. It never appears during active dragging. Reduced-motion users do not get the animated demonstration.

Version 1.0.33 makes levels 1–10 freely selectable. Passing level 10 unlocks 11, then each passed higher level unlocks the next. The last selected level uses the game-only key `sort-belt-last-level-v1`; reset returns to level 1 while levels 1–10 remain available. The idle glove waits more than eight seconds and targets only a middle-lane item, starting at its image centre and showing the correct left, right or down gesture. It never moves the item. Without a middle-lane item it remains hidden until one arrives. Any interaction hides the cue; holding a touch also suppresses it.

Version 1.0.34 supersedes earlier glove timing: it waits six seconds after play begins/resumes or the last falling-object interaction. Tapping empty belt space, scrolling or using unrelated controls does not restart that wait. Touching/dragging/selecting a falling object hides the hint; while holding it, the hint remains suppressed, and release/cancel restarts the delay. Keyboard interaction with an object or sending a selected object to a bag also counts. If the middle lane is empty after the deadline, the cue waits and appears on the next middle-lane object without a new countdown.
