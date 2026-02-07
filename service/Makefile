.PHONY: build-lambda clean

build-lambda: clean
	mkdir -p build
	GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o build/bootstrap cmd/todo/main.go
	cd build && zip todo.zip bootstrap && rm bootstrap


clean:
	rm -rf build/*.zip build/bootstrap
