import type { ServerWebSocket } from "bun";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import {
  PresenceMessageParser,
  SetImageParser,
  RegistrationParser,
} from "./types";
import { DatabaseConnection } from "./database";
import { Upload } from "@aws-sdk/lib-storage";
import { S3Client } from "@aws-sdk/client-s3";
import { logger } from "hono/logger";

const app = new Hono({});
const conn = new DatabaseConnection();

// @ts-ignore -- bun is ok with this
await conn.migrate();

const s3 = new S3Client({
  credentials:
    (process.env.S3_ACCESS_ID &&
      process.env.S3_ACCESS_KEY && {
        accessKeyId: process.env.S3_ACCESS_ID,
        secretAccessKey: process.env.S3_ACCESS_KEY,
      }) ||
    undefined,
  region: process.env.S3_REGION,
});

app.use("*", logger());
app.get("/", serveStatic({ path: "./static/index.html" }));
app.get(
  "/static/*",
  serveStatic({
    root: "./",
  }),
);

app.post("/register", async (c) => {
  const body = RegistrationParser.safeParse(await c.req.json());
  if (!body.success) {
    return new Response(
      JSON.stringify({ error: "invalid body", reason: body.error }),
      {
        status: 400,
      },
    );
  }

  const [{ token }] = await conn.register(body.data.username);

  return new Response(JSON.stringify({ token }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
});

app.get("/image/:name", async (c) => {
  const name = c.req.param("name");
  if (!name) {
    return new Response(null, {
      status: 404,
    });
  }

  const { image_url } = (await conn.getUserImage(decodeURIComponent(name))).at(
    0,
  ) ?? { image_url: null };
  if (!image_url) {
    return new Response(null, {
      status: 404,
    });
  }

  return new Response(JSON.stringify({ url: image_url }), {
    status: 200,
  });
});

app.post("/image", async (c) => {
  const body = SetImageParser.safeParse(await c.req.parseBody());
  if (!body.success) {
    return new Response(
      JSON.stringify({ error: "invalid body", reason: body.error }),
      {
        status: 400,
      },
    );
  }

  const token = body.data.token;
  const user = await conn.getUserByToken(token);
  if (!user) {
    return new Response(JSON.stringify({ error: "invalid token" }), {
      status: 403,
    });
  }

  const image = body.data.image;
  if (image.size > 1024 * 1024 * 5) {
    return new Response(JSON.stringify({ error: "image too large" }), {
      status: 413,
    });
  }

  if (image.size == 0) {
    return new Response(JSON.stringify({ error: "image too small" }), {
      status: 400,
    });
  }

  // upload to s3
  const upload = await new Upload({
    client: s3,
    params: {
      Bucket: process.env.S3_BUCKET ?? "",
      Key: `avatars/${token}`,
      Body: image.stream(),
    },
  }).done();

  if (!upload.Location) {
    return new Response(JSON.stringify({ error: "upload failed", upload }), {
      status: 500,
    });
  }

  await conn.setUserImageByToken(token, upload.Location);

  return new Response(JSON.stringify({ url: upload.Location }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
});

app.get("/ws", (c) => {
  if (!c.env) {
    const res = new Response(JSON.stringify({ error: "could not upgrade" }), {
      status: 503,
    });
    return res;
  }
  if (typeof c.env.upgrade !== "function") {
    const res = new Response(JSON.stringify({ error: "could not upgrade" }), {
      status: 503,
    });
    return res;
  }
  const result = c.env.upgrade(c.req.raw, { data: c.req.raw });
  return result;
});

export default {
  port: parseInt(process.env.PORT ?? "3000"),
  websocket: {
    idleTimeout: 10,
    open(ws: ServerWebSocket<Request>) {
      ws.subscribe("presence");
      console.log(ws.data);
    },
    message(ws: ServerWebSocket<Request>, message: string) {
      const msg = PresenceMessageParser.safeParse(JSON.parse(message));
      if (msg.success) {
        if (!msg.data.position && !msg.data.message) {
          return; // don't send useless data
        }
        ws.publish("presence", JSON.stringify(msg.data));
      }
    },
    close(ws: ServerWebSocket<Request>) {
      ws.unsubscribe("presence");
    },
  },
  fetch: app.fetch,
};
