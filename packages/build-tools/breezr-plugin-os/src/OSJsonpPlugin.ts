import { Compiler, compilation } from 'webpack';
import { ConcatSource } from 'webpack-sources';

export interface OSJsonpWebpackPluginOption {
  injectVars?: string[];
  jsonpCall?: string;
  id: string;
  lite?: boolean;
  ignoreFilenames?: Array<string | RegExp>;
}

export class OSJsonpWebpackPlugin {
  option: OSJsonpWebpackPluginOption;
  constructor(option: OSJsonpWebpackPluginOption) {
    this.option = {
      ...option,
    };
  }

  apply(compiler: Compiler) {
    if (compiler.hooks) {
      compiler.hooks.compilation.tap(
        'OSJsonpPlugin', // <-- Set a meaningful name here for stacktraces
        // eslint-disable-next-line @typescript-eslint/no-shadow
        // @ts-ignore
        (_compilation) => {
          _compilation.hooks.afterOptimizeChunkAssets.tap('OSJsonpPlugin', (chunks) => {
            // @ts-ignore
            this.wrappChunks(compiler, _compilation, chunks);
          });
        },
      );
    } else {
      // eslint-disable-next-line @typescript-eslint/no-shadow
      // @ts-ignore
      compiler.plugin('compilation', (_compilation: any) => {
        // @ts-ignore
        compilation.plugin('after-optimize-chunk-assets', (chunks) => {
          this.wrappChunks(compiler, _compilation, chunks);
        });
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-shadow
  private wrappChunks(compiler: Compiler, compilation: compilation.Compilation, chunks: compilation.Chunk[]) {
    chunks.forEach((firstChunk) => {
      if (!firstChunk) {
        return;
      }
      const entryFile = firstChunk.files.find((file) => file.endsWith('.js'));
      if (!entryFile) {
        return chunks;
      }

      if (
        this.option.ignoreFilenames?.find(
          (strOrReg) => {
            if (typeof strOrReg === 'string') return strOrReg === entryFile;
            if (strOrReg instanceof RegExp) return strOrReg.test(entryFile);
            return false;
          },
        )
      ) {
        return;
      }

      const entryAsset = compilation.assets[entryFile];
      if (!entryAsset) {
        return;
      }

      const [prefix, suffix] = this._wrapCodeWithOSJsonp(this.option.id || this.getId(compiler));

      compilation.assets[entryFile] = new ConcatSource(prefix, entryAsset, suffix);
    });
  }

  private getId(compiler: Compiler): string {
    const { output } = compiler.options;
    if (!output) {
      return '';
    }
    const { library } = output;
    if (typeof library === 'string') {
      return library;
    }
    if (typeof library === 'object') {
      // @ts-ignore
      return library.name;
    }
    throw new Error('library for os jsonp plugin should be string');
  }

  private _wrapCodeWithOSJsonp(id: string) {
    const injectVars = this.option.lite ? ['history', 'location'] : ['window', 'location', 'history', 'document', ...(this.option.injectVars || [])];
    const jsonpCall = this.option.jsonpCall || 'window.__CONSOLE_OS_GLOBAL_HOOK__';

    return [`
if (!window.__CONSOLE_OS_GLOBAL_HOOK__){window.__CONSOLE_OS_GLOBAL_VARS_={};window.__CONSOLE_OS_GLOBAL_HOOK__ = function(id, resolver) {resolver(undefined, undefined, undefined, {${injectVars.map((item) => `${item}: ${item}`).join(',')}})};window.__CONSOLE_OS_GLOBAL_HOOK__.standalone = true}
${jsonpCall}(${JSON.stringify(id)}, function(require, module, exports, context){ ${injectVars.map((item) => `var ${item} = context.${item}`).join(';')};with(window.__CONSOLE_OS_GLOBAL_VARS_) { \n
`, '\n}}, document.currentScript)'];
  }
}
