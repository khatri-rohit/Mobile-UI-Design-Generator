/* eslint-disable @typescript-eslint/no-explicit-any */
class LOGGER {
  static log(...args: any[]) {
    console.log("[Log]", ...args);
  }

  static error(...args: any[]) {
    console.error("[Error]", ...args);
  }

  static warn(...args: any[]) {
    console.warn("[Warn]", ...args);
  }

  static info(...args: any[]) {
    console.info("[Info]", ...args);
  }

  static debug(...args: any[]) {
    console.debug("[Debug]", ...args);
  }
}

const logger = LOGGER;

export default logger;
