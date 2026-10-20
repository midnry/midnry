/** Ad-hoc sign the finished macOS app. Apple Silicon refuses to run unsigned
 * apps; until there is an Apple Developer ID (needed for notarization and the
 * Steam Mac build) an ad-hoc signature lets testers open it with
 * right-click → Open. Only the merged universal app is signed: the per-arch
 * halves must stay identical for the merge. */
const { execFileSync } = require("node:child_process");
const path = require("node:path");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;
  if (path.basename(context.appOutDir) !== "mac-universal") return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", app], { stdio: "inherit" });
};
