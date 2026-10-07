import type * as Phaser from "phaser";
import { bus } from "../systems/store";

/** One loading lifecycle for first entry, chapter changes, and room changes. */
export function startSceneLoading(scene: Phaser.Scene, title: string) {
  bus.emit("sceneLoading", { title, progress: 0 });
  const progress = (value: number) => bus.emit("sceneLoading", { title, progress: value });
  const error = () => bus.emit("sceneLoadError", null);
  const cleanup = () => {
    scene.load.off("progress", progress);
    scene.load.off("loaderror", error);
    scene.load.off("complete", cleanup);
    scene.events.off("shutdown", cleanup);
  };
  scene.load.on("progress", progress);
  scene.load.on("loaderror", error);
  scene.load.once("complete", cleanup);
  scene.events.once("shutdown", cleanup);
}

/** Keep the overlay until the finished scene has actually rendered a frame. */
export function finishSceneLoading(scene: Phaser.Scene) {
  const ready = () => {
    scene.events.off("shutdown", cancel);
    bus.emit("sceneReady", null);
  };
  const cancel = () => scene.game.events.off("postrender", ready);
  scene.game.events.once("postrender", ready);
  scene.events.once("shutdown", cancel);
}
