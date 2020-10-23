import { Compiler, compilation } from 'webpack';
import { ConcatSource } from 'webpack-sources';

export interface OSJsonpWebpackPluginOption {
  injectVars?: string[];
  jsonpCall?: string;
}

export class OSJsonpWebpackPlugin {
  public option: OSJsonpWebpackPluginOption;
  public constructor(option: OSJsonpWebpackPluginOption) {
    this.option = {
      ...option,
    };
  }

  public apply(compiler: Compiler) {
    if (compiler.hooks) {
      compiler.hooks.compilation.tap(
        'OSJsonpPlugin', // <-- Set a meaningful name here for stacktraces
        (compilation) => {
          compilation.hooks.afterOptimizeChunkAssets.tap('OSJsonpPlugin', (chunks) => {
            this.wrappChunks(compiler, compilation, chunks)
          });
        }
      );
    } else {
      compiler.plugin('compilation', (compilation) => {
        // @ts-ignore
        compilation.plugin('after-optimize-chunk-assets', (chunks) => {
          this.wrappChunks(compiler, compilation, chunks)
        });
      });
    }
  }

  private wrappChunks(compiler: Compiler,compilation: compilation.Compilation, chunks: compilation.Chunk[]) {
    chunks.forEach(firstChunk => {
      if (!firstChunk) {
        return;
      }
      const entryFile = firstChunk.files.find((file) => file.endsWith('.js'));
      if (!entryFile) {
        return chunks;
      }

      const entryAsset = compilation.assets[entryFile];
      if (!entryAsset) {
        return;
      }

      const [prefix, suffix] = this._wrapCodeWithOSJsonp(this.getId(compiler));

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
    throw new Error('library for os jsonp plugin should be string');
  }

  private _wrapCodeWithOSJsonp(id: string) {
    const injectVars = ['window', 'location', 'history', 'document', ...(this.option.injectVars || [])];
    const jsonpCall = this.option.jsonpCall || 'window.__CONSOLE_OS_GLOBAL_HOOK__';

    return [`
if (!window.__CONSOLE_OS_GLOBAL_HOOK__){window.__CONSOLE_OS_GLOBAL_VARS_={};window.__CONSOLE_OS_GLOBAL_HOOK__ = function(id, resolver) {resolver(undefined, undefined, undefined, {${injectVars.map((item) => `${item}: ${item}`).join(',')}})};}
${jsonpCall}(${JSON.stringify(id)}, function(require, module, exports, context){ ${injectVars.map(item => `var ${item} = context.${item}`).join(';')};with(window.__CONSOLE_OS_GLOBAL_VARS_) { \n
`, '\n}})']
  
  }
}