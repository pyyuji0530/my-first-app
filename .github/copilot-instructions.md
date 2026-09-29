# Repository guidance

## Build, test, and run

There is no package manifest or configured build, test, or lint command. To run the game, open `index.html` in a browser, or serve the repository with `python3 -m http.server 8000` and visit `http://localhost:8000`. There is no automated test suite or single-test command.

## Architecture

- This is a static browser game: `index.html` loads `style.css` and defers `game.js`; there is no framework, bundler, or module system.
- `game.js` owns the game state, input, physics, collisions, enemy behavior, drawing, and animation loop. The canvas has a fixed 960×540 game coordinate space; CSS scales it responsively.
- `update(delta)` advances simulation state, while drawing functions render the background, world, HUD, and end-state overlay. The animation frame caps `delta` to keep large frame gaps from destabilizing movement.
- World objects use world coordinates. `cameraX` follows the player; background layers use slower parallax offsets, and `drawWorld()` applies the camera translation. HUD and overlays stay in canvas coordinates.
- `style.css` handles page layout, responsive sizing, and touch controls. Touch buttons are declared in the HTML and connect to the same game actions as keyboard input.

## Code conventions

- ユーザー向けの説明は日本語で表示すること。
- Keep gameplay tuning constants and level geometry near the top of `game.js`. Platforms and starting enemy positions are data arrays; `resetGame()` reconstructs mutable enemy state and resets the player and run state.
- Keep simulation and rendering separate. Add world-space drawing inside the translated world pass, and screen-space UI in the HUD or overlay pass.
- Normalize keyboard and touch input through `isDown()` and the `keys`/`touchControls` sets. Keyboard bindings use `KeyboardEvent.code`; touch buttons use matching `data-control` values. Update both the input mapping and visible controls when adding a player action.
- The page and in-game copy are primarily Japanese; preserve that language and the existing semantic HTML labels when updating player-facing text or controls.
