import {Server} from "socket.io";
import {Server as HttpServer} from "node:http";
import {checkTokenAndVerify} from "../../common/utils/authentication.utils";
import redisService from "../../common/utils/services/redis.service";
import chatGateway from "../chat/real-time/chat.gateway";

class SocketGateway {
  constructor() {}

  InitIo = async (httpServer: HttpServer) => {
    const io = new Server(httpServer, {
      cors: {
        origin: "*",
      },
    });

    io.use(async (socket, next) => {
      try {
        const {user} = await checkTokenAndVerify(
          socket.handshake.auth.authorization ||
            socket.handshake.headers.authorization,
        );
        socket.data.user = user;
        next();
      } catch (error: any) {
        next(error);
      }
    });

    io.on("connection", async (socket) => {
      redisService.addSocket({
        userId: socket.data.user._id,
        SocketToken: socket.id,
      });

      await chatGateway.registerEvent(socket, io);

      socket.on("disconnect", async () => {
        await redisService.removeSocket({
          userId: socket.data.user._id,
          SocketToken: socket.id,
        });
      });
    });
  };
}

export default new SocketGateway();
