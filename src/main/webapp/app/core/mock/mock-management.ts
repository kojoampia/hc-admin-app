import { DEMO_SERVICES, db } from './mock-db';

/**
 * `/management/**` — the actuator surface JHipster's generated admin screens
 * read.
 *
 * These five screens (Health, Metrics, Configuration, Logs, and the profile
 * ribbon's info call) are stock generator output and were never edited. They
 * are also the only part of the console that does not go through `/api/`, so
 * without this they each render an error where a table should be.
 *
 * The payloads are not decoration. Where the console already knows something
 * — which services exist, which one is degraded, how many patients are on
 * file — these endpoints report *that*, so the admin Health screen and the
 * Platform health screen cannot disagree with each other.
 *
 * What is genuinely invented here is what an actuator measures about a JVM
 * that is not running: heap sizes, GC pauses, thread dumps. Those are marked
 * as such rather than dressed up.
 */

/** A stable pseudo-random so repeated loads do not jitter. Math.random is banned in seeds. */
const wobble = (seed: number, spread: number): number => {
  const x = Math.sin(seed) * 10000;
  return Math.round((x - Math.floor(x)) * spread);
};

// ---- info ---------------------------------------------------------------

const info = (): Record<string, unknown> => ({
  activeProfiles: ['dev', 'api-docs'],
  'display-ribbon-on-profiles': 'dev',
  build: {
    artifact: 'hc-admin',
    name: 'Abofonsa BridgeCare Admin Console',
    version: '0.0.1-SNAPSHOT',
  },
});

// ---- health -------------------------------------------------------------

/**
 * Health mirrors the platform-service catalogue rather than inventing its own
 * verdict: one degraded service in `platform-services` is one DOWN component
 * here, and the aggregate status follows.
 */
const health = (): Record<string, unknown> => {
  const services = db()['platform-services'];
  const degraded = services.filter(service => service.health !== 'HEALTHY');

  const components: Record<string, unknown> = {
    ping: { status: 'UP' },
    diskSpace: {
      status: 'UP',
      details: { total: 494_384_795_648, free: 216_476_729_344, threshold: 10_485_760, exists: true },
    },
    livenessState: { status: 'UP' },
    readinessState: { status: 'UP' },
  };

  // Every mapped service becomes a component, keyed by host.
  for (const service of services) {
    components[service.host] = {
      status: service.health === 'HEALTHY' ? 'UP' : 'DOWN',
      details: {
        port: service.port,
        plane: service.plane,
        responseMs: service.responseMs,
      },
    };
  }

  return { status: degraded.length > 0 ? 'DOWN' : 'UP', components };
};

// ---- metrics ------------------------------------------------------------

const percentiles = (base: number): Record<string, number> => ({
  '0.0': 0,
  '0.5': base * 0.6,
  '0.75': base * 0.8,
  '0.95': base * 1.4,
  '0.99': base * 1.9,
  '1.0': base * 2.4,
  max: base * 2.4,
  mean: base,
  count: 100,
  totalTime: base * 100,
});

/**
 * JVM, GC and process figures are the invented part of this file: there is no
 * JVM behind the console to measure. The endpoint-level numbers underneath
 * them are derived from the seeded collections, so `services` reports the
 * routes this app really calls.
 */
const metrics = (): Record<string, unknown> => {
  const data = db();
  const endpointCounts: Record<string, number> = {
    '/api/patients': data.patients.length * 9,
    '/api/professionals': data.professionals.length * 7,
    '/api/messages': data.messages.length * 11,
    '/api/tasks': data.tasks.length * 6,
    '/api/shift-assignments': data['shift-assignments'].length * 3,
    '/api/dashboard/metrics': 128,
  };

  const services: Record<string, unknown> = {};
  Object.entries(endpointCounts).forEach(([endpoint, count], index) => {
    services[endpoint] = {
      GET: { count, max: 0.09 + wobble(index + 1, 40) / 1000, mean: 0.012 + wobble(index + 2, 8) / 1000 },
    };
  });

  return {
    jvm: {
      'PS Old Gen': { committed: 178_257_920, max: 2_863_661_056, used: 96_402_664 },
      'PS Eden Space': { committed: 268_435_456, max: 1_060_896_768, used: 132_120_576 },
      Metaspace: { committed: 96_468_992, max: -1, used: 92_712_688 },
      'PS Survivor Space': { committed: 22_020_096, max: 22_020_096, used: 12_582_912 },
    },
    'http.server.requests': {
      all: { count: Object.values(endpointCounts).reduce((sum, count) => sum + count, 0) },
      percode: {
        '200': { count: 1284, max: 0.412, mean: 0.014 },
        '201': { count: 46, max: 0.221, mean: 0.019 },
        '204': { count: 31, max: 0.118, mean: 0.011 },
        '404': { count: 7, max: 0.052, mean: 0.006 },
      },
    },
    cache: {},
    databases: {},
    garbageCollector: {
      'jvm.gc.max.data.size': 2_863_661_056,
      'jvm.gc.pause': percentiles(0.021),
      'jvm.gc.memory.promoted': 41_385_040,
      'jvm.gc.memory.allocated': 1_207_959_552,
      classesLoaded: 14_882,
      'jvm.gc.live.data.size': 74_190_336,
      classesUnloaded: 12,
    },
    services,
    processMetrics: {
      'system.cpu.usage': 0.184,
      'system.cpu.count': 8,
      'system.load.average.1m': 1.42,
      'process.cpu.usage': 0.061,
      'process.files.max': 10_240,
      'process.files.open': 184,
      'process.start.time': 1_754_524_800_000,
      'process.uptime': 5_460_000,
    },
  };
};

// ---- thread dump --------------------------------------------------------

const THREAD_NAMES = [
  'http-nio-8080-exec-1',
  'http-nio-8080-exec-2',
  'http-nio-8080-exec-3',
  'scheduling-1',
  'mongo-cluster-monitor',
  'kafka-coordinator-heartbeat',
  'Reference Handler',
  'Finalizer',
];

const threadDump = (): Record<string, unknown> => ({
  threads: THREAD_NAMES.map((threadName, index) => ({
    threadName,
    threadId: index + 1,
    blockedTime: -1,
    blockedCount: wobble(index + 3, 4),
    waitedTime: -1,
    waitedCount: wobble(index + 5, 30),
    lockName: null,
    lockOwnerId: -1,
    lockOwnerName: null,
    daemon: true,
    inNative: false,
    suspended: false,
    threadState: index % 3 === 0 ? 'RUNNABLE' : index % 3 === 1 ? 'WAITING' : 'TIMED_WAITING',
    priority: 5,
    stackTrace: [
      {
        classLoaderName: null,
        moduleName: 'java.base',
        moduleVersion: '25',
        methodName: 'park',
        fileName: 'Unsafe.java',
        lineNumber: 371,
        nativeMethod: false,
        className: 'jdk.internal.misc.Unsafe',
      },
    ],
    lockedMonitors: [],
    lockedSynchronizers: [],
    lockInfo: null,
  })),
});

// ---- configuration ------------------------------------------------------

const configprops = (): Record<string, unknown> => ({
  contexts: {
    'hc-admin': {
      beans: {
        'abofonsa.console': {
          prefix: 'abofonsa.console',
          properties: {
            brand: 'Abofonsa BridgeCare',
            apiSource: 'in-browser mock (app/core/mock)',
            latencyMs: 120,
            roles: ['ROLE_ADMIN', 'ROLE_SUPERVISOR', 'ROLE_DESK'],
          },
        },
        'spring.web': {
          prefix: 'spring.web',
          properties: { localeResolver: 'ACCEPT_HEADER' },
        },
      },
    },
  },
});

const env = (): Record<string, unknown> => ({
  activeProfiles: ['dev'],
  propertySources: [
    {
      name: 'console',
      properties: {
        'abofonsa.console.brand': { value: 'Abofonsa BridgeCare' },
        'abofonsa.console.api': { value: 'in-browser mock — no backend is running', origin: 'app/core/mock/README.md' },
        'abofonsa.console.seed.patients': { value: String(db().patients.length) },
        'abofonsa.console.seed.professionals': { value: String(db().professionals.length) },
        'abofonsa.console.seed.services': { value: String(DEMO_SERVICES.length) },
      },
    },
    {
      name: 'systemProperties',
      properties: {
        'java.version': { value: '25' },
        'user.timezone': { value: 'GMT' },
      },
    },
  ],
});

// ---- loggers ------------------------------------------------------------

const LEVELS = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'OFF'];

/**
 * Logger levels are the one thing on the admin surface that is genuinely
 * writable, so they are held in module state rather than rebuilt per request
 * — otherwise the Logs screen would appear to accept a change and then
 * silently discard it on the next load.
 */
let loggerLevels: Record<string, string> = {};

const DEFAULT_LOGGERS: Record<string, string> = {
  ROOT: 'INFO',
  'care.abofonsa': 'DEBUG',
  'care.abofonsa.console': 'DEBUG',
  'care.abofonsa.console.roster': 'INFO',
  'care.abofonsa.console.messaging': 'INFO',
  'care.abofonsa.gateway': 'INFO',
  'org.springframework': 'WARN',
  'org.springframework.web': 'INFO',
  'org.mongodb.driver': 'WARN',
  'org.apache.kafka': 'WARN',
};

export const resetLoggers = (): void => {
  loggerLevels = { ...DEFAULT_LOGGERS };
};
resetLoggers();

const loggers = (): Record<string, unknown> => ({
  levels: LEVELS,
  loggers: Object.fromEntries(
    Object.entries(loggerLevels).map(([name, level]) => [name, { configuredLevel: level, effectiveLevel: level }]),
  ),
});

const setLoggerLevel = (name: string, configuredLevel: string | null): void => {
  // A null configured level means "inherit"; the effective level then comes
  // from ROOT, which is what the generated screen shows after a reset.
  loggerLevels[name] = configuredLevel ?? loggerLevels.ROOT;
};

// ---- routing ------------------------------------------------------------

/**
 * Answer a `/management/**` request, or return undefined so the caller can
 * fall through to its own not-found handling.
 */
export const handleManagement = (method: string, path: string, body: any): { status: number; body: unknown } | undefined => {
  if (method === 'POST' && path.startsWith('loggers/')) {
    setLoggerLevel(path.slice('loggers/'.length), (body?.configuredLevel as string | null) ?? null);
    return { status: 204, body: null };
  }

  if (method !== 'GET') {
    return undefined;
  }

  switch (path) {
    case 'info':
      return { status: 200, body: info() };
    case 'health':
      return { status: 200, body: health() };
    case 'jhimetrics':
      return { status: 200, body: metrics() };
    case 'threaddump':
      return { status: 200, body: threadDump() };
    case 'configprops':
      return { status: 200, body: configprops() };
    case 'env':
      return { status: 200, body: env() };
    case 'loggers':
      return { status: 200, body: loggers() };
    default:
      return undefined;
  }
};
