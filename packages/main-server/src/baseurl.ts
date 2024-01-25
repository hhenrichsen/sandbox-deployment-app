export function getBaseUrl() {
  return process.env.BASE_URL || "localhost:3000";
}

export function getProto() {
  return process.env.PROTO || "http";
}
