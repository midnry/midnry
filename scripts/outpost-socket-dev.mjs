/** Development uses the same authenticated hooks as Nitro's production route. */
import nodeAdapter from "crossws/adapters/node";
export function outpostSocketPlugin() {
  return {
    name: "midnry:outpost-socket",
    apply: "serve",
    configureServer(server) {
      let hooks;
      const peerHooks = new WeakMap();
      const load = async () =>
        (hooks ||= (await server.ssrLoadModule("/src/games/outpost/realtime.server.ts"))
          .socketHooks);
      const adapter = nodeAdapter({
        hooks: {
          upgrade: async (request) => (await load()).upgrade?.(request),
          open: async (peer) => {
            const bound = await load();
            peerHooks.set(peer, bound);
            bound.open?.(peer);
          },
          message: async (peer, message) => peerHooks.get(peer)?.message?.(peer, message),
          close: async (peer, event) => peerHooks.get(peer)?.close?.(peer, event),
        },
        serverOptions: { maxPayload: 16384 },
      });
      const upgrade = (req, socket, head) => {
        if (req.url?.split("?")[0] === "/api/games/outpost/socket")
          void adapter.handleUpgrade(req, socket, head);
      };
      const stopRooms = () => {
        for (const promise of globalThis.__outpostLiveRooms?.values() || [])
          void promise.then((room) => room.stop()).catch(() => {});
      };
      const changed = (file) => {
        if (!/\/src\/games\/outpost\/.*\.server\.ts$/.test(file)) return;
        hooks = null;
        stopRooms();
        adapter.closeAll(1012, "Development server updated");
      };
      server.watcher.on("change", changed);
      server.httpServer?.on("upgrade", upgrade);
      server.httpServer?.once("close", () => {
        server.watcher.off("change", changed);
        server.httpServer.off("upgrade", upgrade);
        stopRooms();
        adapter.closeAll();
      });
    },
  };
}
