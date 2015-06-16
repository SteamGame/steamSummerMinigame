# Steam Summer Monster Minigame Script #

[![forthebadge](http://forthebadge.com/images/badges/fuck-it-ship-it.svg)](http://forthebadge.com) [![Build Status](https://travis-ci.org/SteamDatabase/steamSummerMinigame.svg?branch=master)](https://travis-ci.org/SteamDatabase/steamSummerMinigame)

## Features ##

This is a script that plays the [Monster Summer Game](http://steamcommunity.com/minigame/) for you. It has a lot of features, and the most important are:
* Auto buy DPS and click upgrades if they are cost-effective
* Lock elemental for more team DPS
* Auto clicking
* Auto use damage and healing abilities
* Options box
* Reduced memory-leak
* Room indicator
* Expected level indicator
* Moves you to the lane most that gives you most gold
* Disable certain abilities if fighting a boss
* Auto respawn
* Auto heal

## Installation ##

### Tampermonkey ###

1. Open Tapermonkey's dashboard.
2. Click on the `Utilities` tab on the right.
3. Paste `https://raw.githubusercontent.com/SteamDatabase/steamSummerMinigame/master/autoPlay.user.js` into the text area, and click `Import`.
4. When the editor has loaded, click `Install` (*NOT* `Process with Chrome`).

### Greasemonkey ###

1. Navigate to `https://raw.githubusercontent.com/SteamDatabase/steamSummerMinigame/master/autoPlay.user.js`.
2. Right click on the page, and click `Save Page As`.
3. While Firefox is still open, open a File Manager of any sort, and navigate to the directory you saved the script.
4. Drag & drop the script file onto the Firefox window.
5. Press `Install`.

### Manual ###

##### Chrome #####
1. Open https://raw.githubusercontent.com/SteamDatabase/steamSummerMinigame/master/autoPlay.user.js
2. Select All, Copy.
3. Navigate to `http://steamcommunity.com/minigame/` and join or start a game.
4. Press `Ctrl + Shift + J`.
5. Paste into the javascript input, and hit `Enter`.

##### Firefox #####
1. Open https://raw.githubusercontent.com/SteamDatabase/steamSummerMinigame/master/autoPlay.user.js
2. Select All, Copy.
3. Navigate to `http://steamcommunity.com/minigame/` and join or start a game.
4. Press `Ctrl + Shift + K`.
5. Paste into the javascript input, and hit `Enter`.

##### Internet Explorer / Microsoft Edge #####
1. Open https://raw.githubusercontent.com/SteamDatabase/steamSummerMinigame/master/autoPlay.user.js
2. Select All, Copy.
3. Navigate to `http://steamcommunity.com/minigame/` and join or start a game.
4. Press `F12` and navigate to the `Console` tab.
5. Paste into the javascript input, and hit `Enter`.

To stop the manual script, type `window.clearTimeout(window.SteamDB_Minigame_Timer);` into the console and hit `Enter`.

The game should now play itself, you should leave it running in the background. If you're not sure if it is auto-playing, try changing lanes. If it jumps back almost immediately, it's working.

## I want to contribute! ##

This project is open-source on github. There are different ways you can help:

- Find a Pull Request that's marked `needs testing`. Run that version of the script for a while and watch the console for errors. If there's no errors, pay attention to what the changes are doing gameplay-wise, and make sure it's doing what it's supposed to do.
- Find an Issue that's marked `help wanted`. Make the changes needed by that issue, and create a Pull Request with your enhancement or bugfix.
- Pick an item off the TODO list, below, and implement it. When it's done (and tested and working), create a Pull Request.
- Got an idea for an improvement that's not already listed? Code it up, test it out, then make a Pull Request when it's ready.

### Pull Request Guidelines ###

- Do NOT change the script version in your PR as it could be incremented before your PR is merged.
- Test your changes both in console and Greasemonkey/Tampermonkey.
- Squash your commits before submitting the PR.
