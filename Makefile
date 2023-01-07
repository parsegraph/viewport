DIST_NAME = viewport

SCRIPT_FILES = \
	src/carousel/index.ts \
	src/carousel/settings.ts \
	src/carousel/ActionCarousel.ts \
	src/carousel/graphDemo.ts \
	src/carousel/Carousel.ts \
	src/carousel/CarouselAction.ts \
	src/carousel/demo.ts \
	src/index.ts \
	src/demoDom.ts \
	src/navport/impulse.ts \
	src/navport/NavportMouseController.ts \
	src/navport/NavportCursor.ts \
	src/navport/NavportKeyController.ts \
	src/navport/displaymode/single.ts \
	src/navport/displaymode/fit.ts \
	src/navport/displaymode/fixed.ts \
	src/navport/displaymode/fullscreen.ts \
	src/navport/displaymode/menuless.ts \
	src/navport/displaymode/split.ts \
	src/navport/BurgerMenu.ts \
	src/navport/NavportImpulse.ts \
	src/navport/NavportWebOverlay.ts \
	src/navport/Navport.ts \
	src/navport/png.d.ts \
	src/navport/CameraFilter.ts \
	src/navport/InputController.ts \
	src/render.ts \
	src/showGraph.ts \
	src/png.d.ts \
	src/weboverlay.ts \
	src/htmldemo.ts \
	src/demo.ts \
	test/test.ts

EXTRA_SCRIPTS =

include ./Makefile.microproject
