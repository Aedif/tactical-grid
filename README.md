![GitHub Latest Version](https://img.shields.io/github/v/release/Aedif/tactical-grid?sort=semver)
![GitHub Latest Release](https://img.shields.io/github/downloads/Aedif/tactical-grid/latest/aedifs-tactical-grid.zip)
![GitHub All Releases](https://img.shields.io/github/downloads/Aedif/tactical-grid/aedifs-tactical-grid.zip)

# FoundryVTT - Tactical Grid

Provides settings to limit the display of the grid to a specific distance within the currently selected/hovered-over placeable or Measuring Tool.

https://user-images.githubusercontent.com/7693704/220378850-b492165a-e10f-4110-b8e9-1f95e07c66e1.mp4

## Settings

### World Settings
![settings1](https://user-images.githubusercontent.com/7693704/223280699-9058d13a-a288-4a4b-b757-3bc4d2051f2f.png)
![settings2](https://user-images.githubusercontent.com/7693704/223280755-9051066f-9bf6-4f96-b482-46265ca26bdf.png)
![settings3](https://user-images.githubusercontent.com/7693704/223280801-57925ae1-e551-4973-ba88-5c6cf79769c2.png)

### Client Settings

- Display Distances on Ruler Drag
  - When enabled distances between the leading point of the ruler and all visible Tokens will be calculated and displayed on them
- Ruler: Grid Spaces
  - Calculate Ruler triggered distance measurements in grid space increments
  
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

