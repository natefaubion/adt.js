UGLIFY  = $(shell find node_modules -name "uglifyjs" -type f)
MOCHA   = $(shell find node_modules -name "mocha" -type f)

all: adt.min.js

adt.min.js: clean
	@$(UGLIFY) adt.js > $@

clean:
	@rm -f adt.min.js

test:
	@$(MOCHA) --ui tdd

.PHONY: clean test
