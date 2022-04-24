# viewport

### TODO's

* TODO Add gridX and gridY camera listeners, with support for loading from an
infinite grid of cells.

* TODO Add camera-movement listener, to let nodes watch for camera movement,
and thus let nodes detect when they are approaching critical screen
boundaries:

enteringScreen leavingScreen

Node distance is radially calculated (using the viewport's diagonal) from
the camera's center, adjusted by some constant.

hysteresis factor gives the +/- from some preset large distance (probably
some hundreds of bud radiuses). Ignoring hysteresis, then when the camera
moves, the node's relative position may be changed. This distance is
recalculated, and if it is above some threshold plus hysteresis constant,
and the node's state was 'near', then the node's leavingScreen is called,
and the node's state is set to 'far'.

Likewise, if the distance is lower than the same threshold minus hysteresis
constant, and the node's state was 'far', then the node's enteringScreen is
called, and the node's state is set to 'near'.

This distance is checked when the node is painted and also when the camera
is moved.

* TODO Figure out how changing the grid size might change things.

Grid updates based only on camera movement. Updates are reported in terms of
cells made visible in either direction.  The number of potentially visible
grid cells is determined for each axis using the camera's axis size
adjusted by some constant.
