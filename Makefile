UGLIFY  = $(shell find node_modules -name "uglifyjs" -type f)
MOCHA   = $(shell find node_modules -name "mocha" -type f)
SWEET   = $(shell find node_modules -name "sjs" -type f)

all: adt.min.js

adt.min.js: clean
	@$(UGLIFY) adt.js > $@

clean:
	@rm -f adt.min.js

test: test/macros.js
	@$(SWEET) -r -m ./macros/index.js test/macros.sjs > test/macros.js
	@$(MOCHA) --ui tdd

.PHONY: clean test
