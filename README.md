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
  
## Controls
  
- Toggle Grid on Current Layer
  - When pressed the "{layer name} Layer" setting will be toggled for the currently active layer

## Token Settings

Global `Default Grid View Distance` and `Default Grid View Shape` can be overrided for each Token by going to vision settings:

![image](https://user-images.githubusercontent.com/7693704/220395236-ac4fd117-bc65-499a-a010-aff7d537a518.png)
