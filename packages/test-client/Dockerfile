FROM oven/bun:1-slim as base

FROM base as builder
WORKDIR /build
COPY . .
RUN bun install --frozen-lockfile
WORKDIR /build/packages/test-client
RUN bun build --compile --minify ./src/index.ts --outfile client

FROM debian:bullseye-slim as runner
WORKDIR /app
COPY --from=builder /build/packages/test-client/client .
CMD ["/app/client"]