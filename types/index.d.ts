export default log;
export type LogLevel = "debug" | "info" | "warn" | "error" | "none";
export type LogOptions = {
    level?: LogLevel;
    pretty?: boolean;
};
export type Logger = {
    context: Record<string, any>;
    child: (ctx: Record<string, any>) => Logger;
    debug: (msg: string | Error, data?: Record<string, any>) => void;
    info: (msg: string | Error, data?: Record<string, any>) => void;
    warn: (msg: string | Error, data?: Record<string, any>) => void;
    error: (msg: string | Error, data?: Record<string, any>) => void;
};
/** @type {Logger & { configure: (opts: LogOptions) => void }} */
declare const log: Logger & {
    configure: (opts: LogOptions) => void;
};
