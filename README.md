![GitHub Latest Version](https://img.shields.io/github/v/release/Aedif/tactical-grid?sort=semver)
![GitHub Latest Release](https://img.shields.io/github/downloads/Aedif/tactical-grid/latest/aedifs-tactical-grid.zip)
![GitHub All Releases](https://img.shields.io/github/downloads/Aedif/tactical-grid/aedifs-tactical-grid.zip)

# FoundryVTT - Tactical Grid

Provides settings to limit the display of the grid to a specific distance within the currently selected/hovered-over placeable or Measuring Tool, as well as provide distance measurements to all Tokens relative to a specific grid space.

https://user-images.githubusercontent.com/7693704/229789408-4da2e230-2791-437f-8f89-176b0bdaa9fd.mp4

## Settings

### World Settings

![settings1](https://user-images.githubusercontent.com/7693704/227632252-25ff2634-e65c-49eb-ac87-7e4515024c4e.png)
![settings2](https://user-images.githubusercontent.com/7693704/227632292-05986ed7-254a-48e0-a986-dc335521b8be.png)
![settings3](https://user-images.githubusercontent.com/7693704/227632324-0764188a-3d07-47ca-801a-111ecd70b715.png)
![settings4](https://user-images.githubusercontent.com/7693704/227632358-ffe77b68-dec9-4dd4-ba77-1a19638a2f5c.png)

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
- Display Distances
  - Calcualtes and displays distances for all visible Tokens relative to the currently controlled/hovered Token or any other grid space if mouse-clicked while the control is held.
- Display Distances (Grid Spacing)
  - Same as `Display Distances` but displays distances in grid space increments

## Token Settings

Global `Default Grid View Distance`, `Default Grid View Shape`, and `Color` can be overriden for each Token by going to vision settings:

![image](https://user-images.githubusercontent.com/7693704/222382319-a22fcebc-2a9b-4957-a783-4e58d9fdc2bb.png)

## Scene Setting

Module allows for the core Foundry's default grid width to be adjusted:

![image](https://user-images.githubusercontent.com/7693704/222383155-24f6a9ac-bb2c-4658-bbe9-9d3bea6ed32f.png)

## @DEVs

Refer to [Wiki](https://github.com/Aedif/tactical-grid/wiki) about running the module and adding system/module support.
