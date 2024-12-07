
import type { ServerWebSocket } from "bun";
import { Elysia, t, type TSchema } from "elysia";
import type { TypeCheck } from "elysia/dist/type-system";
import type { ElysiaWS } from "elysia/dist/ws";

type User = {
  id: string;
  ws: ElysiaWS<
    ServerWebSocket<{
      validator?: TypeCheck<TSchema>;
    }>,
    any,
    any
  >
};

type Room = {
  id: number;
  users: User[];
};

const rooms: Room[] = [];

// 發送 Room 內的訊息
function sendMessage(room: Room, userId: string, text: string) {
  // print users
  console.log("users:", room.users.map((u) => u.id).join(", "));
  for (const user of room.users) {
    user.ws.send({
      type: "message",
      from: userId,
      text,
    });
  }
}

const app = new Elysia()
  .get("/", () => "Hello Elysia")
  .ws("/room/:id", {
    params: t.Object({
        id: t.String(),
    }),
    body: t.Object({
        text: t.String(),
    }),
    open(ws) {
      const id = this.params.id;

      let room = rooms.find((r) => r.id === id);
      if (!room) {
        room = { id, users: [] };
        rooms.push(room);
      }

      const user = { id: ws.id, ws };

  const existUser = room.users.find((u) => u.id === ws.id);

      if (existUser) {
        existUser.ws = ws;
      } else {
        room.users.push(user);
        sendMessage(room, ws.id, "join");
      }
      console.log("open", ws.id);
    },
    message(ws, { text }) {
      const id = this.params.id;
      const room = rooms.find((r) => r.id === id);

      if (!room) {
        return { msg: "room not found" };
      }
      
      sendMessage(room, ws.id, text);

      console.log("message", ws.id, text);

      return { msg: "ok" };
    },
    close(ws) {
      const id = this.params.id;
      const room = rooms.find((r) => r.id === id);

      if (!room) {
        return;
      }

      const index = room.users.findIndex((u) => u.id === ws.id);
      if (index !== -1) {
        room.users.splice(index, 1);
        sendMessage(room, ws.id, "leave");
      }

      if (room.users.length === 0) {
        const index = rooms.findIndex((r) => r.id === id);
        rooms.splice(index, 1);
      }

      console.log("close", ws.id);
    }
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
