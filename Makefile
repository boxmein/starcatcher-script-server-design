# A quick makefile
# Gets a bit crazy, otherwise
# Assumes you've got all the dependencies though :/ 


CLOSURE_COMPILER=$HOME/Programs/closure-compiler/compiler.jar
TEMPLATES=partials/edit-submit-view._template list-item._template script._template

.PHONY: all

clean: 
	rm index.html
	rm index.css
	rm *.map
	rm main.min.js
	rm intermediate.css

index.html: index.jade layout.jade $(TEMPLATES)
	jade index.jade

index.css: intermediate.css
	myth intermediate.css index.css

intermediate.css: 
	sass index.scss intermediate.css --sourcemap=none

all: clean index.html index.css main.min.js

