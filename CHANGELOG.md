# 1.30.0

**PF2e**

- Hovering over an item on the actor sheet strike action list will now properly trigger range highlighting if enabled
- Fixed range highlighting for items with a 'reach' trait

**Misc.**

- New toggle added to Token Controls: `Broadcast Measurements`
  - When active measurements made by the GM via TG will be broadcast to all other users

# 1.28.0

- DC20 system support

# 1.27.2

- Removed `Grid Line Width` controls for Foundry v12 as it is now natively supported

# 1.27.1

- Typo fix

# 1.27.0

- Foundry v12 support
- Added a control (`Toggle Range Highlighter`) and a setting (`Enable Range Highlighter`) to toggle `Range Highlighter` on and off for the client.
- Fixed distance marker getting stuck during Token drag if range highlighting is enabled
- Fixed `Precision` settings not being applied on PF2e gridless scenes.

# 1.26.0

**Range Highlighter**

- PF2e Item/Action macro support

# 1.25.1

- Fixed `Token Range Highlighter` for Dnd5e >=3.0.0

# 1.25.0

- Removed `Alternative Token Visibility` as a `Cover Calculator` option
- Fixed errors thrown when `Alternative Token Cover` is chosen as a `Cover Calculator` option
- Distance measurements and cover will no longer be shown on Tokens with `Secret` dispositions
- Partial metric support for `Item/Token Range Highlighter`

# 1.24.1

- Hex distance calculation improvements
- DnD5e >=3.0.0 item range highlight fixes
  - Thrown melee weapons will now include melee, short, and long range

# 1.24.0

- **Distance Measurement**

  - Now takes into account token volume (token z-axis height is assumed to be the same as its y-axis height)
  - On a square grids diagonal and double-diagonal movement multipliers can now be configured
    - Diagonals (grid-space moves in x and y direction) are 1.5x by default (equivalent to 5/10/5 rule)
    - Double-diagonals (grid-space moves in x, y, and z direction) are 1.75 by default
  - On gridless scenes with `Gridless: Circle Border` setting enabled, the module will consider tokens to be cylindrical
  - Fixed point to token measurements on gridless scenes
  - Fixed measurements returning as zero when dragging a token over another
  - On PF2e, token-to-token measurements will be delegated to the system provided `distanceTo` function

- **Range Highlighter**

  - Permanent highlights can now be setup via `ranges` flag
    - e.g. `_token.document.setFlag('aedifs-tactical-grid', 'ranges', [ {range: 10, lineColor: '#00ff00', lineWidth: 2, lineAlpha: 0.4, id: "MyCustomAura" }])`
    - e.g. `_token.document.unsetFlag('aedifs-tactical-grid', 'ranges')`
    - Highlights setup via flags will be visible to all players
  - New setting `Range` > `Token` > `Dispositions Highlighted for Players`
    - Players will only see reach highlights for owned tokens or tokens with dispositions selected here

- **Cover**
  - New setting: `Combat Only`
    - When enabled cover will only be calculated in active combat

# 1.23.1

- Courtesy of [CarlosFdez](https://github.com/CarlosFdez) PF2e range highlighting now supports [10ft reach](https://2e.aonprd.com/Rules.aspx?ID=352) measurement exception

  `Unlike with measuring most distances, 10-foot reach can reach 2 squares diagonally. Reach greater than 10 feet is measured normally; 20-foot reach can reach 3 squares diagonally, 30-foot reach can reach 4, and so on.`

# 1.23.0

- While dragging a ruler originating at a token the module will use clone of the token to perform cover calculations and take into account elevation
  - Clicking on the canvas while holding the `Display Distances` control will do the same

# 1.22.1

- Improved snapping behaviour
- Fixed debugger reporting wrong position

# 1.22.0

- Distance display on Token drag no longer requires `Drag Ruler`
- Improved range highlighting of PF2e melee weapons
- Range highlighting should now automatically toggle off on combat end

Module support:

- `Alternative Token Cover`
- `Elevation Ruler`
- `Token Action HUD PF2e` (courtesy of Silvertower)

# 1.21.0

**Range Highlighter**

- DnD5e
  - Throwable melee weapons will no longer display their throw range on Token hover
  - Hovering over Item Macros on the macro bar will now trigger Item Highlighting if enabled

# 1.20.0

- Highlight optimizations on square grids
- Support for custom fonts

# 1.19.4

**Range**

- Crucible system support; Weapons and Strike action

# 1.19.3

- Fixed Item RangeHighlight snot disabling properly in and out of combat

# 1.19.2

**Range**

- Highlights during Token drag will now show ranges based off of snapped Token position
- Highlight calls are now throttled on square and hex scenes
- Module support:
  - Action Pack
  - Argon - Combat HUD
  - Token Action HUD

# 1.19.1

- Fixed range highlight not clearing on token destroy

# 1.19.0

- New settings: `Range`
  - Allows on-hover token and item range highlighting

**API**

- Accessed either via `TacticalGrid` or `game.modules.get("aedifs-tactical-grid").api`
- `TacticalGrid.rangeHighlight(...)`

```js
/**
 * Highlights ranges around the token using either the supplied range values or automatically calculated system specific ranges if only a token or a token and an item are provided.
 * @param {Token} token                                  Token to highlight the ranges around
 * @param {Array[Number]|Array[Object]|null} opts.ranges Array of ranges as numerical values or objects defining the range and look of the highlight
 *                                                        e.g. [5, 30, 60]
 *                                                        e.g. [ {range: 30, color: '#00ff00', alpha: 0.1, lineColor: '#00ff00', lineWidth: 2, lineAlpha: 0.4, shrink: 0.8, }]
 * @param {Item} opts.item                               Item to be evaluated by the system specific range calculator to determine `ranges` automatically
 * @param {Boolean} opts.roundToken                      If `true` the token will be treated as a circle instead of a rectangle on gridless scenes
 * @returns {null}
 */
static rangeHighlight(token, { ranges, roundToken = MODULE_CONFIG.range.roundToken, item } = {})
```

- `TacticalGrid.clearRangeHighlight(...)`

```js
/**
 * Clears highlights applied using TacticalGrid.rangeHighlight(...)
 * @param {Token} token Token to remove the highlights from
 */
static clearRangeHighlight(token)
```

# 1.18.6

- Fixed Templates disappearing and measurements returning as NaN when dragging a Template with `Drag Ruler` module active

# 1.18.5

- Deprecation warning fix
- Measurements on Gridless Scenes now default to Shortest Distance Only

# 1.18.4

- Fixed overlapping tokens not taking into account elevation during distance measurements
- Fixed `Gridless: Circle Border` causing overlapping tokens with same elevation to measure non-zero distances

# 1.18.3

- Fixed origin token not being picked up on gridless scenes

# 1.18.2

- `Settings` > `Cover` > `Cover Calculator` : `MidiQOL`

  - No longer requires game reload to take effect after the setting is changed.

- Drag Ruler: Fixed cover calculations being offset on tokens larger than 1x1
- `CONFIG.debug.atg = true`
  - Shows the location that the cover calculations are actually being done from

# 1.18.1

- `Display Distance` keybindings will now override `Display Distance on Ruler Drag` and `Display Distance on Token Drag` settings

# 1.18.0

- New client setting: `Display Distances on Token Drag`
  - Only available when `Drag Ruler` module is installed
  - When enabled perform distance measurement calculations between the dragged token and all other visible tokens
- Errors thrown by cover calculator modules should no longer break token drag
- Tactical Grid marker will no longer be shown during ruler/token drag

# 1.17.1

- Fixed errors thrown when `Alternative Token Vision` is set as cover calculator

# 1.17.0

- New option: `Settings` > `Measurement` > `Ignore Tokens with Effect`
  - Tokens with matching effect name to this option will be ignored during distance/cover calculations
- Measurement/Cover Support for Vision5e's imprecise sense
- Added `PF2e Perception` module as one of the cover calculator options courtesy of **@ChasarooniZ**
- Japanese Translation courtesy of **@doumoku**
- Fixed grid snapping on token drag resulting in cover calculations changing on mouse release

# 1.16.0

- New option: `Settings` > `Cover`

  - Allows to specify a cover calculator module and labels to be used to indicate different levels of cover when performing measurements
  - Supported modules: `Simbul's Cover Calculator`, `Levels Auto Cover`, and `Alternative Token Visibility`

- API
  - `game.modules.get("aedifs-tactical-grid").api`
  - `highlightReach(token, ranges)`
    - Highlights grid for the provided token using an array of reach ranges
    - `token` the token you want the reach to be drawn for
    - `ranges` an array of reach ranges and colors
      - e.g. [{reach: 5, color: "#00ff00"}, {reach: 10, color: "#0000ff", alpha: 0.3}]
  - `clearReach(token)`
    - clears/removes drawn reaches using `highlightReach(...)`

# 1.15.1

- Implemented a workaround for `SquareGrid._drawLine` now being a private function on v11. `Grid Line Width` option should now work as intended.

# 1.15.0

- New option: `Measurement` > `Scale Font Size to Canvas Grid`
  - Enabled scaling of the distance measurement text based of scene's configured `Grid Size`
- New option `Measurement` > `Base Grid Size`
  - Grid larger or smaller than this value will result in `Measurement` > `Font Size` being scaled proportionally

# 1.14.1

- v11 support

# 1.14.0

- New setting: `Grid` >`Token Property`
  - Define a path to the token property to be used as the view distance
- New setting: `Grid` > `Use Token Property Based Distance`
  - Toggle between `Default Grid View Distance` and `Token Property` settings

# 1.13.0

- New client setting: `Disable Tactical Grid`
  - Disabled tactical grid per client

# 1.12.0

Measurement Tool

- Replaced `Measure to Token center only` option with `Shortest Distance Only`
  - Instead of measuring distance to the centre of the token, the module will either:
    - Find the closest occupied Token grid space (Square/Hex grid)
    - Find the closest point on the Token border (Gridless)
  - Sub-option: `Gridless: Circle Border`
    - If your system displays Token borders on a gridless scene as a circle, this options will make the module calculate distances to that circle's edge.
- Fixed some random errors in the console
- Fixed a bug causing ruler measurements to show up on other player clients
- When using `Drag Ruler` module, measurements during a drag operations will now properly take into account token size

# 1.11.1

- Measurement Tool
  - Added `Drag Ruler` module support

# 1.11.0

Measurement Tool

- Support for 'Hex token size support' module
- Support for gridless scenes
- New option to exclude elevation in calculations
- New option to measure distances to token centre only
- New options to customize the 'origin' marker
  - Color, Border, Alpha

# 1.10.0

- Added measurement support for Hexadecimal grids

# 1.9.0

- New world settings to customizes the look of measured distances
  - Measurement > `Precision`
  - Measurement > `Font Family`
  - Measurement > `Font Size`
  - Measurement > `Color`
- During `Ruler` drag and `Display Distances` key press, the hovered over Token's elevation will now be picked up and used in the distance calculation
- Fixed interactions with Layers added by other modules

# 1.8.0

- Reworked settings into a neater `Tactical Grid Settings` form
- Disposition based grid colors can now be configured via a UI
- New world settings:
  - Ruler > `View Distance`
  - Ruler > `View Shape`
  - Ruler > `Color`
    - Token equivalents specific to the Ruler
- New client settings
  - `Display Distance on Ruler Drag`
    - When enabled distances between the leading point of the ruler and all visible Tokens will be calculated and displayed on them
  - `Ruler: Grid Spaces`
    - Ruler triggered distance measurements will be calculated grid space increments

# 1.7.1

- Improved distance accuracy when measuring elevated tokens

# 1.7.0

New Controls

- Display Distances
- Display Distances (Grid Spacing)
  - When when held the module will display relative distances for all tokens currently visible on the screen
  - If a single token is under control when the key is pressed the origin of these distances will be that token
  - While the key is held you can click anywhere on the map to change the origin of these measurements (indicated by a red square)
  - At the moment only Square grids are properly supported

* General bug fixes

# 1.6.0

- Added scene specific Tactical Grid toggle
  - Triggered either by long pressing the old `Toggle Grid on Current Layer` key
  - Or assigning a new key to the `Toggle Grid on Current Layer (Scene)` control

# 1.5.1

- Bad accessor fix

# 1.5.0

- New settings

  - Default Color: Disposition - Will assign Red, Green, and Blue view shape colors based on Token disposition
  - Can be viewed and changed via:

    `game.settings.get('aedifs-tactical-grid', 'dispositionColors')`

    `game.settings.set('aedifs-tactical-grid', 'dispositionColors', {playerOwner: 0x00ff00, friendly: 0x00ff00, neutral: 0x0000ff, hostile: 0xff0000})`

  - Mix Colors
    - When enable instead of view shape colors overriding each other they will be blended

- New Token option
  - Tactical Grid: Color
    - Assigns a color to the view shape of this token
- New Scene option
  - Tactical Grid: Grid Line Width
    - Changes the default grid line width

# 1.4.2

- Fix null value reads during layer activation

# 1.4.2

- PF2e compatibility fix

# 1.4.1

- Initial public release
