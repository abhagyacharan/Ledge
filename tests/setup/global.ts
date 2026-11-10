import { prepareDatabase } from "./database";

/** Creates the `ledge_test` database if needed and applies all migrations to it. */
export default async function setup() {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error("TEST_DATABASE_URL is not set");
  await prepareDatabase(testUrl, "_test");
}
