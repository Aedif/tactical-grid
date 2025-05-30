const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env) => {
  return {
    entry: './tactical-grid.js',
    output: {
      filename: 'tactical-grid.js',
      path: path.resolve(__dirname, 'bundle'),
      publicPath: 'modules/aedifs-tactical-grid/bundle/',
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            keep_classnames: true,
            keep_fnames: false,
          },
        }),
      ],
    },
    mode: 'production',
    watch: env?.mode === 'watch' ? true : false,
    watchOptions: {
      ignored: ['/node_modules/'],
    },
    devtool: 'source-map',
  };
};
