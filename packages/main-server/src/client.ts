import { getBaseUrl, getProto } from "./baseurl" with { type: "macro" };
import { PresenceMessageParser } from "./types";

const id = localStorage.getItem("username") ?? `User ${Math.random() * 1000}`;
localStorage.setItem("username", id);
const token = localStorage.getItem("token");
if (token) {
  document.getElementById("register")!.style.visibility = "hidden";
  document.getElementById("set-image")!.style.visibility = "visible";
}

const baseUrl = getBaseUrl();
let socket: WebSocket | undefined;

const goalState: Record<
  string,
  { position: { x: number; y: number }; lastSeen: number }
> = {};

function init() {
  let s = new WebSocket(`ws://${baseUrl}/ws`);

  s.addEventListener("open", () => {
    console.log("connected");
    socket = s;
  });

  s.addEventListener("message", (event) => {
    const parsed = PresenceMessageParser.safeParse(JSON.parse(event.data));
    if (!parsed.success) {
      return;
    }

    const { userId, position } = parsed.data;
    if (!goalState[userId]) {
      goalState[userId] = {
        position: { x: 0, y: 0 },
        lastSeen: Date.now(),
      };
    }
    goalState[userId].lastSeen = Date.now();

    if (!position) {
      return;
    }

    goalState[userId].position = position;

    let el: HTMLElement | null = document.getElementById(userId);
    if (!el) {
      el = document.createElement("div");
      el.id = userId;
      el.classList.add("cursor");
      const img = document.createElement("img");
      const randomColor = Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0");
      el.style.backgroundColor = `#${randomColor}`;
      el.appendChild(img);
      document.body.appendChild(el);

      fetch(`${getProto()}://${baseUrl}/image/${encodeURIComponent(userId)}`)
        .then((res) => res.json())
        .then(({ url }) => {
          img.src = url;
        });
    }
    el.style.transform = `translate(${position.x * document.documentElement.clientWidth}px, ${position.y * document.documentElement.clientHeight}px)`;
  });

  s.addEventListener("close", () => {
    console.log("disconnected");
    socket = undefined;
    setTimeout(() => init(), 1000);
  });
}

document.addEventListener("pointermove", (event) => {
  socket?.send(
    JSON.stringify({
      position: {
        x: event.clientX / document.documentElement.clientWidth,
        y: event.clientY / document.documentElement.clientHeight,
      },
      message: undefined,
      userId: id,
    }),
  );
});

function register() {
  const username = prompt("Pick a username", id);
  if (!username) {
    return;
  }

  fetch(`${getProto()}://${baseUrl}/register`, {
    method: "POST",
    body: JSON.stringify({ username }),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json())
    .then(({ token }) => {
      localStorage.setItem("token", token);
      localStorage.setItem("username", username);
      location.reload();
    });
}

setInterval(() => {
  socket?.send(JSON.stringify({ userId: id }));
}, 250);

async function setImage() {
  const [fileHandle] = await window.showOpenFilePicker();
  const file = await fileHandle.getFile();

  const formData = new FormData();
  formData.append("image", file);
  formData.append("token", token ?? "");

  fetch(`${getProto()}://${baseUrl}/image`, {
    method: "POST",
    body: formData,
  })
    .then((res) => res.json())
    .then(({ url }) => {
      const img = document.createElement("img");
      img.src = url;
      document.getElementById("image-preview")?.appendChild(img);
    });
}

init();
document.getElementById("register")?.addEventListener("click", register);
document.getElementById("set-image")?.addEventListener("click", setImage);
