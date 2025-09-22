const ts = require('typescript');

const defaultCompilerOptions = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020,
  esModuleInterop: true,
  emitDecoratorMetadata: true,
  experimentalDecorators: true,
  sourceMap: true,
};

module.exports = {
  process(src, filename) {
    const { outputText, sourceMapText } = ts.transpileModule(src, {
      compilerOptions: defaultCompilerOptions,
      fileName: filename,
    });

    return {
      code: outputText,
      map: sourceMapText ?? undefined,
    };
  },
};
