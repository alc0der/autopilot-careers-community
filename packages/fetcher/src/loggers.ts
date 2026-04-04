import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { tmpdir } from "os";
import * as fs from "fs";
import * as path from "path";

const customFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
);

// Try to determine a writable logs directory
function getLogsDir(): string {
  const preferredDirs = [
    "./logs", // Try current directory first
    path.join(tmpdir(), "linkedin-fetcher-logs"), // Fall back to system temp
  ];

  for (const dir of preferredDirs) {
    try {
      // Test if directory is writable
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Test write access by checking if we can write to the directory
      const testFile = path.join(dir, ".write-test");
      fs.writeFileSync(testFile, "test", { flag: "w" });
      fs.unlinkSync(testFile);
      return dir;
    } catch {
      // This directory is not writable, try the next one
      continue;
    }
  }

  // If we get here, no writable directory was found
  // Return null to indicate logging should be skipped
  return "";
}

export const fileTransport = (name: string) => {
  const logsDir = getLogsDir();

  if (!logsDir) {
    // Return null transport if no writable directory available
    return null;
  }

  return new DailyRotateFile({
    dirname: logsDir,
    extension: ".jsonl",
    json: true,
    filename: name,
    level: "verbose",
    format: customFormat,
  });
};

export const fileLogger = (name: string) => {
  const transport = fileTransport(name);
  const transports: winston.transport[] = [];

  if (transport) {
    transports.push(transport);
  }

  return winston.createLogger({
    level: "debug",
    format: winston.format.simple(),
    transports: transports.length > 0 ? transports : [new winston.transports.Console()],
  });
};

export const logger = winston.createLogger({
  level: "debug",
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});
