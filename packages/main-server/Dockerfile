FROM oven/bun:1-slim as base

FROM base as builder
WORKDIR /build
COPY . .
RUN bun install --frozen-lockfile
WORKDIR /build/packages/main-server
RUN bun build --compile --minify ./src/index.ts --outfile server
RUN bun build --minify ./src/client.ts --outdir ./dist


FROM debian:bullseye-slim as runner
WORKDIR /app
COPY --from=builder /build/packages/main-server/static ./static
COPY --from=builder /build/packages/main-server/dist ./static
COPY --from=builder /build/packages/main-server/server .
EXPOSE 3000
CMD ["./server"]