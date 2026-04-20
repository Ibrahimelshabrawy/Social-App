import {EventEmitter} from "node:events";
import {EventEnum} from "../../enum/event.enum";

export const eventEmitter = new EventEmitter();

eventEmitter.on(EventEnum.confirmEmail, async (fn) => {
  await fn();
});
