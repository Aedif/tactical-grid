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
