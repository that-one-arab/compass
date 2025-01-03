import path from "path";
import moduleAlias from "module-alias";
moduleAlias.addAliases({
  "@backend": `${__dirname}`,
  "@core": `${path.resolve(__dirname, "../../core/src")}`,
});
import dotenv from "dotenv";
const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  throw dotenvResult.error;
}
import * as http from "http";
import { Logger } from "@core/logger/winston.logger";

import { ENV } from "./common/constants/env.constants";
import { initExpressServer } from "./servers/express/express.server";
import mongoService from "./common/services/mongo.service";
import { webSocketServer } from "./servers/websocket/websocket.server";

const logger = Logger("app:root");
mongoService;

const app = initExpressServer();
const httpServer: http.Server = http.createServer(app);
webSocketServer.init(httpServer);

const port = ENV.PORT;
httpServer.listen(port, () => {
  logger.info(`Server running on port: ${port}`);
});
