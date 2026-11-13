import { decoStreamHandler } from "@decocms/tanstack/stream";
import { createStartHandler } from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";

export default createServerEntry({ fetch: createStartHandler(decoStreamHandler) });
