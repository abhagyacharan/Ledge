import "server-only";
import pkg from "../../package.json";

/** Ledge's version, from package.json, for Settings › About. Server only, so the page never
 * ships the whole package file. */
export const APP_VERSION: string = pkg.version;
