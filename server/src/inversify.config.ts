import { Container } from "inversify";
import { Server } from "kernel/Server";
import { Kernel } from "kernel/Kernel";
import { Db } from "kernel/Db";

import { TYPES } from "./types.inversify";
import { AppService } from "services/AppService";

const myContainer = new Container();
myContainer.bind<Db>(TYPES.Db).to(Db);
myContainer.bind<Server>(TYPES.Server).to(Server);
myContainer.bind<Kernel>(TYPES.Kernel).to(Kernel);
myContainer.bind<AppService>(TYPES.AppService).to(AppService);

export { myContainer };
