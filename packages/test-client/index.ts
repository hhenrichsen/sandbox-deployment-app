const id = Math.round(Math.random() * 100);

const init = () => {
  const socket = new WebSocket("ws://localhost:3000/ws", {
    headers: {
      "x-user-id": `Bot ${id}`,
    },
  });
  let closed = false;

  socket.addEventListener("open", () => {
    console.log("connected");
  });

  socket.addEventListener("message", (event) => {
    console.log(JSON.parse(event.data));
  });

  socket.addEventListener("close", () => {
    console.log("disconnected");
    closed = true;
  });

  const ready = new Promise((resolve, reject) => {
    const h = setInterval(() => {
      if (closed) {
        reject();
      }
      if (socket.readyState === WebSocket.OPEN) {
        resolve(socket);
        clearInterval(h);
      }
    }, 100);
  });

  return { socket, ready };
};

let { socket, ready } = init();

setInterval(async () => {
  try {
    if (!socket.readyState !== WebSocket.OPEN) {
      await ready;
    }
  } catch (e) {
    let { socket: newSocket, ready: newReady } = init();
    socket = newSocket;
    ready = newReady;
    return;
  }

  socket.send(
    JSON.stringify({
      position: { x: Math.random(), y: Math.random() },
      message: "Hello!",
      userId: `Bot ${id}`,
    }),
  );
}, 1000);
