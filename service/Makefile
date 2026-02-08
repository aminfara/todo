.PHONY: build-lambda lint-format clean

build-lambda: clean
	mkdir -p build
	GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o build/bootstrap cmd/todo/main.go
	cd build && zip todo.zip bootstrap && rm bootstrap


lint-format:
	golangci-lint-v2 run --fix


clean:
	rm -rf build/*.zip build/bootstrap
