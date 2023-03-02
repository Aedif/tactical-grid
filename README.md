![GitHub Latest Version](https://img.shields.io/github/v/release/Aedif/tactical-grid?sort=semver)
![GitHub Latest Release](https://img.shields.io/github/downloads/Aedif/tactical-grid/latest/aedifs-tactical-grid.zip)
![GitHub All Releases](https://img.shields.io/github/downloads/Aedif/tactical-grid/aedifs-tactical-grid.zip)

# FoundryVTT - Tactical Grid

Provides settings to limit the display of the grid to a specific distance within the currently selected/hovered-over placeable or Measuring Tool.

https://user-images.githubusercontent.com/7693704/220378850-b492165a-e10f-4110-b8e9-1f95e07c66e1.mp4

## Settings

- Grid Enable: Controlled
  - Grid will be shown for controlled placeables.
- Grid Enable: Hover
  - Grid will be shown for hovered over placeables.
- Grid Enable: Combat Only
  - Grid will only be shown when in combat.
- Default Grid View Distance
  - Number of grid spaces to be displayed.
- Default Grid View Shape
  - The shape of the grid mask.
    - Circle
    - Circle (Soft)
    - Square
    - Square (Soft)
    - Hexagon (Row)
    - Hexagon (Column)
- Ruler
  - Enabled grid for Ruler Measurements (requires libWrapper to be active)
- {layer name} Layer
  - Enable tactical grid for this layer
  
### Color Settings

- Default Color: Disposition
  - Token view shape colors will default to their disposition
  - `game.settings.get('aedifs-tactical-grid', 'dispositionColors')`
- Mix Colors
  - Instead of view shape colors overriding each other when they overlap, they will get blended into a new color
  
## Controls
  
- Toggle Grid on Current Layer (Global)
  - When pressed the "{layer name} Layer" setting will be toggled for the currently active layer
  - Long press will toggle the layer setting just for the current scene
- Toggle Grid on Current Layer (Scene)
  - When pressed the layer will be toggled just for the current scene

## Token Settings

Global `Default Grid View Distance`, `Default Grid View Shape`, and `Color` can be overriden for each Token by going to vision settings:

![image](https://user-images.githubusercontent.com/7693704/222382319-a22fcebc-2a9b-4957-a783-4e58d9fdc2bb.png)

## Scene Setting

Module allows for the core Foundry's default grid width to be adjusted:

![image](https://user-images.githubusercontent.com/7693704/222383155-24f6a9ac-bb2c-4658-bbe9-9d3bea6ed32f.png)

