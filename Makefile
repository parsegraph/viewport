DIST_NAME = viewport

SCRIPT_FILES = \
	src/index.ts \
	src/Viewport.ts \
	src/viewport/Input.ts \
	src/viewport/BurgerMenu.ts \
	src/viewport/Viewport.ts \
	src/viewport/CameraFilter.ts \
	src/demo.ts \
	test/test.ts

EXTRA_SCRIPTS =

include ./Makefile.microproject
