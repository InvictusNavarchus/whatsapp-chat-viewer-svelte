import log from 'loglevel';

const emojiPrefix = {
  trace: '🔍 [TRACE]',
  debug: '🐛 [DEBUG]',
  info: 'ℹ️ [INFO]',
  warn: '⚠️ [WARN]',
  error: '❌ [ERROR]',
};

const originalFactory = log.methodFactory;
log.methodFactory = function (methodName, logLevel, loggerName) {
  const rawMethod = originalFactory(methodName, logLevel, loggerName);
  return function (...args) {
    rawMethod(`${emojiPrefix[methodName] || ''}`, ...args);
  };
};
log.setLevel(log.getLevel());

export default log; 