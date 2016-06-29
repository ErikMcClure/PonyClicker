# Pony Clicker Change Log
This is the change log for Pony Clicker. Some minor changes may not be reflected in this log.

## v1.0.7
- Cupcake dialog no longer tries to use HTML (Resolve #98)
- The import function replaces unicode quotes with ascii quotes now (Resolve #99)
- Fixed #100 alignment issue by manually specifying width.

## v1.0.6
- Added function to generate names for all possible representable numbers
- Fixed bug in loading code that could incorrectly calculate the wither amount for pinkie pie clones.
- Getting Infinite smiles no longer crashes the game
- Attempting to load infinite smiles no longer crashes the game.

## v1.0.5
- change rotate to rotateZ

## v1.0.4
- Minor typo fixes
- Cache SVG images to prevent webpage from melting CPUs

## v1.0.3
- Fix stupid off-by-one error (Resolve #85) 
- Added Math.floor() for calculating costs to reduce confusion
- Do not key off of animation frames (Resolve #81)
- Fix upgrade off-by-one error (Resolve #90)
- Made highlight efficient option work on disabled items (Resolve #83)
- Improved some CSS
- Added option to view entire circle (Resolve #71)

## v1.0.2
- Added popped pinkies counter
- Added predicted cupcakes gained to Reset dialog

## v1.0.1
- Reset() generates a new randomized pony list
- Going past 58 ponies doesn't break the store

## v1.0
- Reorganized javascript code
- Added index.html redirection to ponyclicker.html
- Introduced utilities/analysis.html
- Drastically lowered boop count requirements for achievements
- Completely rebalanced building SPS formulas (Resolve #28)
- Moved muffin upgrades to late game
- Added store icons
- use strict javascript (I wish I knew about this earlier)
- Added a ton of upgrades, change upgrades to use explicit IDs
- Added option to make the most efficient store purchase tinted green
- Introduced end-game event (Resolve #27)
- Re-introduced prestige system using cupcakes

## v0.89
- Cut late game costs to help compensate for upgrade adjustment

## v0.88
- Implemented basic mobile interface
- Players now boop ponies instead of click them (Resolve #38)
- Added choice to show numbers as names, scientific notation, or long form (Resolve #61)
- You can now use both ctrl and shift to bulk buy to deal with firefox (Fix #62)
- Muffin counts displayed on achievements.
- Fix pluralization on achievements.
- Overlay now has a timer saying when you will be able to buy something (Resolve #60)
- Upgrade system overhauled into buckets (Resolve #34)
- Upgrade list is now sorted
- Added a lower bound check to address precision issues (Resolve #42)
- Boosted muffin bonus to compensate for new upgrade system

## v0.87
- Fixed memory leak

## v0.86
- Fix timer so it uses the delta properly when tab isn't visible.
- Rewrite everything in jQuery (SeinopSys)
- Implement automatic version check (Resolve #31)
- Fix a gajillion subtle bugs
- Fixed store overlay information list
- Fixed #23: Incorrect Achievements count

## v0.85
- It turns out a centillion isn't what i thought it was. Removed from large number list.
- Fixed bug where shift-clicking let you buy more friendships than physically possible.
- Fixed #2 regression, where getting a muffin from an achievement wouldn't update your SPS
- Fixed bug where multiple rows of upgrades would not display an overlay properly
- Fixed bug where buying an upgrade didn't update the overlay correctly
- The game now checks the entire achievement list on load to support adding achievements later
- Fixed bug with upgrade list that wouldn't show any tooltip past index 11

## v0.84
- Rapidly changing numbers now have a fixed number of decimal places (MaxLaumeister)
- Use Open Sans everywhere and fix font CSS (ngyikp)
- Fixed #19: Scrolling past game area
- Fixed #9: Grand Galloping Gala and Coronation prices inverted
- Nerfed the hell out of impossible store achievements (See #16: Literally unreachable achievements)

## v0.83
- Fixed #13: Pony clicks and buildings owned won't update on loading saved data
- Fixed regression in how menu SPC was being updated
- Added analytics

## v0.82
- Added changelist
- Fixed #2: Tooltip displays wrong value
- Fixed #3: SPC on menu is based on hovering value
- Fixed #5: Notices are covering tooltips
- Fixed #15: Redundant display line in "Friendship" tooltip
- Removed Reset functionality entirely (see #11: "Reset" doesn't add Muffins)
- Fixed formula and renamed two achievements

## v0.81
- Emergency fix for SPC hover bug

## v0.8
- Initial public release
