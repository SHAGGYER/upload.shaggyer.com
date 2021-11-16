import { Kernel } from "kernel/Kernel";
import { TYPES } from "./types.inversify";
import { myContainer } from "./inversify.config";

const kernel = myContainer.get<Kernel>(TYPES.Kernel);
kernel.connectDb();
kernel.run();
