DIST_NAME = viewport

SCRIPT_FILES = \
	src/demo.ts \
	src/index.ts \
	src/navport/BurgerMenu.ts \
	src/navport/CameraFilter.ts \
	src/navport/InputController.ts \
	src/navport/NavportImpulse.ts \
	src/navport/NavportKeyController.ts \
	src/navport/displaymode/fit.ts \
	src/navport/displaymode/fixed.ts \
	src/navport/displaymode/menuless.ts \
	src/navport/displaymode/single.ts \
	src/navport/displaymode/split.ts \
	src/navport/displaymode/fullscreen.ts \
	src/navport/impulse.ts \
	src/navport/png.d.ts \
	src/navport/NavportCursor.ts \
	src/navport/NavportMouseController.ts \
	src/navport/Navport.ts \
	src/navport/NavportWebOverlay.ts \
	src/png.d.ts \
	src/render.ts \
	src/showGraph.ts \
	test/test.ts

EXTRA_SCRIPTS =

include ./Makefile.microproject
