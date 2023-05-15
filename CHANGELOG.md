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
